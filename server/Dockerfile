# 旅迹后端 - Node 运行镜像
FROM node:22-alpine

WORKDIR /app

# 优先使用国内镜像加速依赖安装
ENV npm_config_registry=https://registry.npmmirror.com

# 仅安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev

# 复制源码（node_modules/.env/uploads 由 .dockerignore 排除）
COPY . .

# 确保上传目录存在
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "src/index.js"]
