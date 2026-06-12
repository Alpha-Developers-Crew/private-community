import pool from './pool';
import fs from 'fs';
import path from 'path';

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf-8');

    sql = sql.replace(/INSERT INTO channels/g, `
      DELETE FROM channels WHERE is_deleted = true;
      INSERT INTO channels
    `);

    await pool.query(sql);
    console.log('Database migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
