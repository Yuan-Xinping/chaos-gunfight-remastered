const nodemailer = require('nodemailer');
const logger = require('./logger'); // 引入日志模块

// 创建 Nodemailer 传输器对象
const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',     
    port: 465,               
    secure: true,            
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS,
    },
});

// 验证 transporter 配置是否正确
transporter.verify(function (error, success) {
    if (error) {
        logger.error('❌ 邮箱服务配置错误，无法发送邮件:', error);
    } else {
        logger.info('🎉 邮箱服务已准备好发送邮件');
    }
});

/**
 * 生成一个6位数字的验证码
 * @returns {string} 6位数字字符串
 */
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6位数字
};

/**
 * 发送验证码邮件
 * @param {string} toEmail - 接收邮件的邮箱地址
 * @param {string} code - 验证码
 * @param {'register'|'password_reset'} purpose - 验证码的用途
 * @returns {Promise<boolean>} 是否发送成功
 */
const sendVerificationEmail = async (toEmail, code, purpose) => {
    const subject = purpose === 'register' ? '您的注册验证码' : '您的密码重置验证码';
    const htmlContent = `
        <p>您好！</p>
        <p>您正在进行《混乱大枪战：云端重制版》的<b>${purpose === 'register' ? '注册' : '密码重置'}</b>操作。</p>
        <p>您的验证码是: <strong>${code}</strong></p>
        <p>此验证码 5 分钟内有效。请勿将验证码泄露给他人。</p>
        <p>如果您没有进行此操作，请忽略此邮件。</p>
        <p>祝您游戏愉快！</p>
        <p>《混乱大枪战：云端重制版》项目组</p>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.EMAIL_USER.split('@')[0]} (混乱大枪战)" <${process.env.EMAIL_USER}>`, // 发件人显示名称
            to: toEmail,
            subject: subject,
            html: htmlContent,
        });
        logger.info(`验证码邮件发送成功至: ${toEmail} (用途: ${purpose})`);
        return true;
    } catch (error) {
        logger.error(`发送验证码邮件失败至 ${toEmail}: ${error.message}`, error);
        return false;
    }
};

module.exports = {
    generateVerificationCode,
    sendVerificationEmail,
};
