import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.session.userId!;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(
      `SELECT dm.*,
              u_sender.name as sender_name, u_sender.username as sender_username, u_sender.avatar_url as sender_avatar,
              u_receiver.name as receiver_name, u_receiver.username as receiver_username, u_receiver.avatar_url as receiver_avatar
       FROM direct_messages dm
       JOIN users u_sender ON dm.sender_id = u_sender.id
       JOIN users u_receiver ON dm.receiver_id = u_receiver.id
       WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
          OR (dm.sender_id = $2 AND dm.receiver_id = $1)
       ORDER BY dm.created_at DESC
       LIMIT $3 OFFSET $4`,
      [currentUserId, userId, limit, offset]
    );

    await pool.query(
      `UPDATE direct_messages SET read_at = NOW()
       WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
      [userId, currentUserId]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('DM get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { content, image_url, file_url, file_name } = req.body;
    const currentUserId = req.session.userId!;

    if (!content && !image_url && !file_url) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await pool.query(
      `INSERT INTO direct_messages (sender_id, receiver_id, content, image_url, file_url, file_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [currentUserId, userId, content || '', image_url || '', file_url || '', file_name || '']
    );

    const message = result.rows[0];

    const senderResult = await pool.query(
      'SELECT name, username, avatar_url FROM users WHERE id = $1',
      [currentUserId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('new_dm', {
        ...message,
        sender_name: senderResult.rows[0].name,
        sender_username: senderResult.rows[0].username,
        sender_avatar: senderResult.rows[0].avatar_url,
      });

      io.to(`user:${currentUserId}`).emit('new_dm', {
        ...message,
        sender_name: senderResult.rows[0].name,
        sender_username: senderResult.rows[0].username,
        sender_avatar: senderResult.rows[0].avatar_url,
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('DM send error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/conversations/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const result = await pool.query(
      `SELECT DISTINCT
         CASE WHEN dm.sender_id = $1 THEN dm.receiver_id ELSE dm.sender_id END as other_user_id,
         u.name as other_user_name,
         u.username as other_user_username,
         u.avatar_url as other_user_avatar,
         u.status as other_user_status,
         dm.content as last_message,
         dm.created_at as last_message_at,
         dm.read_at as last_read_at
       FROM direct_messages dm
       JOIN users u ON u.id = CASE WHEN dm.sender_id = $1 THEN dm.receiver_id ELSE dm.sender_id END
       WHERE dm.sender_id = $1 OR dm.receiver_id = $1
       AND u.is_suspended = false
       ORDER BY dm.created_at DESC`,
      [userId]
    );

    const conversations: any[] = [];
    const seen = new Set();

    for (const row of result.rows) {
      if (!seen.has(row.other_user_id)) {
        seen.add(row.other_user_id);
        conversations.push(row);
      }
    }

    res.json({ conversations });
  } catch (error) {
    console.error('DM conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
