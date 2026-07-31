import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/admin.js';
import { config } from '../config.js';
import { computeStorage } from '../utils/storage.js';
import { seedSampleTravels } from './travels.js';

const router = Router();
router.use(auth);
router.use(requireAdmin);

const GB = 1024 * 1024 * 1024;

// 计算某用户的附加信息：已用空间、旅行数
async function getUserExtra(userId) {
  const [rows] = await db.query('SELECT COUNT(*) AS c FROM travels WHERE user_id = ?', [userId]);
  const travelCount = rows[0]?.c || 0;
  const storageUsed = await computeStorage(userId);
  return { travelCount, storageUsed };
}

function toAdminUser(row, extra = {}) {
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname,
    avatar: row.avatar,
    signature: row.signature,
    gender: row.gender,
    city: row.city,
    is_admin: !!row.is_admin,
    storage_limit: Number(row.storage_limit),
    storage_used: extra.storageUsed ?? 0,
    travel_count: extra.travelCount ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// 列表（分页 + 关键字搜索）
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const keyword = (req.query.keyword || '').trim();
    const where = [];
    const params = [];
    if (keyword) {
      where.push('(username LIKE ? OR nickname LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [countRows] = await db.query(`SELECT COUNT(*) AS c FROM users ${whereSql}`, params);
    const total = countRows[0]?.c || 0;
    const [rows] = await db.query(
      `SELECT * FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    );
    const list = await Promise.all(
      rows.map(async (r) => toAdminUser(r, await getUserExtra(r.id)))
    );
    res.json({ code: 0, data: { list, total, page, pageSize } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 0, data: toAdminUser(rows[0], await getUserExtra(rows[0].id)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 创建用户
router.post('/', async (req, res) => {
  try {
    const { username, password, nickname, city, storageLimitGB, is_admin, seedSample } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '账号和密码不能为空' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少 6 位' });
    }
    const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) {
      return res.status(409).json({ code: 409, message: '该账号已被注册' });
    }
    const hash = bcrypt.hashSync(String(password), 10);
    const storageLimit = storageLimitGB != null && storageLimitGB !== '' ? Math.round(GB * Number(storageLimitGB)) : config.storageLimit;
    const [result] = await db.query(
      'INSERT INTO users (username, password, nickname, city, is_admin, storage_limit) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hash, nickname || username, city || '', is_admin ? 1 : 0, storageLimit]
    );
    const userId = result.insertId;
    if (seedSample) {
      try {
        await seedSampleTravels(userId);
      } catch (seedErr) {
        console.error('示例数据播种失败（不影响创建）：', seedErr);
      }
    }
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    res.json({ code: 0, message: '创建成功', data: toAdminUser(rows[0], await getUserExtra(userId)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新用户
router.put('/:id', async (req, res) => {
  try {
    const { nickname, city, storageLimitGB, is_admin, password } = req.body || {};
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    const sets = [];
    const params = [];
    if (nickname !== undefined) { sets.push('nickname = ?'); params.push(nickname); }
    if (city !== undefined) { sets.push('city = ?'); params.push(city); }
    if (is_admin !== undefined) { sets.push('is_admin = ?'); params.push(is_admin ? 1 : 0); }
    if (storageLimitGB != null) {
      sets.push('storage_limit = ?');
      params.push(Math.max(0, Math.round(GB * Number(storageLimitGB))));
    }
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ code: 400, message: '密码至少 6 位' });
      }
      sets.push('password = ?');
      params.push(bcrypt.hashSync(String(password), 10));
    }
    if (!sets.length) {
      const [cur] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
      return res.json({ code: 0, data: toAdminUser(cur[0], await getUserExtra(req.params.id)) });
    }
    params.push(req.params.id);
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '已保存', data: toAdminUser(updated[0], await getUserExtra(req.params.id)) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除用户（级联删除其旅行）
router.delete('/:id', async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ code: 400, message: '不能删除当前登录的管理员账号' });
    }
    const [rows] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '已删除' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

export default router;
