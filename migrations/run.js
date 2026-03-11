// Migration runner — reads and executes SQL files against the database
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  console.log('✅ Connected to MySQL');

  // Create migration tracking table if not exists
  await connection.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Get already applied migrations
  const [applied] = await connection.query('SELECT filename FROM _migrations ORDER BY id');
  const appliedSet = new Set(applied.map((r) => r.filename));

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ranCount = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`⏭️  Skipping (already applied): ${file}`);
      continue;
    }
    console.log(`⏳ Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await connection.query(sql);
    await connection.query('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    console.log(`✅ Completed: ${file}`);
    ranCount++;
  }

  await connection.end();
  if (ranCount === 0) {
    console.log('✅ All migrations already applied.');
  } else {
    console.log(`🎉 ${ranCount} migration(s) applied successfully!`);
  }
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
