const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware'); 

// 注册用户
router.post('/register', authController.register);

// 用户登录
router.post('/login', authController.login);

// 示例：一个需要认证的受保护路由
router.get('/profile', authMiddleware, (req, res) => {
    res.json({ message: '欢迎来到你的个人资料页！', user: req.user });
});

module.exports = router;
