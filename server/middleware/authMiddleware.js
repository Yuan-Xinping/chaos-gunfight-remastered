const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '未授权：缺少或无效的Token。' });
    }

    const token = authHeader.split(' ')[1]; // 提取 Bearer 后面的 token

    try {
        // 验证 token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // 将解码后的用户信息添加到请求对象中
        next(); // 继续处理下一个中间件或路由
    } catch (error) {
        logger.warn(`JWT 验证失败: ${error.message}`);
        return res.status(403).json({ message: '未授权：Token 无效或已过期。' });
    }
};
