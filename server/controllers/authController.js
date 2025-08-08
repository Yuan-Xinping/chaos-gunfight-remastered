const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); // 数据库连接池
const logger = require('../config/logger'); // 日志模块
const { generateVerificationCode, sendVerificationEmail } = require('../config/emailService'); // 邮箱服务

const JWT_SECRET = process.env.JWT_SECRET; // 从环境变量获取 JWT 密钥

/**
 * 生成一个唯一的9位数字账号ID
 * 确保生成的ID在数据库中是唯一的
 * @returns {Promise<string>} 唯一的9位数字字符串
 */
const generateUniqueAccountId = async () => {
    let accountId;
    let isUnique = false;
    while (!isUnique) {
        // 生成一个100,000,000到999,999,999之间的随机数，确保是9位
        accountId = Math.floor(100000000 + Math.random() * 900000000).toString();
        const [existing] = await pool.query('SELECT id FROM users WHERE account_id = ?', [accountId]);
        if (existing.length === 0) {
            isUnique = true; // 找到了唯一的ID
        }
    }
    return accountId;
};

/**
 * 发送邮箱验证码的API接口
 * 用于注册和密码重置
 */
exports.sendVerificationCode = async (req, res) => {
    const { email, purpose } = req.body; // purpose: 'register' 或 'password_reset'

    if (!email || !['register', 'password_reset'].includes(purpose)) {
        return res.status(400).json({ message: '邮箱和用途是必填项，用途必须是 "register" 或 "password_reset"。' });
    }

    try {
        // 根据用途进行邮箱检查
        if (purpose === 'register') {
            const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                return res.status(409).json({ message: '该邮箱已被注册，请直接登录或使用其他邮箱。' });
            }
        }
        if (purpose === 'password_reset') {
            const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length === 0) {
                return res.status(404).json({ message: '该邮箱未注册，无法重置密码。' });
            }
        }

        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 验证码5分钟后过期

        // 存储或更新验证码到数据库
        // ON DUPLICATE KEY UPDATE 确保同一邮箱同一用途的验证码只存在一个最新有效的
        await pool.query(
            'INSERT INTO email_verification_codes (email, code, expires_at, purpose) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), created_at = CURRENT_TIMESTAMP',
            [email, code, expiresAt, purpose]
        );

        const emailSent = await sendVerificationEmail(email, code, purpose);
        if (emailSent) {
            res.status(200).json({ message: '验证码已发送至您的邮箱，请查收。' });
        } else {
            res.status(500).json({ message: '发送验证码失败，请检查邮箱地址或稍后再试。' });
        }
    } catch (error) {
        logger.error(`发送验证码失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，发送验证码失败。' });
    }
};

/**
 * 验证邮箱验证码的API接口 (此接口可用于独立验证，但注册和重置密码内部会再次验证)
 */
exports.verifyCode = async (req, res) => {
    const { email, code, purpose } = req.body;

    if (!email || !code || !['register', 'password_reset'].includes(purpose)) {
        return res.status(400).json({ message: '邮箱、验证码和用途是必填项。' });
    }

    try {
        const [codes] = await pool.query(
            'SELECT * FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
            [email, purpose]
        );
        const storedCode = codes[0];

        if (!storedCode || storedCode.code !== code || new Date() > new Date(storedCode.expires_at)) {
            // 如果验证码无效或过期，删除它以防止重复尝试
            if (storedCode) {
                await pool.query('DELETE FROM email_verification_codes WHERE id = ?', [storedCode.id]);
            }
            return res.status(400).json({ message: '验证码无效或已过期，请重新获取。' });
        }

        // 验证成功后删除验证码，防止重复使用
        await pool.query('DELETE FROM email_verification_codes WHERE id = ?', [storedCode.id]);

        res.status(200).json({ message: '验证成功！' });
    } catch (error) {
        logger.error(`验证码验证失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，验证码验证失败。' });
    }
};

/**
 * 用户注册API接口
 * 现在需要邮箱验证码
 */
