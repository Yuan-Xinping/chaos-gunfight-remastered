const logger = require('../config/logger');

const rooms = new Map();
let nextRoomId = 1; 

// 房间状态枚举，方便管理和判断
const ROOM_STATUS = {
    WAITING: 'waiting',  // 等待玩家加入
    IN_GAME: 'in_game',  // 游戏进行中
    FULL: 'full'         // 房间已满，但游戏可能未开始
};

/**
 * GameRoom 类：表示一个游戏房间的实例
 */
class GameRoom {
    constructor(id, name, creatorSocketId, creatorUser) {
        this.id = id;
        this.name = name;
        this.maxPlayers = 4; // 固定4人房间
        // 存储房间内的玩家，使用 Map<socketId, { userId, username, accountId, socketId }>
        // 方便快速查找和删除玩家
        this.players = new Map();
        this.status = ROOM_STATUS.WAITING;
        this.creatorSocketId = creatorSocketId; // 记录创建者的 socket ID
        this.addPlayer(creatorSocketId, creatorUser); // 创建房间时自动加入创建者
        this.gameInstance = null; // 预留给实际的游戏逻辑实例（阶段三实现）
        logger.info(`房间 "${this.name}" (ID: ${this.id}) 创建成功，创建者: ${creatorUser.username} (SocketID: ${creatorSocketId})`);
    }

    /**
     * 向房间添加一个玩家
     * @param {string} socketId - 玩家的 Socket.IO ID
     * @param {object} user - 玩家的用户信息 (从 JWT 解码而来：id, username, accountId)
     * @returns {boolean} 是否成功添加
     */
    addPlayer(socketId, user) {
        if (this.players.size >= this.maxPlayers) {
            logger.warn(`房间 ${this.id} 已满，无法添加玩家 ${user.username}`);
            return false;
        }
        if (this.status === ROOM_STATUS.IN_GAME) {
            logger.warn(`房间 ${this.id} 游戏已开始，无法添加玩家 ${user.username}`);
            return false;
        }
        if (this.players.has(socketId)) {
            logger.warn(`玩家 ${user.username} (SocketID: ${socketId}) 已经在此房间 ${this.id} 中。`);
            return false; // 玩家已在房间内
        }

        this.players.set(socketId, {
            userId: user.id,
            username: user.username,
            accountId: user.accountId,
            socketId: socketId
        });
        logger.info(`玩家 ${user.username} (SocketID: ${socketId}) 加入房间 ${this.id}. 当前人数: ${this.players.size}`);

        // 如果房间人数达到上限，更新状态为 FULL
        if (this.players.size === this.maxPlayers) {
            this.status = ROOM_STATUS.FULL;
            logger.info(`房间 ${this.id} 已满。`);
        }
        return true;
    }

    /**
     * 从房间移除一个玩家
     * @param {string} socketId - 玩家的 Socket.IO ID
     * @returns {boolean} 是否成功移除
     */
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
            logger.info(`玩家 ${player.username} (SocketID: ${socketId}) 离开房间 ${this.id}. 当前人数: ${this.players.size}`);
            // 如果房间人数不满且之前是满的，状态变回等待
            if (this.players.size < this.maxPlayers && this.status === ROOM_STATUS.FULL) {
                this.status = ROOM_STATUS.WAITING;
            }
            return true;
        }
        return false;
    }

    /**
     * 获取房间的公开数据，用于发送给客户端显示
     * @returns {object} 房间的公共信息
     */
    getPublicData() {
        return {
            id: this.id,
            name: this.name,
            maxPlayers: this.maxPlayers,
            currentPlayers: this.players.size,
            playerNames: Array.from(this.players.values()).map(p => p.username), // 只返回玩家昵称列表
            status: this.status
        };
    }

    /**
     * 检查房间是否为空
     * @returns {boolean} 房间是否没有任何玩家
     */
    isEmpty() {
        return this.players.size === 0;
    }
}

/**
 * 获取所有房间的公开列表
 * @returns {Array<object>} 房间列表数组
 */
const getRoomsList = () => {
    return Array.from(rooms.values()).map(room => room.getPublicData());
};

/**
 * 创建一个新房间
 * @param {string} roomName - 房间名称
 * @param {string} creatorSocketId - 创建者的 Socket.IO ID
 * @param {object} creatorUser - 创建者的用户信息
 * @returns {GameRoom} 新创建的房间实例
 */
const createRoom = (roomName, creatorSocketId, creatorUser) => {
    const roomId = nextRoomId++; // 生成唯一的房间ID
    const newRoom = new GameRoom(roomId, roomName, creatorSocketId, creatorUser);
    rooms.set(roomId, newRoom); // 将新房间添加到全局房间列表
    return newRoom;
};

/**
 * 根据ID获取房间实例
 * @param {number} roomId - 房间ID
 * @returns {GameRoom|undefined} 房间实例或 undefined
 */
const getRoomById = (roomId) => {
    return rooms.get(roomId);
};

/**
 * 删除一个房间
 * @param {number} roomId - 房间ID
 * @returns {boolean} 是否成功删除
 */
const deleteRoom = (roomId) => {
    if (rooms.has(roomId)) {
        logger.info(`房间 ${roomId} ("${rooms.get(roomId).name}") 已销毁。`);
        return rooms.delete(roomId);
    }
    return false;
};

module.exports = {
    ROOM_STATUS,
    getRoomsList,
    createRoom,
    getRoomById,
    deleteRoom,
    GameRoom // 导出 GameRoom 类以便在 Socket.IO 逻辑中使用
};
