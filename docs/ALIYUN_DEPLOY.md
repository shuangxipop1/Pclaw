# Pclaw 阿里云部署指南

## 一、服务器购买

### 1.1 选择配置

| 配置项 | 推荐 |
|--------|------|
| 服务器 | 阿里云 ECS |
| 规格 | 2核4G起 |
| 系统 | Ubuntu 22.04 LTS |
| 带宽 | 5M起 |
| 存储 | 40G SSD |

### 1.2 开放端口

```
安全组规则:
- 80    (HTTP)
- 443   (HTTPS)
- 22    (SSH)
- 3000  (Pclaw API)
```

---

## 二、连接服务器

```bash
ssh root@你的服务器IP
```

---

## 三、一键部署脚本

在服务器上执行:

```bash
# 1. 下载部署脚本
curl -fsSL https://raw.githubusercontent.com/pclaw/pclaw/main/scripts/deploy-aliyun.sh -o deploy.sh
chmod +x deploy.sh

# 2. 运行部署
./deploy.sh
```

---

## 四、手动部署

### 4.1 安装Docker

```bash
# 更新系统
apt update && apt upgrade -y

# 安装Docker
curl -fsSL https://get.docker.com | sh

# 启动Docker
systemctl start docker
systemctl enable docker

# 安装Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 4.2 部署Pclaw

```bash
# 1. 克隆项目
git clone https://github.com/pclaw/pclaw.git
cd pclaw/docker

# 2. 配置环境变量
cp ../.env.example .env
nano .env

# 关键配置:
# secretKey=your-production-secret-key
# DOMAIN=your-domain.com

# 3. 构建镜像
docker-compose build

# 4. 启动服务
docker-compose up -d

# 5. 查看状态
docker-compose ps
docker-compose logs -f
```

---

## 五、域名配置

### 5.1 购买域名

访问阿里云万网购买域名: https://wanwang.aliyun.com

### 5.2 配置DNS解析

```
类型: A记录
主机: @ 或 www
值: 你的服务器IP
```

### 5.3 申请SSL证书

1. 阿里云免费SSL: https://yundun.console.aliyun.com
2. 下载证书
3. 配置Nginx

---

## 六、Nginx SSL配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://pclaw-cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 七、验证部署

```bash
# 检查服务状态
curl https://your-domain.com/api/task

# 检查Docker容器
docker ps

# 查看日志
docker-compose logs -f
```

---

## 八、运维命令

```bash
# 重启服务
docker-compose restart

# 更新部署
git pull
docker-compose build
docker-compose up -d

# 备份数据
docker-compose stop
tar -czvf pclaw-backup.tar.gz data/
docker-compose start

# 查看日志
docker-compose logs -f --tail=100
```

---

## 九、监控

### 9.1 阿里云监控

- 云监控: https://cloudmonitor.console.aliyun.com
- 设置告警: CPU > 80%, 内存 > 85%, 磁盘 > 90%

### 9.2 日志服务

- 配置阿里云SLS日志收集

---

## 十、安全加固

```bash
# 1. 防火墙
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable

# 2. Fail2Ban (防暴力破解)
apt install fail2ban

# 3. 定期更新
apt update && apt upgrade -y
```

---

## 十一、常见问题

### Q1: 端口被占用?
```bash
lsof -i:3000
kill -9 <PID>
```

### Q2: Docker启动失败?
```bash
docker-compose logs
docker system prune
```

### Q3: SSL证书无效?
- 检查域名DNS是否生效: ping your-domain.com
- 确认证书路径正确

---

## 十二、技术支持

- 官网: https://pclaw.ai
- 文档: https://docs.pclaw.ai
- Discord: https://discord.gg/pclaw

---

*部署版本: v1.0.0*
*日期: 2026-03-15*
