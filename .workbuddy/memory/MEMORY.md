# 项目长期记忆：travel（猫途迹→旅迹 旅行 H5）

## 项目架构
- 前后端分离：`front-end/`（Vite+Vue3+TDesign 移动端）与 `server/`（Express+MySQL）。
- 已改名「猫途迹」→「旅迹」（避免与仿照对象撞名），品牌 logo 由 🐱 改为 🧭。
## 部署架构（用户最终采用 Docker 全栈；原生部署作备选）
- **用户最终决定：生产服务器也用 Docker 全栈**（部署用 `deploy/docker-compose.yml`，含 mysql 容器；本地测试用根 `docker-compose.yml`）。之前「服务器不用 Docker、改用原生部署」的判断已推翻，原生部署仅作方式 B 备选保留在 `deploy/README.md`。
- 前端 nginx 反代 `/api`、`/uploads` 到 `backend:**8089**`；后端容器端口 **8089**（`expose`），前端对外 **8090**（主机 `8090:80`）。`docker compose up -d` 一键起。
- 镜像名：`travel-backend`、`travel-frontend`。`deploy/travel-images.tar` 为 Docker 镜像包（先 `docker load -i` 再 `docker compose up -d`）。
- 部署目录唯一为 `deploy/`。`deploy.tar.gz` 传输包 gitignore。
- **重新部署/更新**：传新 `deploy.tar.gz` → 解压 → `docker load -i travel-images.tar` 覆盖旧镜像 → 宝塔编排「更新/重新部署」或命令行 `docker compose up -d --force-recreate`（推荐只重建 `frontend backend`，**勿点「删除栈」**，否则 `mysql_data` 卷与已建表会丢）。compose 用 `:latest` 标签，宝塔「更新」有时不强制重建容器，需 `--force-recreate` 兜底。
- ⚠️ **坑（已踩）**：若服务器系统已自带 MySQL 占 3306，docker 的 mysql 容器 `ports: "3306:3306"` 会端口冲突 → mysql 容器起不来/不健康 → backend 的 `depends_on: mysql: condition: service_healthy` 不满足 → backend 不启动 → 前端访问 `/api` 报 **502**。修复：停掉系统 MySQL 让 docker mysql 独占 3306，或改 compose 的 mysql 端口映射为 `3307:3306`（容器间 backend→mysql:3306 不受影响，DB_PORT 仍 3306）。

## 服务器环境
- 用户用 **宝塔面板**，服务器 Docker 版本 **26.1.4**（amd64）。宝塔装 Docker 常只装引擎、未带 compose v2 插件，导致 `docker compose up -d` 报 `unknown shorthand flag: 'd' in -d`（docker 把 -d 当自身参数）。
- 部署用宝塔 Docker 管理器「编排/Compose」粘贴 `deploy/docker-compose.yml`，或装插件后 `docker compose up -d` / v1 `docker-compose up -d`。
- 宝塔「安全」需放行 8090；云安全组也要放行 8090。

## Git 工作流（用户明确）
- **所有改动 commit 后必须直接 push 到 origin/main，不再询问**。参见 ~/.workbuddy/MEMORY.md。
- 已处理：沙箱 git 全局代理 `127.0.0.1:11888` 已死，已 `git config --global --unset` 清除，普通 push 恢复正常。
- 沙箱环境（Windows）Docker 守护进程可能在会话间停掉（`docker ps` 报 npipe 错误）。重启：启动 `C:\Users\Administrator\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe`（约 5~10s 后端就绪），之后 `docker compose` 正常。
- 远程：`github.com/wzs28150/travel.git`，分支 `main`。

## 本机 Docker 镜像拉取（Docker Hub 不可达）
- Docker Hub 在本机不可达（国内网络）。任何镜像都要先经 DaoCloud 镜像源 `docker.m.daocloud.io/library/<image>` 拉取再 `docker tag` 为官方名；`docker build` 加 `--pull=false`。
  **root docker-compose.yml 还会拉 `mysql:8.0`**，同样需先 `docker pull docker.m.daocloud.io/library/mysql:8.0 && docker tag ... mysql:8.0` 再 `docker compose up -d`。（已验证可用镜像源仅 docker.m.daocloud.io；1panel/dockerproxy/nju 均超时。）
