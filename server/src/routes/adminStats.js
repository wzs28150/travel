import { Router } from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';
import requireAdmin from '../middleware/admin.js';
import { computeStorage } from '../utils/storage.js';

const router = Router();
router.use(auth);
router.use(requireAdmin);

// 后台概览统计：用户数、管理员数、旅行总数、存储用量、待审批扩容数
router.get('/', async (req, res) => {
  try {
    const [userRows] = await db.query(
      'SELECT COUNT(*) AS c, COALESCE(SUM(storage_limit),0) AS lim FROM users'
    );
    const userCount = userRows[0]?.c || 0;
    const storageLimitTotal = Number(userRows[0]?.lim || 0);

    const [adminRows] = await db.query('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1');
    const adminCount = adminRows[0]?.c || 0;

    const [travelRows] = await db.query('SELECT COUNT(*) AS c FROM travels');
    const travelTotal = travelRows[0]?.c || 0;

    const [pendingRows] = await db.query(
      "SELECT COUNT(*) AS c FROM storage_requests WHERE status = 'pending'"
    );
    const pendingRequests = pendingRows[0]?.c || 0;

    // 已用空间总量：逐用户累加（用户量级小，可接受）
    const [users] = await db.query('SELECT id FROM users');
    let storageUsedTotal = 0;
    for (const u of users) {
      storageUsedTotal += await computeStorage(u.id);
    }

    res.json({
      code: 0,
      data: {
        userCount,
        adminCount,
        travelTotal,
        storageLimitTotal,
        storageUsedTotal,
        pendingRequests,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

export default router;
