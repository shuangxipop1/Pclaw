# Pclaw Docker 镜像构建文件
# 构建命令: docker build -t pclaw:latest .
# 运行命令: docker run -d -p 19001:19001 -v pclaw-data:/data pclaw:latest

FROM node:20-alpine

# 安装必要工具
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

# 设置工作目录
WORKDIR /app

# 全局安装 OpenClaw
RUN npm install -g openclaw@latest

# 创建数据目录
RUN mkdir -p /data && chown -R node:node /data

# 设置环境变量
ENV OPENCLAW_DATA_DIR=/data
ENV NODE_ENV=production

# 暴露端口
EXPOSE 19001

# 启动命令
CMD ["sh", "-c", "openclaw gateway start"]
