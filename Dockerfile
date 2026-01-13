# ========== 阶段1: 构建 Go 后端 ==========
FROM golang:1.24-alpine AS go-builder

# 设置工作目录
WORKDIR /app/backend

# 设置环境变量
ENV GO111MODULE=on
ENV GOPROXY=https://goproxy.cn,direct

# 复制 go mod 文件（路径改为 backend-go）
COPY backend-go/go.mod backend-go/go.sum ./

# 下载依赖
RUN go mod download

# 复制后端源代码（路径改为 backend-go）
COPY backend-go/ .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# ========== 阶段2: 构建 Node.js 前端 ==========
FROM node:25.2.1 AS node-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

# 复制前端源代码
COPY frontend/ .

# 构建前端应用
RUN npm run build

# ========== 阶段3: 最终运行镜像 ==========
FROM alpine:latest

# 安装必要依赖（nginx、ca-certificates 等）
RUN apk --no-cache add \
    ca-certificates \
    wget \
    curl \
    nginx \
    bash

# ========== 配置 Nginx ==========
# 创建 Nginx 必要目录（root 用户无需改权限）
RUN mkdir -p /etc/nginx/conf.d /var/log/nginx /var/run/nginx

# 复制 Nginx 配置文件
COPY nginx.conf /etc/nginx/nginx.conf

# ========== 复制构建产物 ==========
# 复制后端二进制文件
COPY --from=go-builder /app/backend/main /app/backend/main
# 添加执行权限
RUN chmod +x /app/backend/main

# 复制前端静态文件
COPY --from=node-builder /app/frontend/dist /usr/share/nginx/html

# ========== 准备启动脚本 ==========
# 创建启动脚本
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'echo "启动后端服务..."' >> /app/start.sh && \
    echo '/app/backend/main &' >> /app/start.sh && \
    echo 'echo "启动 Nginx..."' >> /app/start.sh && \
    echo 'nginx -g "daemon off;"' >> /app/start.sh && \
    chmod +x /app/start.sh

# 暴露端口
EXPOSE 3002

# 运行启动脚本（默认 root 用户）
CMD ["/app/start.sh"]