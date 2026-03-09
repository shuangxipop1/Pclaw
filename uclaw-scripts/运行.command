#!/bin/bash
# ============================================================
# U-Claw 虾盘 - macOS 一键启动
# 双击此文件即可启动 OpenClaw
# ============================================================

UCLAW_DIR="$(cd "$(dirname "$0")" && pwd)"
OPENCLAW_DIR="$UCLAW_DIR/openclaw"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo ""
echo -e "${CYAN}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║     U-Claw 虾盘 v1.0                ║"
echo "  ║     OpenClaw 一键启动                ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# 检测 CPU 架构
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    NODE_DIR="$UCLAW_DIR/runtime/node-mac-arm64"
    echo -e "  ${GREEN}检测到 Apple Silicon (M系列芯片)${NC}"
else
    NODE_DIR="$UCLAW_DIR/runtime/node-mac-x64"
    echo -e "  ${GREEN}检测到 Intel Mac${NC}"
fi

NODE_BIN="$NODE_DIR/bin/node"
NPM_BIN="$NODE_DIR/bin/npm"

if [ ! -f "$NODE_BIN" ]; then
    echo -e "  ${RED}错误: 找不到 Node.js 运行环境${NC}"
    echo "  请确保 runtime/ 目录完整"
    echo ""
    read -p "  按回车键退出..."
    exit 1
fi

NODE_VER=$("$NODE_BIN" --version)
echo -e "  Node.js 版本: ${GREEN}${NODE_VER}${NC}"
echo ""

export PATH="$NODE_DIR/bin:$PATH"

# 检查依赖
if [ ! -d "$OPENCLAW_DIR/node_modules" ]; then
    echo -e "  ${YELLOW}首次运行，正在安装依赖...${NC}"
    echo "  （使用淘宝镜像，请稍等）"
    echo ""
    cd "$OPENCLAW_DIR"
    "$NODE_BIN" "$NPM_BIN" install --registry=https://registry.npmmirror.com 2>&1
    echo ""
    echo -e "  ${GREEN}依赖安装完成!${NC}"
    echo ""
fi

# 检查构建
if [ ! -d "$OPENCLAW_DIR/dist" ]; then
    echo -e "  ${YELLOW}首次运行，正在构建...${NC}"
    cd "$OPENCLAW_DIR"
    "$NODE_BIN" "$NPM_BIN" run build 2>&1 || true
    echo ""
fi

# 启动 OpenClaw
echo -e "  ${CYAN}正在启动 OpenClaw...${NC}"
echo ""
cd "$OPENCLAW_DIR"
"$NODE_BIN" openclaw.mjs onboard --install-daemon 2>&1 || \
"$NODE_BIN" openclaw.mjs 2>&1 || \
"$NODE_BIN" "$NPM_BIN" start 2>&1

echo ""
echo -e "  ${YELLOW}OpenClaw 已退出${NC}"
read -p "  按回车键关闭窗口..."
