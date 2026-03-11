const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
});

// Startup connection test
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL pool connected successfully.');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL pool connection failed:', err.message);
    process.exit(1);
  }
})();

// Handle unexpected pool errors
pool.pool.on('error', (err) => {
  console.error('❌ Unexpected MySQL pool error:', err.message);
});

module.exports = pool;
