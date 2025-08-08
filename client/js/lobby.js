// client/js/lobby.js

const API_BASE_URL = 'http://localhost:3000/api';
const SOCKET_IO_URL = 'http://localhost:3000'; // Socket.IO 服务器地址

let socket;
let currentRoomId = null; // 记录当前玩家所在的房间ID

// 辅助函数：显示大厅消息（例如创建房间模态框内的消息）
function showLobbyMessage(message, isError = false) {
    const element = document.getElementById('roomModalMessage');
    if (element) {
        element.textContent = message;
        element.className = `message ${isError ? 'error' : 'success'}`;
    }
}

// 辅助函数：显示房间等待区消息
function showWaitingRoomMessage(message, isError = false) {
    const element = document.getElementById('roomWaitingMessage');
    if (element) {
        element.textContent = message;
        element.className = `message ${isError ? 'error' : 'success'}`;
    }
}

// 检查登录状态并显示用户信息
function checkLogin() {
    const token = localStorage.getItem('jwtToken');
    const username = localStorage.getItem('username');
    const accountId = localStorage.getItem('accountId');

    // 强制检查所有必需的登录信息
    if (!token || !username || !accountId) {
        console.error('登录信息不完整，强制重新登录。', { token, username, accountId });
        alert('您的登录信息已过期或不完整，请重新登录！');
        localStorage.clear(); 
        window.location.href = 'login.html'; 
        return false;
    }
    // 显示已登录的用户信息
    document.getElementById('loggedInUsername').textContent = username;
    document.getElementById('loggedInAccountId').textContent = accountId;
    return true;
}

// 初始化 Socket.IO 连接
function initSocket() {
    const token = localStorage.getItem('jwtToken');
    socket = io(SOCKET_IO_URL, {
        auth: {
            token: token // 在握手时发送 JWT Token 进行认证
        }
    });

    // Socket 连接成功
    socket.on('connect', () => {
        console.log('Socket.IO 连接成功！Socket ID:', socket.id);
        socket.emit('getRooms'); // 连接成功后立即请求房间列表
    });

    // Socket 连接断开
    socket.on('disconnect', (reason) => {
        console.log('Socket.IO 断开连接:', reason);
        alert('与服务器的连接已断开，请尝试刷新页面或重新登录。');
        // 清理本地房间状态，关闭房间等待区
        currentRoomId = null;
        document.getElementById('roomWaitingArea').style.display = 'none';
    });

    // Socket 连接错误
    socket.on('connect_error', (err) => {
        console.error('Socket.IO 连接错误:', err.message);
        alert('连接服务器失败，请检查网络或稍后再试。');
        // 如果是认证失败，则清除本地 token 并跳转登录页
        if (err.message.includes('未授权')) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });

    // 监听房间列表更新事件
    socket.on('roomListUpdate', (rooms) => {
        console.log('收到房间列表更新:', rooms);
        const roomListDiv = document.getElementById('roomList');
        roomListDiv.innerHTML = ''; // 清空现有列表

        if (rooms.length === 0) {
            roomListDiv.innerHTML = '<p>当前没有可用房间，快来创建一个吧！</p>';
            return;
        }

        // 遍历房间列表并渲染到页面
        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            roomItem.innerHTML = `
                <h3>${room.name} (ID: ${room.id})</h3>
                <p>玩家: ${room.currentPlayers}/${room.maxPlayers}</p>
                <p>状态: ${room.status === 'waiting' ? '等待中' : (room.status === 'full' ? '已满' : '游戏中')}</p>
                <p>成员: ${room.playerNames.join(', ')}</p>
                <button class="join-room-btn" data-room-id="${room.id}"
                    ${room.currentPlayers >= room.maxPlayers || room.status !== 'waiting' ? 'disabled' : ''}>
                    加入房间
                </button>
            `;
            roomListDiv.appendChild(roomItem);
        });

        // 为新加入的“加入房间”按钮添加事件监听器
        document.querySelectorAll('.join-room-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const roomId = parseInt(e.target.dataset.roomId);
                socket.emit('joinRoom', roomId); // 发送加入房间请求
            });
        });
    });

    // 监听房间创建成功事件
    socket.on('roomCreated', (roomData) => {
        console.log('房间创建成功:', roomData);
        currentRoomId = roomData.id; // 更新当前房间ID
        showRoomWaitingArea(roomData); // 显示房间等待区
        showLobbyMessage('房间创建成功，您已加入。');
        document.getElementById('roomModal').style.display = 'none'; // 关闭创建房间模态框
    });

    // 监听房间加入成功事件
    socket.on('roomJoined', (roomData) => {
        console.log('房间加入成功:', roomData);
        currentRoomId = roomData.id; // 更新当前房间ID
        showRoomWaitingArea(roomData); // 显示房间等待区
        showLobbyMessage('房间加入成功。');
        document.getElementById('roomModal').style.display = 'none'; // 确保关闭创建房间模态框
    });

    // 监听玩家加入房间事件 (房间内广播)
    socket.on('playerJoinedRoom', (data) => { // data 现在包含 { roomData, joinedPlayerUsername }
        console.log('收到 playerJoinedRoom 数据:', data); // **新增日志**
        console.log(`玩家 ${data.joinedPlayerUsername} 加入了房间。`);
        // 只有当玩家在当前房间时才更新房间内玩家列表
        if (currentRoomId === data.roomData.id) { // 确保是当前房间的更新
            showRoomWaitingArea(data.roomData); // 重新渲染房间等待区，包含最新的玩家列表
        }
        showWaitingRoomMessage(`${data.joinedPlayerUsername} 加入了房间。`);
    });

    // 监听玩家离开房间事件 (房间内广播)
    socket.on('playerLeftRoom', (data) => { // data 现在包含 { roomData, leftPlayerUsername }
        console.log('收到 playerLeftRoom 数据:', data); // **新增日志**
        console.log(`玩家 ${data.leftPlayerUsername} 离开了房间。`);
        if (currentRoomId === data.roomData.id) { // 确保是当前房间的更新
            showRoomWaitingArea(data.roomData); // 重新渲染房间等待区，包含最新的玩家列表
        }
        showWaitingRoomMessage(`${data.leftPlayerUsername} 离开了房间。`);
    });

    // 监听房间离开成功事件
    socket.on('roomLeft', (data) => {
        console.log('成功离开房间:', data.message);
        currentRoomId = null; // 清空当前房间ID
        document.getElementById('roomWaitingArea').style.display = 'none'; // 关闭房间等待区
        socket.emit('getRooms'); // 刷新房间列表
        showLobbyMessage(data.message);
    });

    // 监听房间操作错误事件
    socket.on('roomError', (message) => {
        console.error('房间操作错误:', message);
        showLobbyMessage(message, true); // 在大厅模态框显示错误
        showWaitingRoomMessage(message, true); // 在房间等待区显示错误
    });
}

