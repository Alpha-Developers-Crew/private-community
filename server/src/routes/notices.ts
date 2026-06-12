import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT n.*, u.name as created_by_name, u.avatar_url as created_by_avatar
       FROM notices n
       JOIN users u ON n.created_by = u.id
       WHERE n.expires_at > NOW()
       ORDER BY n.created_at DESC
       LIMIT 20`
    );

    const notices = result.rows.map((n: any) => ({
      ...n,
      days_remaining: Math.max(0, Math.ceil((new Date(n.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
    }));

    res.json({ notices });
  } catch (error) {
    console.error('Notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, message, attachment_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO notices (title, message, attachment_url, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, message || '', attachment_url || '', req.session.userId]
    );

    const notice = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('new_notice', notice);
    }

    res.status(201).json({ notice });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM notices WHERE id = $1', [id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('notice_deleted', { id });
    }

    res.json({ message: 'Notice deleted' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
