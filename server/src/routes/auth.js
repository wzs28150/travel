import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import auth, { signToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { computeStorage } from '../utils/storage.js';
import { seedSampleTravels } from './travels.js';

const router = Router();

const PUBLIC_FIELDS = ['id', 'username', 'nickname', 'avatar', 'signature', 'gender', 'city', 'is_admin', 'created_at'];

function publicUser(row) {
  const u = {};
  for (const k of PUBLIC_FIELDS) u[k] = row[k];
  return u;
}

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body || {};
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
    const [result] = await db.query(
      'INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)',
      [username, hash, nickname || username]
    );
    const userId = result.insertId;
    // 注册成功后给新用户播种示例旅行，降低空页面孤独感
    try {
      await seedSampleTravels(userId);
    } catch (seedErr) {
      console.error('示例数据播种失败（不影响注册）：', seedErr);
    }
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    const token = signToken(user);
    res.json({ code: 0, message: '注册成功', data: { token, user: publicUser(user) } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '账号和密码不能为空' });
    }
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      return res.status(401).json({ code: 401, message: '账号不存在' });
    }
    const user = rows[0];
    if (!bcrypt.compareSync(String(password), user.password)) {
      return res.status(401).json({ code: 401, message: '密码错误' });
    }
    const token = signToken(user);
    res.json({ code: 0, message: '登录成功', data: { token, user: publicUser(user) } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 0, data: publicUser(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新资料
router.put('/profile', auth, async (req, res) => {
  try {
    const { nickname, avatar, signature, gender, city } = req.body || {};
    const sets = [];
    const params = [];
    if (nickname !== undefined) { sets.push('nickname = ?'); params.push(nickname); }
    if (avatar !== undefined) { sets.push('avatar = ?'); params.push(avatar); }
    if (signature !== undefined) { sets.push('signature = ?'); params.push(signature); }
    if (gender !== undefined) { sets.push('gender = ?'); params.push(gender); }
    if (city !== undefined) { sets.push('city = ?'); params.push(city); }
    if (!sets.length) return res.json({ code: 0, data: {} });
    params.push(req.user.id);
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ code: 0, message: '已保存', data: publicUser(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 存储空间用量
router.get('/storage', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT storage_limit FROM users WHERE id = ?', [req.user.id]);
    const total = rows.length ? Number(rows[0].storage_limit) : config.storageLimit;
    const used = await computeStorage(req.user.id);
    res.json({
      code: 0,
      data: {
        used,
        total,
        percent: total ? Math.min(100, (used / total) * 100) : 0,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 扩容 +2GB
router.put('/storage/expand', auth, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET storage_limit = storage_limit + ? WHERE id = ?',
      [2 * 1024 * 1024 * 1024, req.user.id]
    );
    const [rows] = await db.query('SELECT storage_limit FROM users WHERE id = ?', [req.user.id]);
    const total = Number(rows[0].storage_limit);
    const used = await computeStorage(req.user.id);
    res.json({
      code: 0,
      message: '扩容成功',
      data: { used, total, percent: Math.min(100, (used / total) * 100) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

export default router;