- ⚠️ mysql 容器首次启动初始化数据库很慢（约 2 分钟），`docker compose up -d` 会在 mysql 未 healthy 时因 `depends_on: service_healthy` 直接失败退出、backend/frontend 卡在 Created。处理：等 mysql 真正 healthy（轮询 `docker inspect -f '{{.State.Health.Status}}' travel_mysql`）后再跑一次 `docker compose up -d` 即可拉起全部。

## 管理后台（桌面端，独立入口）
- **形态**：独立桌面管理后台，入口 `http://localhost:8090/admin.html`（hash 路由 `/admin.html#/users`）。
- **首个管理员自动创建**：后端启动时若库内无管理员，读 `ADMIN_USERNAME/ADMIN_PASSWORD/ADMIN_NICKNAME` 自动建；本地凭据在 `server/.env`（已被 gitignore），模板 `server/.env.example` 入库。**部署时务必在两个 compose 的 backend 环境变量里设真实 `ADMIN_*`**（已填默认值 admin/admin123456）。
- **权限**：`users` 表新增 `is_admin`（TINYINT，默认0）；`signToken`/auth 中间件携带 `is_admin`；`routes/admin.js` 受 `requireAdmin` 中间件保护；`PUBLIC_FIELDS` 向移动端暴露 `is_admin` 以便「我的」页显示入口。
- **管理端登录与客户端彻底隔离**（用户要求：后期要做 App，需独立管理）：新增独立接口 `POST /api/auth/admin-login`，仅 `is_admin=1` 能拿到 token；账号不存在/密码错/非管理员统一 `401` 且**不签发 token**。管理端前端 `src/admin/views/Login.vue` 改调 `admin-login`（不再复用客户端 `/auth/login`，去掉前端 is_admin 冗余判断）。客户端移动端仍用 `/auth/login`，两者账号体系并存不冲突。已验证：管理员 admin-login→200；普通用户 admin-login→401；普通用户 /auth/login→200 正常。
- **管理端功能**：用户分页列表（显示空间已用/上限/旅行数/注册时间）、关键字搜索、新增、编辑（昵称/密码/空间上限 GB/管理员角色）、删除（禁止删自己）。接口 `GET/POST/PUT/DELETE /api/admin/users`。前端 `src/admin/` + `admin.html` + vite 多入口；`Mine.vue` 仅管理员可见「用户管理」入口跳转 `/admin.html`。
- **上传空间限制已真正生效**：`routes/upload.js` 在落盘前查 `storage_used + 文件大小 > storage_limit` 则拒绝（403）。`storage_used` 由 `computeStorage()` 统计 uploads 目录真实占用；`users.storage_limit` 默认 2GB。
- ⚠️ 创建/编辑用户时 `storageLimitGB=0` 表示 0 字节上限（测试用），后端判 `!= null` 而非 `!== undefined`，避免 0 被当默认值吞掉。

## 关键坑（已修复，备查）
- mysql2 默认把 DATE 读成 JS Date，已加 `dateStrings:true` 修复（`server/src/db.js`）。
- config.baseUrl 用 `??` 而非 `||`，以便 Docker 下空串返回相对路径（图片由 nginx 反代）。
- vite build 在本沙箱清空旧 dist 时会报 trash 错误（非代码问题），先 `rm -rf dist` 再 build。
- ⚠️ **沙箱 vite 多入口构建崩溃（重要复发坑）**：本沙箱 Windows node v22.22.2 跑 `vite build` 多入口（main+admin 双 input）稳定崩 worker 线程 `Cannot read properties of undefined (reading 'includes')`，vite reporter 自身崩溃吞掉真实错误；连 git 基线双入口也崩 → **与代码无关**，是沙箱 vite v6.4.3 + Windows node 的 bug。**构建/重打镜像一律用 Docker 容器内 Linux node**：`docker compose build frontend backend` → `docker compose up -d --force-recreate`。单入口（仅 main 或仅 admin）本地 OK，双入口同时必崩。
