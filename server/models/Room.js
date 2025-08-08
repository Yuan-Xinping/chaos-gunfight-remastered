const { v4: uuidv4 } = require('uuid'); // 用于生成唯一房间ID

class Room {
    constructor(name, hostId, hostUsername, hostSocketId) {
        this.id = uuidv4(); // 唯一房间ID
        this.name = name;
        this.maxPlayers = 4;
        this.players = [{ id: hostId, username: hostUsername, socketId: hostSocketId }]; // 存储玩家信息
        this.status = 'waiting'; // 'waiting', 'playing', 'full' 
        this.hostId = hostId; // 房间创建者的用户ID
        this.gameInstance = null; // 占位符
        this.createdAt = new Date();
    }

    addPlayer(playerId, username, socketId) {
         if (this.players.length >= this.maxPlayers || this.status !== 'waiting') {
            return false; // 房间已满或不在等待状态
        }
        const existingPlayerIndex = this.players.findIndex(p => p.id === playerId);

        if (existingPlayerIndex !== -1) {
            // 玩家已在房间中，更新其 socketId
            this.players[existingPlayerIndex].socketId = socketId;
            this.players[existingPlayerIndex].username = username; // 确保用户名也最新
            return true;
        } else {
            // 新玩家加入
            this.players.push({ id: playerId, username: username, socketId: socketId });
            return true;
        }
    }

    removePlayer(playerId) {
        const initialLength = this.players.length;
        this.players = this.players.filter(p => p.id !== playerId);
        return this.players.length < initialLength;
    }

    isFull() {
        return this.players.length >= this.maxPlayers;
    }

    isEmpty() {
        return this.players.length === 0;
    }

    // 转换为前端可用的精简数据
    toLobbyData() {
        return {
            id: this.id,
            name: this.name,
            currentPlayers: this.players.length,
            maxPlayers: this.maxPlayers,
            status: this.status,
            hostUsername: this.players.find(p => p.id === this.hostId)?.username || '未知'
        };
    }

    // 转换为房间内可见的详细数据
    toRoomData() {
        return {
            id: this.id,
            name: this.name,
            players: this.players.map(p => ({ id: p.id, username: p.username })), // 不暴露 socketId
            maxPlayers: this.maxPlayers,
            status: this.status,
            hostId: this.hostId,
            hostUsername: this.players.find(p => p.id === this.hostId)?.username || '未知'
        };
    }
}

module.exports = Room;
