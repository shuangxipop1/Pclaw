# 🦞 Pclaw

**工程行业AI智能体管理平台**

**Engineering AI Agent Management Platform**

> 基于 OpenClaw 构建的下一代 AI 助手管理平台，专为工程建设行业打造
> Next-gen AI Assistant Management Platform built on OpenClaw for Engineering Industry

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 关于 Pclaw

Pclaw 是专为工程行业设计的 AI 智能体管理平台，基于 OpenClaw 框架构建，提供原生客户端、Docker 部署和浏览器插件等多种使用方式。

### 核心特性

- 🌐 **原生客户端** - macOS / Windows dmg/exe 安装包，便捷安装
- 🐳 **Docker 部署** - 一键部署，企业级容器化方案
- 🔌 **浏览器插件** - 侧边栏快速调用，随时随地使用
- 🏗️ **项目管理** - 工程行业专用项目管理系统
- 💬 **多渠道接入** - QQ、Telegram、飞书等多种通信渠道

---

## 快速开始

### 方式一：客户端安装（推荐）

从 [Releases](https://github.com/shuangxipop1/Pclaw/releases) 下载对应平台的安装包：

| 平台 | 安装包 | 说明 |
|------|--------|------|
| macOS | `.dmg` | Apple Silicon (M1-M4) |
| Windows | `.exe` | NSIS 安装程序 |

### 方式二：便携版

```bash
# 下载 portable 版本
# Mac: 双击 Mac-Start.command
# Windows: 双击 Windows-Start.bat
```

### 方式三：Docker 部署

```bash
git clone https://github.com/shuangxipop1/Pclaw.git
cd Pclaw/docker
docker-compose up -d
```

**服务地址：**
- Gateway: `http://localhost:19001`
- Web UI: `http://localhost:8080`

### 方式四：浏览器插件

```bash
# 下载 pclaw-extension.zip
# Chrome/Edge: chrome://extensions/ → 开启开发者模式 → 加载已解压的扩展程序
```

---

## 工程行业项目管理

Pclaw 内置工程行业项目管理模块，适用于：

- 🛥️ **船舶工程** - 船舶设计、建造、改装
- 🌊 **海洋工程** - 海上平台、海底管道
- 🏗️ **陆地设施** - 工厂、建筑、EPC 项目
- 📐 **设计咨询** - 工程设计、项目管理

### 项目组织架构

```
项目经理
    ├── 设计经理     → 设计进度/质量管控
    ├── 采购经理     → 供应商/物资采购
    ├── 施工经理     → 现场管理/安全
    ├── 控制经理     → 进度/变更/风险
    ├── 费控经理     → 费用预算/成本
    ├── 财务经理     → 资金/付款
    ├── 文控经理     → 文档/档案
    └── 商务经理     → 市场/招投标
```

### 项目文件夹体系

| 类别 | 文件夹 |
|------|--------|
| 管理类 | 项目进度管理、变更管理、文档管理、质量管理、安全管理 |
| 技术类 | 设计规范、船级社(ABS/DNV/CCS)、标准规范(GB/ISO/API)、行业最佳实践经验 |
| 商务类 | 供应商寻源、历史合同、经验教训、项目招投标信息、行业新闻 |

---

## 已有 OpenClaw 用户安装

### 方案 A：技能包方式（推荐）

在已有 OpenClaw 上安装 Pclaw 技能包：

```bash
# 安装 Pclaw 工程行业技能包
openclaw skill install pclaw-skills
```

- 不替换原有安装，叠加 Pclaw 特性
- 保留原有配置和历史数据

### 方案 B：数据迁移

1. 下载 Pclaw 便携版或安装包
2. 配置数据目录指向原 OpenClaw 数据
3. 自动迁移配置和历史

---

## 项目结构

```
Pclaw/
├── portable/          # 便携版客户端
├── website/           # 官网前端
├── docker/            # Docker 部署配置
├── extension/         # 浏览器插件
├── docs/              # 项目文档
│   └── PROJECT_MANAGEMENT.md  # 项目管理模块说明
└── uclaw-scripts/    # 脚本工具
```

---

## 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 相关链接

- [OpenClaw 官网](https://openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [U-Claw 原版](https://github.com/dongsheng123132/u-claw)

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

