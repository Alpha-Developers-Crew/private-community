import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as created_by_name
       FROM channels c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.is_deleted = false
       ORDER BY c.created_at ASC`
    );
    res.json({ channels: result.rows });
  } catch (error) {
    console.error('Channels list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 50);

    if (!cleanName) {
      return res.status(400).json({ error: 'Invalid channel name' });
    }

    const existing = await pool.query(
      'SELECT id FROM channels WHERE name = $1 AND is_deleted = false',
      [cleanName]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Channel already exists' });
    }

    const result = await pool.query(
      `INSERT INTO channels (name, created_by)
       VALUES ($1, $2)
       RETURNING *`,
      [cleanName, req.session.userId]
    );

    res.status(201).json({ channel: result.rows[0] });
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    const cleanName = name.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 50);

    const result = await pool.query(
      `UPDATE channels SET name = $1 WHERE id = $2 AND is_deleted = false
       RETURNING *`,
      [cleanName, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel: result.rows[0] });
  } catch (error) {
    console.error('Rename channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      "UPDATE channels SET is_deleted = true WHERE id = $1",
      [id]
    );

    res.json({ message: 'Channel deleted' });
  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
