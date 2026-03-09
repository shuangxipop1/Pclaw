# 🦞 U-Claw

**OpenClaw Offline Installer USB — Built for China, Works Everywhere**

**OpenClaw 离线安装 U 盘 — 专为中国用户打造，全球可用**

> Like the legendary [YuLinMuFeng](https://en.wikipedia.org/wiki/Ylmf) Windows discs, but for AI.
> 就像当年的雨林木风，把 AI 助手的安装简化到"插 U 盘，双击运行"。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Why U-Claw? / 为什么需要 U-Claw？

[OpenClaw](https://github.com/openclaw/openclaw) is the most powerful open-source AI assistant framework — 20+ chat platforms, 50+ AI models. But in China, installing it is a nightmare:

[OpenClaw](https://github.com/openclaw/openclaw) 是最强的开源 AI 助手框架，但在中国安装它是个噩梦：

- ❌ GitHub blocked / GitHub 访问不了
- ❌ npm install timeout / npm install 超时
- ❌ Node.js download slow / Node.js 下载慢
- ❌ Dependencies fail / 依赖装不上

**U-Claw solves all of this.** Node.js runtime, OpenClaw source, all npm dependencies, 52 pre-installed skills — everything bundled on a USB drive. Plug in, double-click, done.

**U-Claw 解决所有这些问题。** Node.js + OpenClaw + 所有依赖 + 52个技能，全部打包。插上 U 盘，双击即用。

## Features / 特性

- 🚀 **One-click install / 一键安装** — macOS + Windows, double-click to start
- 📦 **Fully offline / 完全离线** — No internet needed for installation
- 🇨🇳 **China-optimized / 中国优化** — 8 Chinese AI models (DeepSeek, Kimi, Qwen, GLM, MiniMax, Doubao, Qianfan, Mimo)
- 💬 **Multi-platform / 多平台** — QQ (official) / Feishu / WeChat / Telegram / Discord / WhatsApp / Slack
- 🔧 **Maintenance tools / 维护工具** — Diagnose, backup, restore, reset
- 🎯 **52 skills / 52个技能** — Pre-installed productivity skills
- 📖 **Bilingual docs / 双语文档** — Chinese + English

## Quick Start / 快速开始

### Option 1: Download Release / 下载发布版（推荐）

```bash
# Download from Releases / 从 Releases 下载
# https://github.com/dongsheng123132/u-claw/releases

# After extracting / 解压后：
# Mac: double-click "启动菜单.command"
# Win: double-click "启动菜单.bat"
```

### Option 2: Build Your Own / 自己构建

```bash
# Clone this repo / 克隆仓库
git clone https://github.com/dongsheng123132/u-claw.git
cd u-claw

# Download OpenClaw source / 下载 OpenClaw 源码
git clone https://github.com/openclaw/openclaw.git openclaw-2026.3.7

# Build (downloads Node.js + installs deps + builds)
# 构建（自动下载 Node.js + 安装依赖 + 构建）
chmod +x build-uclaw.sh
./build-uclaw.sh

# Copy U-Claw/ folder to USB drive
# 把 U-Claw/ 文件夹复制到 U 盘
```

### Option 3: Copy from a Friend / 复制别人的

Just copy the `U-Claw/` folder. That's it.

直接把 `U-Claw/` 文件夹复制一份就行。

## USB Contents / U 盘内容

```
U-Claw/                            (~1.3GB, 8GB USB minimum)
│
├── 启动菜单.command / .bat         ← Launcher menu (YuLinMuFeng style)
├── 运行.command / .bat             ← Quick start (skip menu)
├── 安装到电脑.command / .bat       ← Install to computer (permanent)
├── 使用说明.txt                    ← Basic instructions
├── 中国用户指南.txt                 ← China quick-start guide
├── 教程-OpenClaw中国区完全指南.md   ← Full tutorial (12 chapters)
│
├── runtime/                        ← Node.js 22 runtimes
│   ├── node-mac-arm64/             ← Mac Apple Silicon (M1-M4)
│   ├── node-mac-x64/               ← Mac Intel
│   └── node-win-x64/               ← Windows 64-bit
│
├── openclaw/                       ← OpenClaw + node_modules + dist
│   ├── skills/                     ← 52 pre-installed skills
│   └── extensions/                 ← 42 channel extensions
│
├── memory/                         ← AI memory (user data)
├── persona/                        ← AI personality config
└── backups/                        ← Auto-created backups
```

## Launcher Menu / 启动菜单

16 functions, inspired by YuLinMuFeng (雨林木风) installer UI:

```
╔════════════════════════════════════════════════════════╗
║     🦞  U-Claw v1.0                                   ║
║     Optimized for China · Offline · One-click          ║
╠════════════════════════════════════════════════════════╣

  ━━ Install ━━
  [1] Install to computer    [2] Install deps
  [3] Build project          [4] Run from USB

  ━━ China Optimization ━━
  [5] Chinese AI models      [6] Chat platforms (QQ/Feishu/WeChat)
  [7] Set China mirror

  ━━ Maintenance ━━
  [8] Diagnose & repair      [9] Backup     [10] Restore
  [11] Reset (3 levels)      [12] Clean cache

  ━━ Skills & Usage ━━
  [13] Browse 52 skills      [14] China user guide
  [15] Instructions          [16] System info
```

## Supported AI Models / 支持的 AI 模型

### Chinese Models (no VPN needed) / 国产模型（无需翻墙）

| Model 模型 | Provider 提供商 | Best for 推荐场景 |
|------------|----------------|-------------------|
| DeepSeek | 深度求索 | Coding, best value / 编程，性价比首选 |
| Kimi K2.5 | 月之暗面 Moonshot | Long docs, 256K context / 长文档 |
| Qwen | 阿里通义千问 | Large free tier / 免费额度大 |
| GLM 4.7 | 智谱AI Zhipu | Academic, Chinese NLP / 学术 |
| MiniMax | MiniMax | Voice, multimodal / 语音 |
| Doubao | 字节豆包 ByteDance | Volcano Engine / 火山引擎 |
| Qianfan | 百度千帆 Baidu | Baidu Cloud / 百度云 |
| Mimo | 小米 Xiaomi | Xiaomi ecosystem / 小米生态 |

### International Models / 国际模型

| Model | Provider | Best for |
|-------|----------|----------|
| Claude | Anthropic | Best overall + coding |
| GPT | OpenAI | Wide compatibility |
| Gemini | Google | Free tier |

## Supported Chat Platforms / 支持的聊天平台

| Platform 平台 | Status 状态 | Notes 说明 |
|---------------|------------|------------|
| QQ | ✅ **Official** 腾讯官方 | 3 commands, 1 min, free / 3条命令搞定 |
| Feishu 飞书 | ✅ Built-in 已内置 | Enterprise best / 企业首选 |
| WeChat 微信 | ✅ Community plugin | iPad protocol |
| Telegram | ✅ Built-in | Recommended for intl users |
| Discord | ✅ Built-in | Gaming / community |
| WhatsApp | ✅ Built-in | International users |
| Slack | ✅ Built-in | Enterprise (intl) |
| WeCom 企业微信 | 🔜 Coming | — |
| DingTalk 钉钉 | 🔜 Coming | — |

### QQ Setup (1 minute) / QQ 接入（1 分钟）

Tencent officially supports OpenClaw QQ bots. 腾讯官方支持：

```bash
# 1. Register / 注册: http://q.qq.com/qqbot/openclaw/login.html
# 2. Create bot, get AppID:AppSecret / 创建机器人

# 3. Run 3 commands / 运行3条命令:
openclaw plugins install @sliverp/qqbot@latest
openclaw channels add --channel qqbot --token "AppID:AppSecret"
openclaw gateway restart

# 4. Set allowlist! / 设置白名单！
openclaw config set channels.qqbot.allowFrom "your_qq_number"
```

## System Requirements / 系统要求

- **macOS**: 12+ (Intel or Apple Silicon)
- **Windows**: 10/11 (64-bit)
- **RAM**: 2GB+ (4GB+ recommended)
- **USB**: 8GB+ (16GB recommended)

## Build Guide / 构建指南

### Prerequisites / 前提

- macOS or Linux (build environment)
- Internet access (only needed for building, not for end users)
- ~2GB disk space

### What the build script does / 构建脚本做了什么

1. Downloads Node.js 22 for 3 platforms (Mac ARM64 + Mac x64 + Win x64), prefers China mirror
2. Copies OpenClaw source to `U-Claw/openclaw/`
3. Runs `npm install` with China mirror (registry.npmmirror.com)
4. Runs `npm run build` to build OpenClaw
5. Copies launcher scripts and docs
6. Output: ~1.3GB ready to copy to USB

### Updating / 更新

```bash
# Download new OpenClaw source, replace openclaw-2026.3.7/
./build-uclaw.sh
# Copy new U-Claw/ to USB
```

## Contributing / 参与贡献

PRs welcome! Especially needed / 欢迎 PR，特别需要：

- 🔧 More platform repair scripts / 更多平台修复脚本
- 📖 Tutorials and guides / 教程
- 💬 More chat bridges (WeCom, DingTalk) / 企业微信、钉钉桥接
- 🎯 Useful skills / 实用技能
- 🌐 Translations / 翻译

```bash
# Fork → Branch → Commit → PR
git checkout -b feature/my-feature
git commit -m "feat: add xxx"
git push origin feature/my-feature
```

## Related Projects / 相关项目

| Project 项目 | Stars | Description 说明 |
|-------------|-------|-----------------|
| [OpenClaw](https://github.com/openclaw/openclaw) | — | The AI assistant framework / AI 助手框架 |
| [hello-claw](https://github.com/datawhalechina/hello-claw) | 90+ | Systematic Chinese tutorial / 体系化中文教程 |
| [openclaw-docs](https://github.com/yeuxuan/openclaw-docs) | 500+ | 276 source-level docs / 源码级文档 |
| [awesome-openclaw-skills-zh](https://github.com/clawdbot-ai/awesome-openclaw-skills-zh) | 2500+ | Chinese skill library / 中文技能库 |
| [NapCatQQ](https://github.com/NapNeko/NapCatQQ) | — | QQ bot framework (OneBot v11) |

## FAQ

**Q: Do end users need a VPN? / 用户需要翻墙吗？**
A: No for installation. Runtime needs internet for AI APIs — Chinese models (DeepSeek etc.) work without VPN.
安装不需要。运行需要联网调 API，国产模型无需翻墙。

**Q: USB drive size? / U 盘要多大？**
A: 8GB minimum, 16GB recommended.

**Q: Can I share it? / 能分发吗？**
A: Yes, unlimited. MIT license, copy freely.
可以，无限制，MIT 协议。

**Q: Windows needs WSL? / Windows 需要 WSL 吗？**
A: No. U-Claw bundles Windows Node.js, runs natively via `.bat`.
不需要。自带 Windows 版 Node.js。

## License

[MIT](LICENSE) — Free to use, modify, distribute.

自由使用、修改、分发。

---

**Made with 🦞 by [dongsheng](https://github.com/dongsheng123132) & OpenClaw Community**

**Website: [u-claw.org](https://u-claw.org)**
