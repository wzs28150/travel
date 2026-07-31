import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 单文件 20MB（原图先收下，再压缩）
  fileFilter: (req, file, cb) => {
    if (/image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  },
});

// 压缩原图 + 生成缩略图，返回文件名
async function processImage(srcPath, isPng) {
  const dir = path.dirname(srcPath);
  // 输出必须用全新唯一名，绝不能复用 multer 临时文件名（sharp 不允许读写同文件）
  const stem = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = isPng ? '.png' : '.jpg';
  const fullName = stem + ext;
  const thumbName = stem + '.thumb' + ext;
  const fullPath = path.join(dir, fullName);
  const thumbPath = path.join(dir, thumbName);

  const pipeline = (w) =>
    sharp(srcPath, { limitInputPixels: false })
      .rotate() // 按 EXIF 方向自动旋转，避免手机照片横倒
      .resize(w, null, { withoutEnlargement: true, fit: 'inside' })
      .withMetadata(false); // 去除 EXIF，减小体积并保护隐私

  if (isPng) {
    await pipeline(1600).png({ quality: 85, compressionLevel: 9 }).toFile(fullPath);
    await pipeline(480).png({ quality: 80, compressionLevel: 9 }).toFile(thumbPath);
  } else {
    // 大图：最大边 1600px，质量 82（mozjpeg）
    await pipeline(1600).jpeg({ quality: 82, mozjpeg: true }).toFile(fullPath);
    // 缩略图：最大边 480px，质量 70，用于相册/列表，6M 带宽秒开
    await pipeline(480).jpeg({ quality: 70, mozjpeg: true }).toFile(thumbPath);
  }

  // 删掉原始大图，只保留压缩后的
  fs.unlink(srcPath, () => {});
  return { fullName, thumbName };
}

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ code: 400, message: '未收到文件' });
    const isPng = req.file.mimetype === 'image/png';
    const { fullName, thumbName } = await processImage(req.file.path, isPng);
    const base = config.baseUrl || '';
    const url = `${base}/${config.uploadDir}/${fullName}`;
    const thumb = `${base}/${config.uploadDir}/${thumbName}`;
    let size = 0;
    try {
      size = fs.statSync(path.join(uploadDir, fullName)).size;
    } catch (e) {
      /* ignore */
    }
    res.json({
      code: 0,
      data: { url, thumb, name: req.file.originalname, size },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: e.message || '上传失败' });
  }
});

export default router;
