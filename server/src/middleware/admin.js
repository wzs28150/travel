// 管理员鉴权：必须在 auth 之后挂载，依赖 req.user.isAdmin
export default function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ code: 403, message: '无管理员权限' });
  }
  next();
}
