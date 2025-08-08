const express = require('express');
const http = require('http'); // Node.js 内置的 http 模块
const { Server } = require('socket.io'); // Socket.IO 服务器
const cors = require('cors'); // 处理跨域请求
const jwt = require('jsonwebtoken'); // 用于 Socket.IO 认证
require('dotenv').config(); // 加载 .env 文件中的环境变量

const authRoutes = require('./routes/authRoutes'); // 认证相关的API路由
const authMiddleware = require('./middleware/authMiddleware'); // 认证中间件 (虽然这里没直接用，但保留引入)
const logger = require('./config/logger'); // 日志系统
const roomManager = require('./managers/roomManager'); // 引入房间管理器

const app = express();
const server = http.createServer(app); // 创建 HTTP 服务器，用于 Express 和 Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"] // 允许的 HTTP 方法
    }
});

// Express 中间件
app.use(cors()); // 启用 CORS
app.use(express.json()); // 解析 JSON 格式的请求体

// Express API 路由
app.use('/api', authRoutes); // 将认证相关的路由挂载到 /api 路径下

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        logger.warn(`Socket.IO 连接尝试 (ID: ${socket.id})：缺少 Token`);
        return next(new Error('未授权：缺少 Token'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        logger.debug('Decoded JWT payload:', decoded); 
        
        if (!decoded.id || !decoded.username || !decoded.accountId) {
            logger.error(`JWT payload 缺少必要的用户信息 (ID: ${socket.id}):`, decoded);
            return next(new Error('未授权：Token 信息不完整'));
        }

        socket.user = decoded;
        logger.info(`Socket.IO 用户连接成功: ${decoded.username} (ID: ${decoded.id}, AccountID: ${decoded.accountId}, SocketID: ${socket.id})`);
        next();
    } catch (error) {
        logger.warn(`Socket.IO Token 验证失败 (ID: ${socket.id}): ${error.message}`);
        next(new Error('未授权：Token 无效或已过期'));
    }
});

const onlineUsers = new Map(); 

