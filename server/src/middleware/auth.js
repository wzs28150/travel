import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// 校验 Authorization: Bearer <token>，成功后将用户信息挂到 req.user
export default function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.uid, username: payload.username };
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
  }
}

export function signToken(user) {
  return jwt.sign({ uid: user.id, username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpires,
  });
}
