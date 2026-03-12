#!/bin/bash
# Pclaw 浏览器插件打包脚本

EXTENSION_DIR="$(dirname "$0")/pclaw-extension"
OUTPUT_DIR="$(dirname "$0")/dist"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 打包成ZIP
cd "$EXTENSION_DIR"
zip -r "$OUTPUT_DIR/pclaw-extension.zip" . -x "*.DS_Store"

echo "✅ 插件已打包: $OUTPUT_DIR/pclaw-extension.zip"
echo ""
echo "安装方法:"
echo "1. Chrome/Edge: 打开 chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序"
echo "2. Firefox: 打开 about:debugging#/runtime/this-firefox → 临时加载附加组件"
