const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
// 发送邮箱验证码 (用于注册或密码重置)
router.post('/send-verification-code', authController.sendVerificationCode);

// 验证邮箱验证码 (此接口可用于独立验证，但注册和重置密码内部会再次验证)
router.post('/verify-code', authController.verifyCode);

// 用户注册 
router.post('/register', authController.register);

// 用户登录 
router.post('/login', authController.login);

// 重置密码
router.post('/reset-password', authController.resetPassword);

router.get('/profile', authMiddleware, (req, res) => {
    // req.user 包含了 JWT 解码后的用户信息：id, email, username, accountId
    res.json({ message: '欢迎来到你的个人资料页！', user: req.user });
});

module.exports = router;
