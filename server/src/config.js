// 集中读取环境变量与常量
export const config = {
  port: Number(process.env.PORT || 8089),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:8089',
  jwtSecret: process.env.JWT_SECRET || 'change_me_to_a_long_random_secret',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  storageLimit: Number(process.env.STORAGE_LIMIT || 2147483648),
  // 首个管理员引导：服务器/容器首次启动时，若库中尚无管理员且配置了以下变量，则自动创建
  adminBootstrap: {
    username: process.env.ADMIN_USERNAME || '',
    password: process.env.ADMIN_PASSWORD || '',
    nickname: process.env.ADMIN_NICKNAME || '管理员',
  },
};
