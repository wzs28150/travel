# ---- 构建阶段 ----
FROM node:22-alpine AS build

WORKDIR /app

ENV npm_config_registry=https://registry.npmmirror.com

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM nginx:alpine

# 用相对路径 /api、/uploads 反代到后端容器
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
