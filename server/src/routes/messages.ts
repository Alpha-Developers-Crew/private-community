import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:channelId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT m.*, u.name as user_name, u.username as user_username,
              u.avatar_url as user_avatar
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:channelId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { content, image_url, file_url, file_name } = req.body;

    if (!content && !image_url && !file_url) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await pool.query(
      `INSERT INTO messages (channel_id, user_id, content, image_url, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [channelId, req.session.userId, content || '', image_url || '', file_url || '', file_name || '']
    );

    const message = result.rows[0];

    const userResult = await pool.query(
      'SELECT name, username, avatar_url FROM users WHERE id = $1',
      [req.session.userId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`channel:${channelId}`).emit('new_message', {
        ...message,
        user_name: userResult.rows[0].name,
        user_username: userResult.rows[0].username,
        user_avatar: userResult.rows[0].avatar_url,
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:channelId/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const q = req.query.q as string;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const result = await pool.query(
      `SELECT m.*, u.name as user_name, u.username as user_username, u.avatar_url as user_avatar
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.channel_id = $1 AND m.content ILIKE $2
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [channelId, `%${q}%`]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
