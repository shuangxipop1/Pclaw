#!/bin/bash
# ====================================================================
# Pclaw 一键安装脚本
# Usage: curl -sSL https://raw.githubusercontent.com/shuangxipop1/Pclaw/main/install.sh | bash
# ====================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🦞 Pclaw 安装程序 v1.0                   ║${NC}"
echo -e "${GREEN}║     工程行业AI智能体管理平台                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# 检测操作系统
OS="$(uname -s)"
ARCH="$(uname -m)"

echo -e "${YELLOW}检测到系统: $OS $ARCH${NC}"
echo ""

# 创建安装目录
PCLAW_DIR="$HOME/Pclaw"
mkdir -p "$PCLAW_DIR"

echo -e "${GREEN}正在下载 Pclaw...${NC}"

# 根据系统选择下载
if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        echo "Apple Silicon (M1-M4)"
        # 下载便携版
        echo "请从以下地址下载 macOS 版本："
        echo "https://github.com/shuangxipop1/Pclaw/releases"
    else
        echo "Intel Mac"
        echo "请从以下地址下载 macOS Intel 版本："
        echo "https://github.com/shuangxipop1/Pclaw/releases"
    fi
elif [ "$OS" = "Linux" ]; then
    echo "Linux 系统"
    echo "请使用 Docker 部署："
    echo "git clone https://github.com/shuangxipop1/Pclaw.git"
    echo "cd Pclaw/docker"
    echo "docker-compose up -d"
elif [ "$OS" = "MSYS_NT" ] || [ "$OS" = "MINGW_NT" ]; then
    echo "Windows 系统"
    echo "请从以下地址下载 Windows 版本："
    echo "https://github.com/shuangxipop1/Pclaw/releases"
else
    echo -e "${RED}不支持的系统: $OS${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "安装指引："
echo ""
echo "1. 访问 https://github.com/shuangxipop1/Pclaw/releases"
echo "2. 下载对应平台的安装包"
echo "3. 解压并运行"
echo ""
echo -e "${GREEN}微信：Pclawai（联系我们）${NC}"
echo ""
