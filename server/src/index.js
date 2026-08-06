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
import storageRequestRoutes from './routes/storageRequests.js';
import adminStatsRoutes from './routes/adminStats.js';
import { getFreeDiskBytes } from './utils/disk.js';

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
app.use('/api/admin/storage-requests', storageRequestRoutes);
app.use('/api/admin/stats', adminStatsRoutes);

// 启动自检：兼容老库升级（init.sql 仅在全新卷首次执行，已有库不会自动补列/建表）
// 幂等：is_admin 列缺失则补，storage_requests 表缺失则建；出错仅告警不阻断启动。
async function ensureSchema() {
  try {
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'is_admin'"
    );
    if (!cols.length) {
      await db.query(
        "ALTER TABLE users ADD COLUMN is_admin TINYINT NOT NULL DEFAULT 0 COMMENT '是否管理员(0否/1是)' AFTER storage_limit"
      );
      console.log('[schema] 已为 users 表补 is_admin 列');
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`storage_requests\` (
        \`id\`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`user_id\`      INT UNSIGNED NOT NULL COMMENT '申请人',
        \`requested_gb\` INT UNSIGNED NOT NULL COMMENT '申请增加的空间(GB)',
        \`reason\`       VARCHAR(255) DEFAULT '' COMMENT '申请理由',
        \`status\`       VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
        \`admin_id\`     INT UNSIGNED DEFAULT NULL COMMENT '处理人(管理员)',
        \`admin_note\`   VARCHAR(255) DEFAULT '' COMMENT '处理备注',
        \`created_at\`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\`   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_user\` (\`user_id\`),
        KEY \`idx_status\` (\`status\`),
        CONSTRAINT \`fk_sr_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存储扩容申请'
    `);
    console.log('[schema] storage_requests 表已就绪');
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`server_meta\` (
        \`k\`          VARCHAR(64) NOT NULL COMMENT '配置键',
        \`v\`          TEXT         COMMENT '配置值',
        \`updated_at\` DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`k\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='服务端元信息(键值对)'
    `);
    console.log('[schema] server_meta 表已就绪');
  } catch (e) {
    console.error('[schema] 自检失败（不影响启动，请检查数据库）：', e.message);
  }
}

// 记录「安装时服务器可用空间」：仅首次写入，之后保持不变（快照）。
// - 已设置环境变量 SERVER_STORAGE_TOTAL_GB 则用它；
// - 否则：库里已有用户（已安装过的程序）→ 默认 20GB；全新安装 → 记录上传目录所在磁盘的真实可用空间。
async function seedServerStorage() {
  try {
    const [rows] = await db.query("SELECT v FROM server_meta WHERE k = 'server_storage_total_bytes'");
    if (rows.length) return; // 已记录过，保持安装时快照不变
    const envGb = Number(process.env.SERVER_STORAGE_TOTAL_GB || 0);
    let totalBytes = 0;
    if (envGb > 0) {
      totalBytes = Math.round(envGb * 1024 ** 3);
    } else {
      const [users] = await db.query('SELECT COUNT(*) AS c FROM users');
      const hasData = (users[0]?.c || 0) > 0;
      if (hasData) {
        totalBytes = 20 * 1024 ** 3; // 已安装过的程序：默认 20GB
      } else {
        totalBytes = getFreeDiskBytes(config.uploadDir); // 全新安装：记录真实可用空间
        if (!totalBytes) totalBytes = 20 * 1024 ** 3; // 兜底
      }
    }
    const val = String(totalBytes);
    await db.query(
      "INSERT INTO server_meta (k, v) VALUES ('server_storage_total_bytes', ?) ON DUPLICATE KEY UPDATE v = ?",
      [val, val]
    );
    console.log(`[schema] 已记录安装时服务器可用空间：${(totalBytes / 1024 ** 3).toFixed(2)} GB`);
  } catch (e) {
    console.error('[schema] 记录服务器可用空间失败（不影响启动）：', e.message);
  }
}

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

app.listen(config.port, async () => {
  console.log(`[server] 旅迹后端已启动: http://localhost:${config.port}`);
  console.log(`[server] 上传目录: ${config.uploadDir}`);
  await ensureSchema();
  await seedServerStorage();
  bootstrapAdmin();
});
