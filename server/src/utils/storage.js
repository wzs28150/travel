import db from '../db.js';

// 计算某用户已用存储空间（字节）= 所有旅行相册图片大小之和
export async function computeStorage(userId) {
  const [rows] = await db.query('SELECT content FROM travels WHERE user_id = ?', [userId])
  let used = 0
  for (const r of rows) {
    const content = r.content
    if (!content) continue
    for (const key of ['photos', 'album']) {
      if (Array.isArray(content[key])) {
        for (const p of content[key]) {
          if (p && typeof p.size === 'number') used += p.size
        }
      }
    }
  }
  return used
}
