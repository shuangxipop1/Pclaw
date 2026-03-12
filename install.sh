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
cd "$PCLAW_DIR"

# 根据系统选择下载
RELEASE_URL="https://github.com/shuangxipop1/Pclaw/releases/download/v1.0.0"

echo -e "${GREEN}正在下载 Pclaw 便携版...${NC}"

if [ "$OS" = "Darwin" ]; then
    if [ "$ARCH" = "arm64" ]; then
        echo "下载 macOS Apple Silicon 版本..."
        curl -L -o Pclaw.zip "$RELEASE_URL/Pclaw-Portable-macOS.zip"
    else
        echo "下载通用便携版..."
        curl -L -o Pclaw.zip "$RELEASE_URL/Pclaw-Portable-Full.zip"
    fi
elif [[ "$OS" == "MINGW_NT"* ]] || [[ "$OS" == "MSYS_NT"* ]; then
    echo "下载 Windows 便携版..."
    curl -L -o Pclaw.zip "$RELEASE_URL/Pclaw-Portable-Full.zip"
elif [ "$OS" = "Linux" ]; then
    echo "下载 Linux 便携版..."
    curl -L -o Pclaw.zip "$RELEASE_URL/Pclaw-Portable-Full.zip"
else
    echo -e "${RED}不支持的系统: $OS${NC}"
    exit 1
fi

echo -e "${GREEN}解压文件...${NC}"
unzip -q Pclaw.zip
rm -f Pclaw.zip

echo -e "${GREEN}完成！${NC}"
echo ""
echo "下一步："
echo ""
if [ "$OS" = "Darwin" ]; then
    echo "1. 在终端运行: cd $PCLAW_DIR/pclaw-portable"
    echo "2. 运行: ./setup.sh"
    echo "3. 双击 Mac-Start.command 启动"
elif [[ "$OS" == "MINGW_NT"* ]] || [[ "$OS" == "MSYS_NT"* ]]; then
    echo "1. 进入 $PCLAW_DIR\\pclaw-portable 目录"
    echo "2. 双击 setup.bat"
    echo "3. 双击 Windows-Start.bat 启动"
fi
echo ""
echo "详细说明请阅读: README.txt"
echo ""
