import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const DEFAULT_CODE = 'ALPHA2026';
    let dbCode = DEFAULT_CODE;

    try {
      const result = await pool.query(
        'SELECT access_code FROM access_settings WHERE id = 1'
      );
      if (result.rows.length > 0) {
        dbCode = result.rows[0].access_code;
      }
    } catch (dbError) {
      console.warn('DB unavailable, using default access code');
    }

    if (code !== dbCode) {
      return res.status(403).json({ error: 'Invalid access code' });
    }

    req.session.accessGranted = true;

    res.json({ message: 'Access granted' });
  } catch (error) {
    console.error('Access verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/code', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || code.length < 4) {
      return res.status(400).json({ error: 'Code must be at least 4 characters' });
    }

    const result = await pool.query(
      `UPDATE access_settings
       SET access_code = $1, updated_at = NOW(), updated_by = $2
       WHERE id = 1
       RETURNING access_code, updated_at`,
      [code, req.session.userId]
    );

    res.json({ message: 'Access code updated', access_code: result.rows[0].access_code });
  } catch (error) {
    console.error('Access code update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status', async (req: Request, res: Response) => {
  try {
    if (req.session.accessGranted) {
      return res.json({ granted: true });
    }

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM access_settings WHERE id = 1'
    );

    res.json({
      granted: false,
      exists: parseInt(result.rows[0].count) > 0,
    });
  } catch (error) {
    console.error('Access status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check', async (req: Request, res: Response) => {
  try {
    if (req.session.userId) {
      try {
        const userResult = await pool.query(
          'SELECT is_admin FROM users WHERE id = $1',
          [req.session.userId]
        );
        if (userResult.rows.length > 0) {
          return res.json({ needCode: false });
        }
      } catch (dbError) {
        console.warn('DB unavailable for check, using session');
      }
    }

    res.json({
      needCode: !req.session.accessGranted,
    });
  } catch (error) {
    console.error('Access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
