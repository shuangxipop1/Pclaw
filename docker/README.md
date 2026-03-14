# 🦞 Pclaw 部署指南

## 系统要求

- Ubuntu 20.04+ / Debian 11+
- Docker 20.10+
- Docker Compose 2.0+
- 2GB+ RAM
- 10GB+ 磁盘空间

## 快速部署

```bash
# 1. 进入部署目录
cd pclaw/docker

# 2. 启动服务 (首次构建)
docker-compose up -d --build

# 3. 查看状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f

# 5. 停止服务
docker-compose down
```

## 扩展集群

```bash
# 添加更多Pclaw实例
# 编辑 docker-compose.yml 添加 pclaw-3, pclaw-4...

# 重新启动
docker-compose up -d --build
```

## 本地开发

```bash
# 不使用Docker，直接运行
cd pclaw
npm install
NODE_ENV=production node server.js
```

## 访问

- 管理界面: http://localhost:3000
- API: http://localhost:3000/api/

## AI Agent接入

```python
from pclaw_agent import PclawAgent

agent = PclawAgent('http://localhost:3000')
result = agent.run('分析代码质量')
```

## 配置SSL (可选)

```bash
# 1. 获取SSL证书
# 使用Let's Encrypt:
certbot certonly -d pclaw.yourdomain.com

# 2. 复制证书到nginx/ssl/
cp /etc/letsencrypt/live/pclaw.yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/pclaw.yourdomain.com/privkey.pem nginx/ssl/key.pem

# 3. 启用HTTPS (编辑nginx.conf取消注释HTTPS server块)

# 4. 重启
docker-compose restart nginx
```
