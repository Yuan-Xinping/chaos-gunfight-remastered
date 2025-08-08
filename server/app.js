const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const cors = require('cors'); 
const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('环境变量已加载。JWT_SECRET:', process.env.JWT_SECRET ? '已设置' : '未设置');
console.log('PORT:', process.env.PORT);

const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const logger = require('./config/logger');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

console.log('Express, HTTP server, Socket.IO 实例已创建。');

// 中间件
app.use(cors());
app.use(express.json()); // 解析 JSON 格式的请求体

// API 路由
app.use('/api', authRoutes);

// Socket.IO 连接认证 
io.use((socket, next) => {
    const token = socket.handshake.auth.token; // 从握手信息中获取 token
    if (!token) {
        logger.warn('Socket.IO 连接尝试：缺少 Token');
        return next(new Error('未授权：缺少 Token'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // 将用户信息附加到 socket 对象上
        logger.info(`Socket.IO 用户连接成功: ${decoded.username} (ID: ${decoded.id})`);
        next();
    } catch (error) {
        logger.warn(`Socket.IO Token 验证失败: ${error.message}`);
        next(new Error('未授权：Token 无效或已过期'));
    }
});

// Socket.IO 事件处理
io.on('connection', (socket) => {
    logger.info(`用户 ${socket.user.username} (ID: ${socket.user.id}) 连接到 Socket.IO`);

    // 实现一个简单的 ping-pong 测试
    socket.on('ping', () => {
        logger.debug(`收到 ${socket.user.username} 的 ping`);
        socket.emit('pong');
    });

    socket.on('disconnect', (reason) => {
        logger.info(`用户 ${socket.user.username} (ID: ${socket.user.id}) 断开连接. 原因: ${reason}`);
    });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    logger.info(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`🚀 (通过 console.log) 服务器运行在 http://localhost:${PORT}`); 
}).on('error', (err) => {
    console.error('❌ 服务器启动失败:', err.message); // 捕获服务器启动错误
    process.exit(1);
});

console.log('--- app.js 结束执行  ---');
