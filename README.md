# 🦞 Pclaw

**工程行业AI智能体管理平台**

**Engineering AI Agent Management Platform**

> 基于 OpenClaw 构建的下一代 AI 助手管理平台
> Next-gen AI Assistant Management Platform built on OpenClaw

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 关于 Pclaw

Pclaw 是专为工程行业设计的 AI 智能体管理平台，基于 OpenClaw 框架构建，提供原生客户端、Docker 部署和浏览器插件等多种使用方式。

**特性：**
- 🌐 原生客户端支持（macOS / Windows）
- 🐳 Docker 一键部署
- 🔌 浏览器插件扩展
- 💬 多种通信渠道支持（QQ、Telegram、飞书等）

---

## 快速开始

### 客户端下载

从 [Releases](https://github.com/shuangxipop1/Pclaw/releases) 下载对应平台的安装包：

- **macOS**: `.dmg` 磁盘镜像
- **Windows**: `.exe` 安装程序

### Docker 部署

```bash
docker-compose up -d
```

### 浏览器插件

Chrome/Edge: `chrome://extensions/` → 开启开发者模式 → 加载已解压的扩展程序

---

## 项目结构

```
Pclaw/
├── portable/          # 原生客户端
├── website/           # 官网前端
├── docs/              # 文档
└── uclaw-scripts/    # 脚本工具
```

---

## 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 相关链接

- [OpenClaw 官网](https://openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
