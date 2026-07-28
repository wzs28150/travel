# 旅迹 部署说明

> 本项目**只有一个**部署目录：`deploy/`（原 `travel-deploy/` 已合并，不要再找它）。

本项目有两种部署方式，按你机器情况选：

| 方式 | 适用场景 | MySQL |
|---|---|---|
| **A. 本地/测试 Docker 全栈** | 本机开发、测试（本机没有 MySQL 或想隔离） | mysql 容器（占用本机 3306） |
| **B. 服务器原生部署** | 生产服务器**已自带 MySQL**（3306 被占用，不能跑 mysql 容器） | 直接用系统 MySQL |

---

## 方式 A：本地 / 测试（Docker 全栈，含 mysql 容器）

适合本机一键起整套环境。mysql 容器会占用本机 `3306`，所以本机不要同时跑别的 MySQL。

在项目根目录执行：

```bash
docker compose up -d
# 访问 http://localhost:8090
```

镜像来源二选一：
- 直接源码构建（根目录 `docker-compose.yml` 用 `build:`）。
- 无源码机器：先 `docker load -i deploy/travel-images.tar`，再用 `deploy/docker-compose.yml`（用 `image:`）。

> 方式 A 的 `docker-compose.yml` 里 `mysql` 服务映射 `3306:3306`，仅用于本地；**生产服务器有系统 MySQL 时请勿用它**。

---

## 方式 B：生产服务器原生部署（系统 MySQL，不用 Docker）

你的服务器已自带 MySQL（占用 3306），所以**不跑任何 mysql 容器**，后端直接连系统 MySQL。

### 前置条件
- 系统 MySQL 已运行（3306）。
- 已建库 `travel_db` 并执行过 `init.sql`（建表）。
- 服务器装了 Node.js 18+。

### 1) 部署后端
把 `server/` 目录传到服务器（如 `/www/wwwroot/travel/server`），安装依赖并用 `.env` 指定系统 MySQL：

```bash
cd /www/wwwroot/travel/server
npm install --omit=dev          # 仅生产依赖

# 复制并填写 .env（DB_PASSWORD 填你的系统 MySQL 密码，JWT_SECRET 改随机串）
cp .env.example .env
vim .env

# 启动（宝塔可用「Node 项目 / PM2」托管，环境变量与 .env 一致即可）
node src/index.js
# 或 pm2： pm2 start src/index.js --name travel-backend
```

后端监听 `8089`，连 `127.0.0.1:3306` 的系统 MySQL。

### 2) 构建并部署前端
前端在**本地**（有 node + 构建工具链）构建，再把 `dist/` 传服务器：

```bash
# 本地
cd front-end
npm install
npm run build                  # 产出 dist/
```

把 `dist/` 传到服务器（如 `/www/wwwroot/travel/dist`），然后在宝塔配置：

- **建站**：宝塔 → 网站 → 添加站点 → 选择「纯静态」→ 根目录指向 `dist/`。
- **端口**：站点设 `8090`（或默认 80，按需）。
- **反向代理**（关键，让前端请求转发到后端 8089）：
  - 名称 `api`，目标 `http://127.0.0.1:8089`，发送域名 `127.0.0.1`，勾选「启用」；前端请求 `/api/*` 会自动代理。
  - 名称 `uploads`，目标 `http://127.0.0.1:8089`，发送域名 `127.0.0.1`；用于访问上传的图片 `/uploads/*`。
  - （宝塔反向代理默认会代理所有路径到目标；若只想代理 `/api` 和 `/uploads`，在反代配置里加对应 location 规则即可。）

> 前端代码中 API 基址是相对路径 `/api`，所以不需要在构建时配置后端地址，全部由 nginx 反代处理。

### 3) 放行端口
- 宝塔 → 安全 → 放行 **8090**。
- 云厂商安全组同样放行 **8090**。

### 4) 访问
```
http://<服务器IP>:8090
```

---

## 生产注意事项
- **务必修改 `JWT_SECRET`**：改成随机长字符串，否则 token 可被伪造。
- 系统 MySQL 密码在 `.env` 的 `DB_PASSWORD`；默认库名 `travel_db`，按需改 `DB_NAME`。
- 上传的图片存在 `server/uploads/`，重启不丢；备份时连同该目录一起备份。
- 系统 MySQL 请确认字符集为 `utf8mb4`，避免中文乱码。
- `deploy/travel-images.tar` 是 Docker 镜像包（方式 A 备用 / 纯净服务器 Docker 部署用），方式 B 不需要它。
