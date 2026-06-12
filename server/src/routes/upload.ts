import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { requireAuth } from '../middleware/auth';
import pool from '../db/pool';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const allowedFormats = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'pdf', 'zip'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';

    if (!allowedFormats.includes(ext)) {
      throw new Error(`File format .${ext} not supported`);
    }

    const resourceType = ['jpg', 'jpeg', 'png', 'gif'].includes(ext) ? 'image'
                       : ext === 'mp4' ? 'video' : 'raw';

    return {
      folder: 'private-community',
      resource_type: resourceType,
      public_id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf', 'application/zip'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

const router = Router();

router.post('/', requireAuth, (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      const file = req.file as any;
      const fileUrl = file.path || file.secure_url;
      const publicId = file.filename || file.public_id;

      await pool.query(
        `INSERT INTO uploads (user_id, url, public_id, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.session.userId, fileUrl, publicId, file.mimetype, file.size]
      );

      res.json({
        url: fileUrl,
        public_id: publicId,
        file_type: file.mimetype,
        file_size: file.size,
        original_name: req.file.originalname,
      });
    } catch (error) {
      console.error('Upload save error:', error);
      res.status(500).json({ error: 'Failed to save upload metadata' });
    }
  });
});

router.delete('/:publicId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;

    await cloudinary.uploader.destroy(publicId);

    await pool.query('DELETE FROM uploads WHERE public_id = $1', [publicId]);

    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
