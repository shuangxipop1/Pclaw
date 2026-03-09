#!/bin/bash
# ============================================================
# U-Claw 虾盘 构建脚本
# 在你的 Mac 上运行，打包所有依赖到 U-Claw 目录
# 用法: ./build-uclaw.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UCLAW_DIR="$SCRIPT_DIR/U-Claw"
SOURCE_DIR="$SCRIPT_DIR/openclaw-2026.3.7"
NODE_VERSION="22.16.0"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[U-Claw]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "  🦞 U-Claw 虾盘 构建工具"
echo "  ========================"
echo "  OpenClaw 一键安装 U 盘制作"
echo ""

# ---- 1. 创建 U-Claw 目录结构 ----
info "创建 U-Claw 目录结构..."
rm -rf "$UCLAW_DIR"
mkdir -p "$UCLAW_DIR"/{runtime/{node-mac-arm64,node-mac-x64,node-win-x64},openclaw,memory,persona,skills,tools}

# ---- 2. 下载 Node.js 各平台版本 ----
DOWNLOAD_DIR="$SCRIPT_DIR/.download-cache"
mkdir -p "$DOWNLOAD_DIR"

download_node() {
    local PLATFORM=$1  # darwin, win
    local ARCH=$2      # arm64, x64
    local EXT=$3       # tar.gz, zip
    local DEST=$4      # 目标目录名

    local FILENAME="node-v${NODE_VERSION}-${PLATFORM}-${ARCH}"
    local URL="https://nodejs.org/dist/v${NODE_VERSION}/${FILENAME}.${EXT}"
    local CACHED="$DOWNLOAD_DIR/${FILENAME}.${EXT}"

    if [ -f "$CACHED" ]; then
        ok "Node.js ${PLATFORM}-${ARCH} 已缓存"
    else
        info "下载 Node.js ${PLATFORM}-${ARCH}..."
        # 尝试直接下载，如果失败则使用镜像
        if ! curl -fL --connect-timeout 10 -o "$CACHED" "$URL" 2>/dev/null; then
            warn "官方源下载失败，尝试淘宝镜像..."
            local MIRROR_URL="https://npmmirror.com/mirrors/node/v${NODE_VERSION}/${FILENAME}.${EXT}"
            curl -fL -o "$CACHED" "$MIRROR_URL" || error "下载 Node.js ${PLATFORM}-${ARCH} 失败"
        fi
        ok "下载完成: Node.js ${PLATFORM}-${ARCH}"
    fi

    info "解压 Node.js ${PLATFORM}-${ARCH}..."
    if [ "$EXT" = "tar.gz" ]; then
        tar xzf "$CACHED" -C "$UCLAW_DIR/runtime/$DEST/" --strip-components=1
    elif [ "$EXT" = "zip" ]; then
        # Windows zip
        local TMP_UNZIP="$DOWNLOAD_DIR/tmp-unzip-$$"
        mkdir -p "$TMP_UNZIP"
        unzip -q "$CACHED" -d "$TMP_UNZIP"
        cp -R "$TMP_UNZIP"/${FILENAME}/* "$UCLAW_DIR/runtime/$DEST/"
        rm -rf "$TMP_UNZIP"
    fi
    ok "Node.js ${PLATFORM}-${ARCH} 就绪"
}

# 下载三个平台的 Node.js
download_node "darwin" "arm64" "tar.gz" "node-mac-arm64"    # Mac Apple Silicon
download_node "darwin" "x64"   "tar.gz" "node-mac-x64"      # Mac Intel
download_node "win"    "x64"   "zip"    "node-win-x64"      # Windows x64

# ---- 3. 复制 OpenClaw 源码 ----
info "复制 OpenClaw 源码..."
rsync -a --exclude='.git' --exclude='node_modules' --exclude='.github' \
    "$SOURCE_DIR/" "$UCLAW_DIR/openclaw/"
ok "OpenClaw 源码复制完成"

# ---- 4. 安装依赖 (使用淘宝镜像) ----
info "安装 npm 依赖（使用淘宝镜像）..."

# 使用 U-Claw 自带的 Node.js 来安装
if [ "$(uname -m)" = "arm64" ]; then
    NODE_BIN="$UCLAW_DIR/runtime/node-mac-arm64/bin/node"
    NPM_BIN="$UCLAW_DIR/runtime/node-mac-arm64/bin/npm"
else
    NODE_BIN="$UCLAW_DIR/runtime/node-mac-x64/bin/node"
    NPM_BIN="$UCLAW_DIR/runtime/node-mac-x64/bin/npm"
fi

cd "$UCLAW_DIR/openclaw"

# 设置淘宝镜像
"$NODE_BIN" "$NPM_BIN" config set registry https://registry.npmmirror.com --location=project 2>/dev/null || true

# 安装依赖
info "npm install 中...（可能需要几分钟）"
"$NODE_BIN" "$NPM_BIN" install --registry=https://registry.npmmirror.com --prefer-offline 2>&1 | tail -5

ok "npm 依赖安装完成"

# ---- 5. 构建 OpenClaw ----
info "构建 OpenClaw..."
# 检查是否有 pnpm 可用，OpenClaw 使用 pnpm build
if [ -f "$UCLAW_DIR/openclaw/node_modules/.bin/tsdown" ]; then
    # 尝试简单构建
    cd "$UCLAW_DIR/openclaw"
    "$NODE_BIN" "$NPM_BIN" run build 2>&1 | tail -10 || warn "build 可能有错误，继续..."
fi
ok "构建步骤完成"

cd "$SCRIPT_DIR"

# ---- 6. 复制用户脚本和说明 ----
info "复制用户脚本..."

# 从 scripts 模板目录复制（构建脚本同级的 uclaw-scripts/ 目录）
SCRIPTS_SRC="$SCRIPT_DIR/uclaw-scripts"
if [ -d "$SCRIPTS_SRC" ]; then
    cp "$SCRIPTS_SRC/运行.command" "$UCLAW_DIR/" 2>/dev/null || true
    cp "$SCRIPTS_SRC/运行.bat" "$UCLAW_DIR/" 2>/dev/null || true
    cp "$SCRIPTS_SRC/安装到电脑.command" "$UCLAW_DIR/" 2>/dev/null || true
    cp "$SCRIPTS_SRC/安装到电脑.bat" "$UCLAW_DIR/" 2>/dev/null || true
    cp "$SCRIPTS_SRC/使用说明.txt" "$UCLAW_DIR/" 2>/dev/null || true
    chmod +x "$UCLAW_DIR/运行.command" "$UCLAW_DIR/安装到电脑.command" 2>/dev/null || true
    ok "用户脚本已复制"
else
    warn "找不到 uclaw-scripts/ 目录，请手动复制脚本到 U-Claw/"
fi

# ---- 7. 计算大小 ----
echo ""
echo "  ============================================"
info "U-Claw 构建完成!"
echo ""
TOTAL_SIZE=$(du -sh "$UCLAW_DIR" | cut -f1)
echo "  总大小: $TOTAL_SIZE"
echo ""
du -sh "$UCLAW_DIR"/runtime/node-mac-arm64 2>/dev/null | awk '{print "  Node.js Mac ARM64:  "$1}'
du -sh "$UCLAW_DIR"/runtime/node-mac-x64 2>/dev/null | awk '{print "  Node.js Mac x64:    "$1}'
du -sh "$UCLAW_DIR"/runtime/node-win-x64 2>/dev/null | awk '{print "  Node.js Win x64:    "$1}'
du -sh "$UCLAW_DIR"/openclaw 2>/dev/null | awk '{print "  OpenClaw + 依赖:    "$1}'
echo ""
echo "  将 U-Claw 文件夹整个复制到 U 盘即可"
echo "  ============================================"
echo ""
