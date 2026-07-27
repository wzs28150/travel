import { Router } from 'express';
import db from '../db.js';
import auth from '../middleware/auth.js';

const router = Router();
router.use(auth); // 以下接口均需登录

const TOP_FIELDS = ['title', 'destination', 'startDate', 'endDate', 'status', 'cover'];

// 把数据库行合并成前端需要的完整旅行对象
function toTravel(row) {
  const obj = {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date ? String(row.start_date) : '',
    endDate: row.end_date ? String(row.end_date) : '',
    status: row.status,
    cover: row.cover,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  const content = row.content || {};
  for (const k of Object.keys(content)) obj[k] = content[k];
  return obj;
}

// 列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM travels WHERE user_id = ? ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json({ code: 0, data: rows.map(toTravel) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM travels WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (!rows.length) return res.status(404).json({ code: 404, message: '旅行不存在' });
    res.json({ code: 0, data: toTravel(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 创建
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const top = {};
    const content = {};
    for (const [k, v] of Object.entries(body)) {
      if (TOP_FIELDS.includes(k)) top[k] = v;
      else content[k] = v;
    }
    const [result] = await db.query(
      `INSERT INTO travels (user_id, title, destination, start_date, end_date, status, cover, content)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        top.title || '未命名旅行',
        top.destination || '',
        top.startDate || null,
        top.endDate || null,
        top.status || 'planning',
        top.cover || '',
        JSON.stringify(content),
      ]
    );
    const [rows] = await db.query('SELECT * FROM travels WHERE id = ?', [result.insertId]);
    res.json({ code: 0, message: '创建成功', data: toTravel(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 更新
router.put('/:id', async (req, res) => {
  try {
    const [exists] = await db.query('SELECT id FROM travels WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (!exists.length) return res.status(404).json({ code: 404, message: '旅行不存在' });

    const body = req.body || {};
    const top = {};
    const content = {};
    for (const [k, v] of Object.entries(body)) {
      if (TOP_FIELDS.includes(k)) top[k] = v;
      else content[k] = v;
    }
    const sets = [];
    const params = [];
    if (top.title !== undefined) { sets.push('title = ?'); params.push(top.title); }
    if (top.destination !== undefined) { sets.push('destination = ?'); params.push(top.destination); }
    if (top.startDate !== undefined) { sets.push('start_date = ?'); params.push(top.startDate || null); }
    if (top.endDate !== undefined) { sets.push('end_date = ?'); params.push(top.endDate || null); }
    if (top.status !== undefined) { sets.push('status = ?'); params.push(top.status); }
    if (top.cover !== undefined) { sets.push('cover = ?'); params.push(top.cover); }
    sets.push('content = ?');
    params.push(JSON.stringify(content));
    params.push(req.params.id);
    params.push(req.user.id);
    await db.query(`UPDATE travels SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const [rows] = await db.query('SELECT * FROM travels WHERE id = ?', [req.params.id]);
    res.json({ code: 0, message: '已保存', data: toTravel(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM travels WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (!result.affectedRows) return res.status(404).json({ code: 404, message: '旅行不存在' });
    res.json({ code: 0, message: '已删除' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ code: 500, message: '服务器错误' });
  }
});

export default router;
