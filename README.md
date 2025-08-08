# 混乱大枪战：云端重制版 (Chaos Gunfight Remastered)

## 项目简介

这是一个基于 Node.js 和 Phaser.js 开发的实时多人在线射击游戏。目标是重制经典混乱大枪战的玩法，并将其带到云端。

## 核心目标 (MVP)

- 用户注册、登录
- 大厅房间列表
- 4人房间创建与加入
- 房间内基本移动、跳跃、射击
- 服务器权威性游戏逻辑与状态同步
- 支持至少2个4人房间同时游戏

## 技术栈

- **前端:** HTML5, CSS3, JavaScript (ES6+), Phaser.js, Webpack/Vite
- **后端:** Node.js, Express.js, Socket.IO, MySQL, PM2, Nginx
- **操作系统:** CentOS 7.9 64位

## 开发阶段

- **阶段一：核心后端基础设施** (已完成)
  - 用户认证 (注册/登录)
  - 数据库交互 (MySQL)
  - Socket.IO 基础连接
  - 日志系统
- **阶段二：大厅与房间管理** (进行中)
- **阶段三：核心游戏逻辑与同步**
- **阶段四：游戏内容与优化**
- **阶段五：部署、测试与迭代**

## 如何运行 (开发环境)

### 后端 (server)

1. 进入 `server` 目录：`cd server`
2. 安装依赖：`npm install`
3. 配置 `.env` 文件 (参考 `.env.example` 或直接创建并填写数据库和 JWT 密钥信息)
4. 启动服务：`npm start` (或 `node app.js`)

### 前端 (client)

1. 进入 `client` 目录：`cd client`
2. 安装依赖：`npm install`
3. 启动开发服务器：`npm run dev` (或 `npm start`)

# 
