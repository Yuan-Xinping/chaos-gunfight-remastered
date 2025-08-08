# 混乱大枪战：云端重制版 (Chaos Gunfight Remastered)

## 项目简介

这是一个基于 Node.js 和 Phaser.js 开发的实时多人在线射击游戏。目标是重制经典混乱大枪战的玩法，并将其带到云端。

## 核心目标 (MVP)

- 用户注册、登录 (已支持邮箱验证和系统账号ID)
- 大厅房间列表 (已实现实时更新)
- 4人房间创建与加入 (已实现)
- 房间内基本移动、跳跃、射击 (待实现)
- 服务器权威性游戏逻辑与状态同步 (待实现)
- 支持至少2个4人房间同时游戏 (待实现)

## 技术栈

- **前端:** HTML5, CSS3, JavaScript (ES6+), Phaser.js (计划), Webpack/Vite (计划)
- **后端:** Node.js, Express.js, Socket.IO, MySQL, bcrypt, jsonwebtoken, dotenv, winston, cors, nodemailer
- **操作系统:** CentOS 7.9 64位 (目标部署环境)

## 开发阶段

- **阶段一：核心后端基础设施** (已完成)
  
  - 用户认证 (注册/登录，使用 bcrypt 进行密码哈希，JWT 进行会话管理)
  - 数据库交互 (MySQL, 使用 `mysql2/promise` 驱动)
  - Socket.IO 基础连接 (带 JWT 认证)
  - RESTful API 基础构建 (Express.js)
  - 日志系统 (`winston`)
  - 跨域资源共享 (`cors`)
  - 环境变量管理 (`dotenv`)

- **阶段二：大厅与房间管理** (进行中)
  
  - **用户认证完善:**
    - 系统分配9位数字账号ID
    - 邮箱验证码发送与验证 (用于注册和密码重置，使用 `nodemailer` 和 QQ邮箱SMTP)
    - 用户密码修改功能
    - 登录支持邮箱或账号ID
  - **实时大厅功能:**
    - 实时显示房间列表 (房间名称、当前人数、状态)
    - 用户创建游戏房间
    - 用户加入游戏房间
    - 房间内玩家列表实时更新
    - 房间状态实时更新 (等待中、已满、游戏中)
    - 玩家离开房间及空房间自动销毁

- **阶段三：核心游戏逻辑与同步** (待开始)

- **阶段四：游戏内容与优化** (待开始)

- **阶段五：部署、测试与迭代** (待开始)

## 如何运行 (开发环境)

### 后端 (server)

1. 进入 `server` 目录：`cd server`

2. 安装依赖：`npm install`

3. 配置 `.env` 文件：
   
   * 参考 `.env.example` 或直接创建。
   * 填写数据库连接信息 (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)。
   * 设置 JWT 密钥 (`JWT_SECRET`)。
   * 配置 QQ 邮箱 SMTP 信息 (`EMAIL_USER`, `EMAIL_PASS` - **请填写你的QQ邮箱授权码，而非登录密码**)。

4. **数据库准备：** 确保 MySQL 服务器运行，并连接到 `chaos_gunfight_db` 数据库，执行以下 SQL 命令来更新 `users` 表和创建 `email_verification_codes` 表：
   
   ```sql
   SET NAMES utf8mb4;
   SET FOREIGN_KEY_CHECKS = 0;
   
   -- ----------------------------
   -- Table structure for email_verification_codes
   -- ----------------------------
   DROP TABLE IF EXISTS `email_verification_codes`;
   CREATE TABLE `email_verification_codes`  (
     `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
     `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
     `code` varchar(6) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
     `expires_at` datetime NOT NULL,
     `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
     `purpose` enum('register','password_reset') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '验证码用途：注册或密码重置',
     PRIMARY KEY (`id`) USING BTREE,
     UNIQUE INDEX `idx_email_purpose`(`email` ASC, `purpose` ASC) USING BTREE,
     INDEX `idx_expires_at`(`expires_at` ASC) USING BTREE
   ) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '邮箱验证码表' ROW_FORMAT = DYNAMIC;
   
   -- ----------------------------
   -- Table structure for users
   -- ----------------------------
   DROP TABLE IF EXISTS `users`;
   CREATE TABLE `users`  (
     `id` int UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户唯一ID',
     `account_id` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '系统分配的9位数字账号',
     `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户昵称，用于显示和游戏内识别，唯一',
     `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户邮箱，用于登录和找回密码，唯一',
     `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户密码的哈希值，使用bcrypt等算法加密',
     `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '用户注册时间',
     `last_login_at` datetime NULL DEFAULT NULL COMMENT '用户最后一次登录时间',
     PRIMARY KEY (`id`) USING BTREE,
     UNIQUE INDEX `username`(`username` ASC) USING BTREE,
     UNIQUE INDEX `email`(`email` ASC) USING BTREE,
     INDEX `idx_created_at`(`created_at` ASC) USING BTREE,
     UNIQUE INDEX `account_id`(`account_id` ASC) USING BTREE
   ) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '用户信息表' ROW_FORMAT = DYNAMIC;
   
   SET FOREIGN_KEY_CHECKS = 1;
   ```

5. 启动服务：`node app.js` (或配置 `package.json` 中的 `scripts` 使用 `npm start`)
   
   * 服务器默认运行在 `http://localhost:3000`。

### 前端 (client)

1. 进入 `client` 目录：`cd client`
2. **直接在浏览器中打开以下 HTML 文件进行测试：**
   * `index.html` (欢迎页)
   * `login.html` (登录页)
   * `register.html` (注册页)
   * `reset_password.html` (重置密码页)
   * `lobby.html` (大厅页，需要先登录)
3. **注意：** 当前前端为纯静态文件，无需 `npm install` 或 `npm run dev`。未来的阶段可能会引入前端构建工具。
