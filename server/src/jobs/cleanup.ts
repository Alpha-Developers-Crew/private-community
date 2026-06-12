import cron from 'node-cron';
import pool from '../db/pool';

async function cleanupMessages() {
  try {
    const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `DELETE FROM messages WHERE created_at < $1
       RETURNING id`,
      [cutoff]
    );

    const count = result.rowCount || 0;

    if (count > 0) {
      await pool.query(
        'INSERT INTO cleanup_logs (table_name, records_deleted) VALUES ($1, $2)',
        ['messages', count]
      );
      console.log(`Cleanup: Deleted ${count} old messages`);
    }
  } catch (error) {
    console.error('Cleanup messages error:', error);
  }
}

async function cleanupDirectMessages() {
  try {
    const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `DELETE FROM direct_messages WHERE created_at < $1
       RETURNING id`,
      [cutoff]
    );

    const count = result.rowCount || 0;

    if (count > 0) {
      await pool.query(
        'INSERT INTO cleanup_logs (table_name, records_deleted) VALUES ($1, $2)',
        ['direct_messages', count]
      );
      console.log(`Cleanup: Deleted ${count} old direct messages`);
    }
  } catch (error) {
    console.error('Cleanup direct messages error:', error);
  }
}

async function cleanupNotices() {
  try {
    const result = await pool.query(
      `DELETE FROM notices WHERE expires_at < NOW()
       RETURNING id`
    );

    const count = result.rowCount || 0;

    if (count > 0) {
      await pool.query(
        'INSERT INTO cleanup_logs (table_name, records_deleted) VALUES ($1, $2)',
        ['notices', count]
      );
      console.log(`Cleanup: Deleted ${count} expired notices`);
    }
  } catch (error) {
    console.error('Cleanup notices error:', error);
  }
}

export function startCleanupJob() {
  cron.schedule('0 3 * * *', async () => {
    console.log('Running daily cleanup...');
    await cleanupMessages();
    await cleanupDirectMessages();
    await cleanupNotices();
    console.log('Daily cleanup completed.');
  });

  console.log('Cleanup job scheduled: runs daily at 3:00 AM');
}
