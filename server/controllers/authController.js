const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const logger = require('../config/logger'); 

const JWT_SECRET = process.env.JWT_SECRET; // 从环境变量获取 JWT 密钥

exports.register = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: '请填写所有必填字段。' });
    }

    try {
        // 检查邮箱或用户名是否已存在
        const [existingUser] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ message: '邮箱或用户名已被注册。' });
        }

        // 哈希密码
        const hashedPassword = await bcrypt.hash(password, 10); // 10 是盐的轮数

        // 存储用户到数据库，使用 password_hash 字段
        const [result] = await pool.query(
            'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
            [email, username, hashedPassword]
        );

        logger.info(`用户注册成功: ${email}`);
        res.status(201).json({ message: '注册成功！' });

    } catch (error) {
        logger.error(`注册失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，注册失败。' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: '请填写邮箱和密码。' });
    }

    try {
        // 查找用户
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: '邮箱或密码不正确。' });
        }

        // 比较密码，使用 user.password_hash
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: '邮箱或密码不正确。' });
        }

        // 更新最后登录时间
        await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        // 生成 JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' } // Token 有效期
        );

        logger.info(`用户登录成功: ${email}`);
        res.json({ message: '登录成功！', token, username: user.username, email: user.email });

    } catch (error) {
        logger.error(`登录失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，登录失败。' });
    }
};
