import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomToken } from '../lib/crypto.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn('[uploads] Could not create uploads directory:', (err as Error).message);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `${Date.now()}_${randomToken(8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, 'invalid_file_type', 'Only JPG, PNG, WEBP, and PDF files are allowed.'));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', requireAuth('ADMIN', 'STAFF', 'VENDOR'), upload.single('file'), (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'no_file', 'Please select a file to upload.');
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    original_name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});
