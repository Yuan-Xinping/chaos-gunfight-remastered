const winston = require('winston');

// 定义所有传输器
const transports = [
    // 文件输出 (所有级别)
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
];

// 根据环境添加控制台传输器并设置其级别
if (process.env.NODE_ENV !== 'production') {
    // 开发环境：输出 debug 级别及以上的日志到控制台
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(), // 控制台颜色
            winston.format.simple()    // 简洁格式
        ),
        level: 'debug' // 在开发环境中显示所有级别（包括 debug）
    }));
} else {
    // 生产环境：只输出 info 级别及以上的日志到控制台（或根据需要调整为 'error'）
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        level: 'info' // 在生产环境中显示 info 级别及以上
    }));
}

const logger = winston.createLogger({
    level: 'info', // 默认日志级别，但实际输出由 transports 的 level 决定
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // 记录错误堆栈
        winston.format.splat(), // 允许像 console.log 那样使用 %s 等
        winston.format.json() // 输出 JSON 格式日志到文件
    ),
    transports: transports, // 使用我们动态生成的传输器数组
});

module.exports = logger;
