#!/bin/bash
# Pclaw 阿里云一键部署脚本

set -e

echo "🦞 Pclaw 阿里云部署脚本"
echo "============================"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查root权限
if [[ $EUID -ne 0 ]]; then
   log_error "请使用root用户运行: sudo $0"
   exit 1
fi

# 1. 更新系统
log_info "更新系统..."
apt update && apt upgrade -y

# 2. 安装Docker
log_info "安装Docker..."
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 3. 安装Docker Compose
log_info "安装Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 4. 克隆项目
log_info "克隆Pclaw项目..."
cd /opt
git clone https://github.com/pclaw/pclaw.git
cd pclaw/docker

# 5. 配置环境变量
log_info "配置环境变量..."
cp ../.env.example .env

# 6. 构建镜像
log_info "构建Docker镜像..."
docker-compose build

# 7. 启动服务
log_info "启动服务..."
docker-compose up -d

# 8. 完成
echo ""
echo "============================"
log_info "部署完成!"
echo ""
echo "访问地址:"
echo "  - HTTP: http://你的服务器IP"
echo "  - API: http://你的服务器IP/api/task"
echo ""
echo "管理命令:"
echo "  - 查看日志: docker-compose logs -f"
echo "  - 重启: docker-compose restart"
echo "  - 停止: docker-compose stop"
echo ""
echo "后续配置:"
echo "  1. 购买域名并配置DNS"
echo "  2. 申请SSL证书"
echo "  3. 配置HTTPS"
echo ""
echo "详见: docs/ALIYUN_DEPLOY.md"
echo "============================"
