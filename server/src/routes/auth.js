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

// 管理后台独立登录：仅 is_admin=1 的账号可登录，非管理员不签发 token
// 与客户端 /login 完全隔离，便于后续管理端独立部署 / 对接 App 客户端
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '请输入账号和密码' });
    }
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];
    // 账号不存在 / 密码错误 / 非管理员 统一返回 401，不泄露账号是否存在
    if (!user || !user.is_admin || !bcrypt.compareSync(String(password), user.password)) {
      return res.status(401).json({ code: 401, message: '账号或密码错误，或无管理员权限' });
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

// 申请扩容（提交后等待管理员审核，不会立即生效）
router.post('/storage/apply', auth, async (req, res) => {
  try {
    const { requestedGb, reason } = req.body || {};
    const gb = Number(requestedGb);
    if (!gb || gb <= 0) {
      return res.status(400).json({ code: 400, message: '请填写有效的扩容容量' });
    }
    if (gb > 500) {
      return res.status(400).json({ code: 400, message: '单次申请不能超过 500GB' });
    }
    // 已有待审核申请则不允许重复提交
    const [pend] = await db.query(
      "SELECT id FROM storage_requests WHERE user_id = ? AND status = 'pending'",
      [req.user.id]
    );
    if (pend.length) {
      return res.status(409).json({ code: 409, message: '已有一条待审核的扩容申请，请等待处理' });
    }
    await db.query(
      'INSERT INTO storage_requests (user_id, requested_gb, reason, status) VALUES (?, ?, ?, ?)',
      [req.user.id, gb, (reason || '').slice(0, 255), 'pending']
    );
    res.json({ code: 0, message: '申请已提交，等待管理员审核' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 查询我的扩容申请状态（用于前端展示「审核中」）
router.get('/storage/request', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM storage_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    const r = rows[0];
    res.json({
      code: 0,
      data: r
        ? {
            id: r.id,
            requestedGb: r.requested_gb,
            reason: r.reason,
            status: r.status,
            adminNote: r.admin_note,
            createdAt: r.created_at,
          }
        : null,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

export default router;
