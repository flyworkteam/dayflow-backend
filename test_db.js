const mysql = require('mysql2/promise');
async function run() {
    const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', database: 'dayflow', waitForConnections: true, connectionLimit: 1 });
    const [rows] = await pool.query(`SELECT "start", GROUP_CONCAT(td.date) as dates FROM tasks t JOIN task_dates td ON td.task_id = t.id GROUP BY t.id LIMIT 1`);
    console.log(rows);
    process.exit(0);
}
run();