const mysql = require('mysql2/promise'); 
require('dotenv').config(); 

console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456', 
    database: process.env.DB_NAME || 'chaos_gunfight_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 测试数据库连接
pool.getConnection()
    .then(connection => {
        console.log('🎉 数据库连接成功！');
        connection.release(); // 释放连接
    })
    .catch(err => {
        console.error('❌ 数据库连接失败:', err.message);
        process.exit(1); // 退出应用
    });

module.exports = pool;
