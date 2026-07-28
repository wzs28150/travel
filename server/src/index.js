import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import travelRoutes from './routes/travels.js';
import uploadRoutes from './routes/upload.js';

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

// 兜底错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ code: 500, message: err.message || '服务器错误' });
});

app.listen(config.port, () => {
  console.log(`[server] 旅迹后端已启动: http://localhost:${config.port}`);
  console.log(`[server] 上传目录: ${config.uploadDir}`);
});