// 显示房间等待区模态框并填充数据
function showRoomWaitingArea(roomData) {
    console.log('showRoomWaitingArea called with roomData:', roomData); // **新增日志**
    document.getElementById('currentRoomName').textContent = roomData.name;
    document.getElementById('currentRoomId').textContent = roomData.id;
    document.getElementById('currentPlayersCount').textContent = roomData.currentPlayers || 0;
    document.getElementById('maxPlayersCount').textContent = roomData.maxPlayers || 4; // 默认4人

    const roomPlayersList = document.getElementById('roomPlayersList');
    roomPlayersList.innerHTML = ''; // 清空现有列表，完全重新渲染

    // 过滤掉任何可能存在的 undefined 或 null 的玩家名，确保列表干净
    if (roomData.playerNames && Array.isArray(roomData.playerNames)) {
        roomData.playerNames.filter(name => name).forEach(name => { // 过滤掉 falsy 值
            const li = document.createElement('li');
            li.textContent = name;
            roomPlayersList.appendChild(li);
        });
    } else {
        console.warn('roomData.playerNames 不是有效的数组:', roomData.playerNames);
    }


    // 只有房间创建者才能点击“开始游戏”按钮
    const loggedInUsername = localStorage.getItem('username');
    const isCreator = roomData.playerNames && roomData.playerNames[0] === loggedInUsername;
    document.getElementById('startGameBtn').disabled = !isCreator;

    document.getElementById('roomWaitingArea').style.display = 'flex'; // 显示模态框
}


// --- DOMContentLoaded 事件监听器 (页面加载完成后执行) ---
document.addEventListener('DOMContentLoaded', () => {
    // 检查登录状态，如果已登录则初始化 Socket.IO
    if (checkLogin()) {
        initSocket();
    }

    // 退出登录按钮事件
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear(); // 清除本地存储的 token 和用户信息
            if (socket) {
                socket.disconnect(); // 断开 Socket 连接
            }
            window.location.href = 'index.html'; // 跳转回欢迎页
        });
    }

    // 创建房间按钮事件
    const createRoomBtn = document.getElementById('createRoomBtn');
    const roomModal = document.getElementById('roomModal');
    const closeButtons = document.querySelectorAll('.modal .close-button'); // 获取所有模态框的关闭按钮
    const confirmCreateRoomBtn = document.getElementById('confirmCreateRoomBtn');
    const newRoomNameInput = document.getElementById('newRoomName');

    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', () => {
            roomModal.style.display = 'flex'; // 显示创建房间模态框
            newRoomNameInput.value = ''; // 清空输入框
            showLobbyMessage(''); // 清空消息
        });
    }

    // 模态框关闭按钮事件
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none'; // 关闭最近的父级模态框
        });
    });

    // 点击模态框外部关闭 (仅限创建房间模态框)
    window.addEventListener('click', (event) => {
        if (event.target === roomModal) {
            roomModal.style.display = 'none';
        }
        // 房间等待区模态框不应该通过点击外部关闭，必须通过“离开房间”按钮
    });

    // 确认创建房间按钮事件
    if (confirmCreateRoomBtn) {
        confirmCreateRoomBtn.addEventListener('click', () => {
            const roomName = newRoomNameInput.value.trim();
            if (roomName) {
                socket.emit('createRoom', roomName); // 发送创建房间请求
            } else {
                showLobbyMessage('房间名不能为空。', true);
            }
        });
    }

    // 离开房间按钮事件
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', () => {
            if (socket && currentRoomId !== null) {
                socket.emit('leaveRoom'); // 发送离开房间请求
            } else {
                showWaitingRoomMessage('您不在任何房间中。', true);
            }
        });
    }

    // 开始游戏按钮事件 (暂时禁用，留待阶段三实现)
    const startGameBtn = document.getElementById('startGameBtn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            alert('游戏开始功能将在下一阶段实现！');
            // 在阶段三，这里会发送 socket.emit('startGame', currentRoomId);
        });
    }
});
