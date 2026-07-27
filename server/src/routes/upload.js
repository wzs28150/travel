import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import auth from '../middleware/auth.js';
import { config } from '../config.js';

const router = Router();

const uploadDir = path.resolve(process.cwd(), config.uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 单文件 15MB
  fileFilter: (req, file, cb) => {
    if (/image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  },
});

router.post('/', auth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: '未收到文件' });
    const url = `${config.baseUrl}/${config.uploadDir}/${req.file.filename}`;
    res.json({
      code: 0,
      data: { url, name: req.file.originalname, size: req.file.size },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message || '上传失败' });
  }
});

export default router;