exports.register = async (req, res) => {
    const { email, username, password, verificationCode } = req.body;

    if (!email || !username || !password || !verificationCode) {
        return res.status(400).json({ message: '请填写所有必填字段和验证码。' });
    }

    try {
        const [codes] = await pool.query(
            'SELECT * FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
            [email, 'register']
        );
        const storedCode = codes[0];

        if (!storedCode || storedCode.code !== verificationCode || new Date() > new Date(storedCode.expires_at)) {
            // 如果验证码无效或过期，删除它
            if (storedCode) {
                await pool.query('DELETE FROM email_verification_codes WHERE id = ?', [storedCode.id]);
            }
            return res.status(400).json({ message: '验证码无效或已过期，请重新获取。' });
        }
        // 验证成功后删除验证码，防止重复注册
        await pool.query('DELETE FROM email_verification_codes WHERE id = ?', [storedCode.id]);

        // 2. 检查邮箱或用户名是否已存在
        const [existingUser] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );
        if (existingUser.length > 0) {
            return res.status(409).json({ message: '邮箱或昵称已被注册。' });
        }

        // 3. 生成唯一的9位账号ID
        const accountId = await generateUniqueAccountId();

        // 4. 哈希密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. 存储用户到数据库，包含 account_id
        await pool.query(
            'INSERT INTO users (account_id, email, username, password_hash) VALUES (?, ?, ?, ?)',
            [accountId, email, username, hashedPassword]
        );

        logger.info(`用户注册成功: ${email}, 账号ID: ${accountId}`);
        res.status(201).json({ message: '注册成功！', accountId: accountId });

    } catch (error) {
        logger.error(`注册失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，注册失败。' });
    }
};

/**
 * 用户登录API接口
 * 支持使用邮箱或系统分配的账号ID进行登录
 */
exports.login = async (req, res) => {
    const { identifier, password } = req.body; // identifier 可以是 email 或 account_id

    if (!identifier || !password) {
        return res.status(400).json({ message: '请填写账号/邮箱和密码。' });
    }

    try {
        // 尝试通过邮箱或账号ID查找用户
        const [users] = await pool.query('SELECT * FROM users WHERE email = ? OR account_id = ?', [identifier, identifier]);
        const user = users[0];

        if (!user) {
            return res.status(401).json({ message: '账号/邮箱或密码不正确。' });
        }

        // 比较密码
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: '账号/邮箱或密码不正确。' });
        }

        // 更新最后登录时间
        await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        // 生成 JWT Token，包含账号ID
        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username, accountId: user.account_id },
            JWT_SECRET,
            { expiresIn: '1h' } // Token 有效期
        );

        logger.info(`用户登录成功: ${user.email} (账号ID: ${user.account_id})`);
        res.json({
            message: '登录成功！',
            token,
            username: user.username,
            email: user.email,
            accountId: user.account_id
        });

    } catch (error) {
        logger.error(`登录失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，登录失败。' });
    }
};

/**
 * 重置密码API接口
 * 需要邮箱验证码
 */
exports.resetPassword = async (req, res) => {
    const { email, newPassword, verificationCode } = req.body;

    if (!email || !newPassword || !verificationCode) {
        return res.status(400).json({ message: '请填写所有必填字段。' });
    }

    try {
        // 1. 验证邮箱是否存在
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user) {
            return res.status(404).json({ message: '该邮箱未注册，无法重置密码。' });
        }

        // 2. 验证验证码
        const [codes] = await pool.query(
            'SELECT * FROM email_verification_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1',
            [email, 'password_reset']
        );
        const storedCode = codes[0];

        if (!storedCode || storedCode.code !== verificationCode || new Date() > new Date(storedCode.expires_at)) {
            // 如果验证码无效或过期，删除它
            if (storedCode) {
                await pool.query('DELETE FROM email_verification_codes WHERE id = ?', [storedCode.id]);
            }
            return res.status(400).json({ message: '验证码无效或已过期，请重新获取。' });
        }

        // 验证成功后删除验证码
        await pool.query('DELETE FROM email_verification_codes WHERE id = ?', [storedCode.id]);

        // 3. 哈希新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. 更新用户密码
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);

        logger.info(`用户 ${email} 密码重置成功。`);
        res.status(200).json({ message: '密码重置成功！请使用新密码登录。' });

    } catch (error) {
        logger.error(`密码重置失败: ${error.message}`, error);
        res.status(500).json({ message: '服务器错误，密码重置失败。' });
    }
};
