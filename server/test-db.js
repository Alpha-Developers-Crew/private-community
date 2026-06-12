const { Pool } = require('pg');
const url = 'postgresql://postgres:Community%40123___+@db.omnvaatijuctrfdjzthg.supabase.co:5432/postgres';
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
pool.query('SELECT access_code FROM access_settings WHERE id = 1')
  .then(r => { console.log('Access code in DB:', r.rows[0]?.access_code); process.exit(0); })
  .catch(e => { console.log('DB Error:', e.message); process.exit(1); });
