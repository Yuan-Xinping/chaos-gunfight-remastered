const winston = require('winston');

const logger = winston.createLogger({
    level: 'info', // 默认日志级别
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // 记录错误堆栈
        winston.format.splat(), // 允许像 console.log 那样使用 %s 等
        winston.format.json() // 输出 JSON 格式日志
    ),
    transports: [
        // 控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // 控制台颜色
                winston.format.simple() // 简洁格式
            )
        }),
        // 文件输出 (所有级别)
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ],
});

// 如果是开发环境，也输出 debug 级别的日志到控制台
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
        level: 'debug'
    }));
}

module.exports = logger;