io.on('connection', (socket) => {
    const user = socket.user; 
    logger.debug('User object available in socket.on connection:', user); 

    // 记录用户在线状态，并初始化其房间ID为 null
    onlineUsers.set(socket.id, {
        userId: user.id,
        username: user.username,
        accountId: user.accountId,
        currentRoomId: null
    });

    // 1. 大厅功能：请求房间列表
    socket.on('getRooms', () => {
        // 当客户端请求时，发送当前的房间列表
        socket.emit('roomListUpdate', roomManager.getRoomsList());
        logger.debug(`用户 ${user.username} 请求房间列表。`);
    });

    // 2. 大厅功能：创建房间
    socket.on('createRoom', (roomName) => {
        // 验证房间名
        if (!roomName || roomName.trim() === '') {
            socket.emit('roomError', '房间名不能为空。');
            logger.warn(`用户 ${user.username} 尝试创建空房间名。`);
            return;
        }
        // 检查用户是否已在其他房间
        if (onlineUsers.get(socket.id).currentRoomId !== null) {
            socket.emit('roomError', '您已在其他房间中，请先离开。');
            logger.warn(`用户 ${user.username} 尝试创建房间但已在房间 ${onlineUsers.get(socket.id).currentRoomId} 中。`);
            return;
        }

        // 创建新房间
        const newRoom = roomManager.createRoom(roomName, socket.id, user);
        socket.join(`room-${newRoom.id}`);
        onlineUsers.get(socket.id).currentRoomId = newRoom.id;

        io.emit('roomListUpdate', roomManager.getRoomsList());
        socket.emit('roomCreated', newRoom.getPublicData());
        
        // 向房间内所有玩家广播有新玩家加入
        const broadcastData = {
            roomData: newRoom.getPublicData(),
            joinedPlayerUsername: user.username 
        };
        logger.debug('Broadcasting playerJoinedRoom (createRoom):', broadcastData); 
        io.to(`room-${newRoom.id}`).emit('playerJoinedRoom', broadcastData);
        logger.info(`用户 ${user.username} 成功创建并加入了房间: ${newRoom.name} (ID: ${newRoom.id})`);
    });

    // 3. 大厅功能：加入房间
    socket.on('joinRoom', (roomId) => {
        // 检查用户是否已在其他房间
        if (onlineUsers.get(socket.id).currentRoomId !== null) {
            socket.emit('roomError', '您已在其他房间中，请先离开。');
            logger.warn(`用户 ${user.username} 尝试加入房间 ${roomId} 但已在房间 ${onlineUsers.get(socket.id).currentRoomId} 中。`);
            return;
        }

        const room = roomManager.getRoomById(roomId);
        if (!room) {
            socket.emit('roomError', '房间不存在或已被销毁。');
            logger.warn(`用户 ${user.username} 尝试加入不存在的房间 ${roomId}。`);
            return;
        }
        if (room.players.size >= room.maxPlayers) {
            socket.emit('roomError', '房间已满，无法加入。');
            logger.warn(`用户 ${user.username} 尝试加入已满的房间 ${roomId}。`);
            return;
        }
        if (room.status === roomManager.ROOM_STATUS.IN_GAME) {
            socket.emit('roomError', '游戏已开始，无法加入。');
            logger.warn(`用户 ${user.username} 尝试加入已开始游戏的房间 ${roomId}。`);
            return;
        }

        // 尝试将玩家添加到房间
        const playerAdded = room.addPlayer(socket.id, user);
        if (playerAdded) {
            socket.join(`room-${room.id}`); 
            onlineUsers.get(socket.id).currentRoomId = room.id; 

            io.emit('roomListUpdate', roomManager.getRoomsList());
            socket.emit('roomJoined', room.getPublicData());

            const broadcastData = {
                roomData: room.getPublicData(),
                joinedPlayerUsername: user.username // 确保这里 user.username 是正确的
            };
            logger.debug('Broadcasting playerJoinedRoom (joinRoom):', broadcastData); 
            io.to(`room-${room.id}`).emit('playerJoinedRoom', broadcastData);
            logger.info(`用户 ${user.username} 成功加入了房间: ${room.name} (ID: ${room.id})`);
        } else {
            socket.emit('roomError', '加入房间失败，请重试。');
            logger.error(`用户 ${user.username} 加入房间 ${roomId} 失败 (roomManager.addPlayer 返回 false)。`);
        }
    });

    // 4. 房间内功能：离开房间
    socket.on('leaveRoom', () => {
        const userInfo = onlineUsers.get(socket.id);
        if (!userInfo || userInfo.currentRoomId === null) {
            socket.emit('roomError', '您不在任何房间中。');
            logger.warn(`用户 ${user.username} 尝试离开房间但不在任何房间中。`);
            return;
        }

        const roomId = userInfo.currentRoomId;
        const room = roomManager.getRoomById(roomId);

        if (room) {
            room.removePlayer(socket.id); 
            socket.leave(`room-${roomId}`); 
            userInfo.currentRoomId = null; 

            // 通知房间内其他玩家有人离开
            const broadcastData = {
                roomData: room.getPublicData(),
                leftPlayerUsername: userInfo.username 
            };
            logger.debug('Broadcasting playerLeftRoom (leaveRoom):', broadcastData);
            io.to(`room-${roomId}`).emit('playerLeftRoom', broadcastData);

            // 如果房间空了，销毁房间
            if (room.isEmpty()) {
                roomManager.deleteRoom(roomId);
                logger.info(`空房间 ${roomId} ("${room.name}") 已被销毁。`);
            }
            // 广播房间列表更新给所有在大厅的客户端
            io.emit('roomListUpdate', roomManager.getRoomsList());
            socket.emit('roomLeft', { message: '您已成功离开房间。' });
            logger.info(`用户 ${user.username} 成功离开了房间: ${room.name} (ID: ${room.id})`);
        } else {
            // 如果房间不存在了，也清理用户状态
            userInfo.currentRoomId = null;
            socket.emit('roomError', '房间已不存在，已自动清理您的房间状态。');
            logger.warn(`用户 ${user.username} 尝试离开一个不存在的房间 ${roomId}，已清理其状态。`);
        }
    });

    // 5. 断开连接处理
    socket.on('disconnect', (reason) => {
        const userInfo = onlineUsers.get(socket.id);
        if (userInfo) {
            logger.info(`用户 ${userInfo.username} (AccountID: ${userInfo.accountId}, SocketID: ${socket.id}) 断开连接. 原因: ${reason}`);

            // 如果用户在房间里，也要处理离开房间的逻辑
            if (userInfo.currentRoomId !== null) {
                const roomId = userInfo.currentRoomId;
                const room = roomManager.getRoomById(roomId);
                if (room) {
                    room.removePlayer(socket.id);
                    // 通知房间内其他玩家有人离开
                    const broadcastData = {
                        roomData: room.getPublicData(),
                        leftPlayerUsername: userInfo.username
                    };
                    logger.debug('Broadcasting playerLeftRoom (disconnect):', broadcastData);
                    io.to(`room-${roomId}`).emit('playerLeftRoom', broadcastData);

                    if (room.isEmpty()) {
                        roomManager.deleteRoom(roomId);
                        logger.info(`空房间 ${roomId} ("${room.name}") 已被销毁 (因玩家断开连接)。`);
                    }
                }
                // 广播房间列表更新给所有在大厅的客户端
                io.emit('roomListUpdate', roomManager.getRoomsList());
            }
            onlineUsers.delete(socket.id); // 从在线用户列表中移除
        }
    });

    // 简单的 ping-pong 测试 (保留，用于连接健康检查)
    socket.on('ping', () => {
        logger.debug(`收到 ${user.username} 的 ping`);
        socket.emit('pong');
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`🚀 服务器运行在 http://localhost:${PORT}`);
});
