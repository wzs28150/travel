import { Router } from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/admin.js';
import { computeStorage } from '../utils/storage.js';

const router = Router();
router.use(auth);
router.use(requireAdmin);

const GB = 1024 * 1024 * 1024;

// 列表（可按 status 过滤：pending/approved/rejected）
router.get('/', async (req, res) => {
  try {
    const status = (req.query.status || '').trim();
    const where = [];
    const params = [];
    if (status) {
      where.push('sr.status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(
      `SELECT sr.*, u.username, u.nickname, u.storage_limit
       FROM storage_requests sr
       JOIN users u ON u.id = sr.user_id
       ${whereSql}
       ORDER BY sr.created_at DESC
       LIMIT 200`,
      params
    );
    const list = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.username,
      nickname: r.nickname,
      requestedGb: r.requested_gb,
      currentLimit: Number(r.storage_limit),
      reason: r.reason,
      status: r.status,
      adminId: r.admin_id,
      adminNote: r.admin_note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json({ code: 0, data: { list } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 通过：给用户 storage_limit 增加 requested_gb
router.put('/:id/approve', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM storage_requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '申请不存在' });
    const reqRow = rows[0];
    if (reqRow.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '该申请已处理' });
    }
    await db.query(
      'UPDATE users SET storage_limit = storage_limit + ? WHERE id = ?',
      [reqRow.requested_gb * GB, reqRow.user_id]
    );
    await db.query(
      'UPDATE storage_requests SET status = ?, admin_id = ?, updated_at = NOW() WHERE id = ?',
      ['approved', req.user.id, reqRow.id]
    );
    const [u] = await db.query('SELECT storage_limit FROM users WHERE id = ?', [reqRow.user_id]);
    const total = Number(u[0].storage_limit);
    const used = await computeStorage(reqRow.user_id);
    res.json({
      code: 0,
      message: '已通过，空间已增加',
      data: { used, total, percent: Math.min(100, (used / total) * 100) },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 拒绝
router.put('/:id/reject', async (req, res) => {
  try {
    const { note } = req.body || {};
    const [rows] = await db.query('SELECT * FROM storage_requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '申请不存在' });
    if (rows[0].status !== 'pending') {
      return res.status(400).json({ code: 400, message: '该申请已处理' });
    }
    await db.query(
      'UPDATE storage_requests SET status = ?, admin_id = ?, admin_note = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', req.user.id, (note || '').slice(0, 255), req.params.id]
    );
    res.json({ code: 0, message: '已拒绝' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

export default router;
