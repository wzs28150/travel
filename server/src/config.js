// 集中读取环境变量与常量
export const config = {
  port: Number(process.env.PORT || 8089),
  baseUrl: process.env.BASE_URL ?? 'http://localhost:8089',
  jwtSecret: process.env.JWT_SECRET || 'change_me_to_a_long_random_secret',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  storageLimit: Number(process.env.STORAGE_LIMIT || 2147483648),
};
