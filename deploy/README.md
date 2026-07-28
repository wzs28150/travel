# 旅迹 部署包

> ⚠️ 本项目**只有一个**部署目录，就是本目录 `deploy/`（原 `travel-deploy/` 已合并进来，不再单独存在）。不要再去找 `travel-deploy`。

本目录是「镜像 + 配置」形式的离线部署包，不依赖源码，适合直接拷到服务器跑。

## 包含文件
- `travel-images.tar` —— 导出的两个应用镜像（backend + frontend，约 81MB）
- `docker-compose.yml` —— 部署版编排（用 `image:` 直接 load 后的镜像，**不要改回 build**）
- `docker-compose.build.yml` —— 备用：本地从源码重建镜像用的 compose
- `init.sql` —— MySQL 初始化（首次启动自动建库建表）

## 服务器端操作步骤
```bash
# 1) 把整个 deploy/ 目录传到服务器后进入
cd deploy

# 2) 载入镜像（若已存在同名镜像会复用）
docker load -i travel-images.tar

# 3) 启动全栈（mysql 会自动拉取 mysql:8.0；离线环境请先 docker pull mysql:8.0）
docker compose up -d

# 4) 访问
#    前端:  http://<服务器IP>:8090
#    后端:  http://<服务器IP>:8089  (仅容器内，外部经 8090 的 nginx 访问)
```

## 生产注意事项
- **务必修改 `JWT_SECRET`**：编辑 `docker-compose.yml` 里的 `JWT_SECRET: please_change_this_to_a_long_random_secret`，换成随机长字符串，否则 token 可被伪造。
- 默认 MySQL 密码 `rootpass`、库名 `travel_db`，按需修改。
- 前端已由 nginx 反代 `/api` 与 `/uploads` 到后端，无需额外配置。
- 上传的图片存在 `backend_uploads` 卷，重启不丢；如需备份，备份该卷或 `server/uploads` 目录。
