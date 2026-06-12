import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email or username already taken' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;

    const result = await pool.query(
      `INSERT INTO users (name, username, email, password_hash, is_approved, is_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, username, email, is_approved, is_admin, created_at`,
      [name, username, email, password_hash, isFirstUser, isFirstUser]
    );

    const user = result.rows[0];

    if (isFirstUser) {
      req.session.userId = user.id;
      req.session.accessGranted = true;

      await pool.query(
        "UPDATE users SET status = 'online', updated_at = NOW() WHERE id = $1",
        [user.id]
      );

      return res.json({
        message: 'Welcome! You are the first admin.',
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatar_url: '',
          bio: '',
          status: 'online',
          is_approved: true,
          is_admin: true,
          created_at: user.created_at,
        },
      });
    }

    await pool.query(
      'INSERT INTO approvals (user_id, status) VALUES ($1, $2)',
      [user.id, 'pending']
    );

    res.status(201).json({ message: 'Registration successful. Waiting for admin approval.', user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [login]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.accessGranted = true;

    await pool.query(
      "UPDATE users SET status = 'online', updated_at = NOW() WHERE id = $1",
      [user.id]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        status: 'online',
        is_approved: user.is_approved,
        is_admin: user.is_admin,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;

    await pool.query(
      "UPDATE users SET status = 'offline' WHERE id = $1",
      [userId]
    );

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, username, email, avatar_url, bio, status,
              is_approved, is_admin, created_at
       FROM users WHERE id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
