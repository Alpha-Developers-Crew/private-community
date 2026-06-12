import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

async function isAdmin(userId: string): Promise<boolean> {
  const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return result.rows.length > 0 && result.rows[0].is_admin;
}

router.use(requireAuth);
router.use(async (req: Request, res: Response, next) => {
  if (!(await isAdmin(req.session.userId!))) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalUsers, approvedUsers, pendingUsers, totalMessages, totalFiles, storageResult] =
      await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM users WHERE is_approved = true'),
        pool.query('SELECT COUNT(*) as count FROM users WHERE is_approved = false AND is_suspended = false'),
        pool.query('SELECT COUNT(*) as count FROM messages'),
        pool.query('SELECT COUNT(*) as count FROM uploads'),
        pool.query('SELECT COALESCE(SUM(file_size), 0) as total FROM uploads'),
      ]);

    res.json({
      total_users: parseInt(totalUsers.rows[0].count),
      approved_users: parseInt(approvedUsers.rows[0].count),
      pending_users: parseInt(pendingUsers.rows[0].count),
      total_messages: parseInt(totalMessages.rows[0].count),
      total_files: parseInt(totalFiles.rows[0].count),
      storage_usage: parseInt(storageResult.rows[0].total),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;

    let query = `
      SELECT id, name, username, email, avatar_url, bio, status,
             is_approved, is_admin, is_suspended, created_at
      FROM users
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (status === 'pending') {
      conditions.push('is_approved = false AND is_suspended = false');
    } else if (status === 'approved') {
      conditions.push('is_approved = true AND is_suspended = false');
    } else if (status === 'suspended') {
      conditions.push('is_suspended = true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query);
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/notices', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.name as created_by_name
       FROM notices n
       JOIN users u ON n.created_by = u.id
       ORDER BY n.created_at DESC
       LIMIT 50`
    );
    res.json({ notices: result.rows });
  } catch (error) {
    console.error('Admin notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/memories', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    let query = `
      SELECT m.*, u.name as uploader_name
      FROM memories m
      JOIN users u ON m.uploader_id = u.id
    `;
    const params: any[] = [];

    if (search) {
      query += ` WHERE m.title ILIKE $1 OR m.description ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY m.created_at DESC LIMIT 100';
    const result = await pool.query(query, params);
    res.json({ memories: result.rows });
  } catch (error) {
    console.error('Admin memories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/messages/:id', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
