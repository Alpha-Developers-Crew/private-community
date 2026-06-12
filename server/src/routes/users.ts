import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, username, email, avatar_url, bio, status,
              is_approved, is_admin, created_at
       FROM users
       WHERE is_approved = true AND is_suspended = false
       ORDER BY name ASC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pending', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, username, email, created_at
       FROM users
       WHERE is_approved = false AND is_suspended = false
       ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Pending users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/approve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE users SET is_approved = true, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await pool.query(
      `UPDATE approvals SET status = 'approved', approved_by = $1 WHERE user_id = $2`,
      [req.session.userId, id]
    );

    res.json({ message: 'User approved' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE approvals SET status = 'rejected', approved_by = $1 WHERE user_id = $2`,
      [req.session.userId, id]
    );

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'User rejected and removed' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/suspend', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE users SET is_suspended = true, status = 'offline', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ message: 'User suspended' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/unsuspend', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE users SET is_suspended = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ message: 'User unsuspended' });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, username, email, avatar_url, bio, status, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, bio, avatar_url } = req.body;
    const userId = req.session.userId;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramCount++}`);
      values.push(bio);
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramCount++}`);
      values.push(avatar_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, username, email, avatar_url, bio, status, created_at`,
      values
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
