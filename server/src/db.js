import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'travel_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true, // DATE/DATETIME 以 'YYYY-MM-DD' / 'YYYY-MM-DD HH:MM:SS' 字符串返回
});

// 启动时校验一次连接
pool
  .getConnection()
  .then((conn) => {
    console.log('[db] MySQL 连接成功');
    conn.release();
  })
  .catch((err) => {
    console.error('[db] MySQL 连接失败：', err.message);
    console.error('[db] 请确认 MySQL 已启动（docker compose up -d）且账号密码正确');
  });

export default pool;
