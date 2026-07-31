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
    isSample: !!row.is_sample,
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

// 注册后给新用户播种的示例旅行（is_sample=1）
const SAMPLE_TRAVELS = [
  {
    title: '🌸 京都赏樱四日游',
    destination: '日本 · 京都',
    region: ['JP'],
    cities: ['京都'],
    status: 'planning',
    budgetTotal: 8000,
    dayOffset: 20,
    photos: [
      { place: '伏见稻荷大社', tag: '千本鸟居', c1: '#ff9a9e', c2: '#fecfef' },
      { place: '清水寺', tag: '夕阳全景', c1: '#a18cd1', c2: '#fbc2eb' },
      { place: '祇园', tag: '花见小路', c1: '#ffecd2', c2: '#fcb69f' },
    ],
    itinerary: [
      { title: '伏见稻荷大社', time: '10:00', note: '千本鸟居拍照，建议早到避开人潮', done: false },
      { title: '清水寺 · 二三年坂', time: '15:00', note: '看夕阳下的京都全景', done: false },
      { title: '祇园逛街', time: '19:00', note: '碰碰运气看艺伎', done: false },
    ],
    luggage: [
      { name: '护照 / 签证', category: '证件', packed: true },
      { name: '充电宝', category: '电子', packed: false },
      { name: '轻便外套', category: '衣物', packed: false },
    ],
    todos: [
      { text: '兑换日元', done: true },
      { text: '预订机票', done: false },
      { text: '买 IC 卡（ICOCA）', done: false },
    ],
  },
  {
    title: '🏞️ 杭州西湖周末游',
    destination: '浙江 · 杭州',
    region: ['330100'],
    cities: ['杭州'],
    status: 'planning',
    budgetTotal: 1500,
    dayOffset: 5,
    photos: [
      { place: '断桥残雪', tag: '白堤', c1: '#a1c4fd', c2: '#c2e9fb' },
      { place: '雷峰塔', tag: '湖光全景', c1: '#84fab0', c2: '#8fd3f4' },
      { place: '河坊街', tag: '市井小吃', c1: '#d4fc79', c2: '#96e6a1' },
    ],
    itinerary: [
      { title: '断桥残雪 → 白堤', time: '09:30', note: '沿湖慢走，春天柳绿桃红', done: false },
      { title: '雷峰塔', time: '14:00', note: '俯瞰西湖全景', done: false },
      { title: '河坊街吃小吃', time: '18:30', note: '定胜糕、葱包桧儿', done: false },
    ],
    luggage: [
      { name: '相机', category: '电子', packed: true },
      { name: '遮阳帽', category: '衣物', packed: false },
    ],
    todos: [
      { text: '订酒店', done: false },
      { text: '查天气带伞', done: true },
    ],
  },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 把示例相册定义转成一张内联 SVG 占位图（离线可用，不依赖外网图床）
function svgPhoto(p) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${p.c1}'/><stop offset='1' stop-color='${p.c2}'/>` +
    `</linearGradient></defs>` +
    `<rect width='600' height='400' fill='url(#g)'/>` +
    `<text x='32' y='348' font-family='sans-serif' font-size='38' font-weight='bold' fill='rgba(255,255,255,0.95)'>${p.place}</text>` +
    `<text x='32' y='390' font-family='sans-serif' font-size='22' fill='rgba(255,255,255,0.85)'>${p.tag}</text>` +
    `</svg>`;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    place: p.place,
    tag: p.tag,
  };
}

// 给指定用户插入示例旅行（注册流程调用）
export async function seedSampleTravels(userId) {
  for (const s of SAMPLE_TRAVELS) {
    const startDate = `DATE_ADD(CURDATE(), INTERVAL ${Number(s.dayOffset)} DAY)`;
    const endDate = `DATE_ADD(CURDATE(), INTERVAL ${Number(s.dayOffset) + 3} DAY)`;
    const content = {
      region: s.region || [],
      cities: s.cities || [],
      budgetTotal: s.budgetTotal || 0,
      photos: (s.photos || []).map(svgPhoto),
      itinerary: (s.itinerary || []).map((it) => ({ id: uid(), ...it })),
      luggage: (s.luggage || []).map((it) => ({ id: uid(), ...it })),
      todos: (s.todos || []).map((it) => ({ id: uid(), ...it })),
      budgets: [],
    };
    await db.query(
      `INSERT INTO travels (user_id, title, destination, start_date, end_date, status, cover, is_sample, content)
       VALUES (?, ?, ?, ${startDate}, ${endDate}, ?, '', 1, ?)`,
      [userId, s.title, s.destination, s.status, JSON.stringify(content)]
    );
  }
}

export default router;
