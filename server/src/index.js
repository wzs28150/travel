import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import travelRoutes from './routes/travels.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// 上传的静态文件可公开访问
app.use(`/${config.uploadDir}`, express.static(path.resolve(process.cwd(), config.uploadDir)));

// 健康检查
app.get('/api/health', (req, res) => res.json({ code: 0, message: 'ok', time: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/travels', travelRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/users', adminRoutes);

// 启动引导：若库中尚无管理员，且配置了 ADMIN_USERNAME/ADMIN_PASSWORD，则自动创建首个管理员
async function bootstrapAdmin() {
  const { username, password, nickname } = config.adminBootstrap;
  if (!username || !password) return;
  try {
    const [admins] = await db.query('SELECT id FROM users WHERE is_admin = 1');
    if (admins.length) return;
    const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) {
      await db.query('UPDATE users SET is_admin = 1 WHERE id = ?', [exists[0].id]);
      console.log(`[admin] 已将已有账号「${username}」提升为管理员`);
      return;
    }
    const hash = bcrypt.hashSync(String(password), 10);
    await db.query(
      'INSERT INTO users (username, password, nickname, is_admin) VALUES (?, ?, ?, 1)',
      [username, hash, nickname || username]
    );
    console.log(`[admin] 已用环境变量自动创建首个管理员账号「${username}」`);
  } catch (e) {
    console.error('[admin] 引导管理员失败：', e.message);
  }
}

// 兜底错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: err.message || '服务器错误' });
});

app.listen(config.port, () => {
  console.log(`[server] 旅迹后端已启动: http://localhost:${config.port}`);
  console.log(`[server] 上传目录: ${config.uploadDir}`);
  bootstrapAdmin();
});
