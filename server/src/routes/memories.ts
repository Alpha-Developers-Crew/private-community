import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    let query = `
      SELECT m.*, u.name as uploader_name, u.username as uploader_username, u.avatar_url as uploader_avatar
      FROM memories m
      JOIN users u ON m.uploader_id = u.id
      WHERE m.is_permanent = true
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (m.title ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    paramCount++;
    query += ` ORDER BY m.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await pool.query(query, params);
    res.json({ memories: result.rows });
  } catch (error) {
    console.error('Memories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, description, file_url, file_type, file_size } = req.body;

    if (!title || !file_url) {
      return res.status(400).json({ error: 'Title and file are required' });
    }

    const result = await pool.query(
      `INSERT INTO memories (title, description, file_url, file_type, file_size, uploader_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description || '', file_url, file_type || 'unknown', file_size || 0, req.session.userId]
    );

    res.status(201).json({ memory: result.rows[0] });
  } catch (error) {
    console.error('Create memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const result = await pool.query(
      `UPDATE memories SET title = COALESCE($1, title), description = COALESCE($2, description)
       WHERE id = $3 RETURNING *`,
      [title, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({ memory: result.rows[0] });
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM memories WHERE id = $1 RETURNING file_url',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({ message: 'Memory deleted' });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
