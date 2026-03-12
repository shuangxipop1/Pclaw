# 🦞 Pclaw

**工程行业AI智能体管理平台**

**Engineering AI Agent Management Platform**

> 基于 OpenClaw 构建的下一代 AI 助手管理平台，专为工程建设行业打造

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 关于 Pclaw

Pclaw 是专为工程行业设计的 AI 智能体管理平台，基于 OpenClaw 框架构建，提供原生客户端、Docker 部署和浏览器插件等多种使用方式。

### 设计理念

每个运行 Pclaw 的机器背后都有一个人，这个人是为 Pclaw 的产出负责的，是属于真实架构中的一份子，需受组织管理的约束与管理。

---

## 核心特性

### 一、多种部署形态

| 形态 | 说明 |
|------|------|
| **客户端** | dmg / exe 安装包，Pclaw 自有 UI |
| **便携版** | 解压即用，继承 u-claw 设计理念 |
| **安装脚本** | 一键导入安装脚本 |
| **Docker** | docker-compose 一键部署 |
| **浏览器插件** | Chrome/Edge 侧边栏 |

### 二、工程行业专用功能

| 模块 | 说明 |
|------|------|
| **项目管理** | 9大专业经理 + 项目文件夹体系 |
| **组织连接** | 上下级 Pclaw 汇报关系 + 审批流 |
| **HR组织架构** | 授权查看组织图 |
| **报酬核算** | 对下级工作评估，KPI 报价（可选） |

### 三、数据隔离架构

```
Pclaw/
├── app/                    # 软件（可升级）
│   ├── core/              # OpenClaw 核心
│   ├── runtime/           # Node.js 运行时
│   └── ui/                # Pclaw 客户端 UI
├── data/                   # 用户数据（配置、历史）
├── pclaw-data/            # Pclaw 专属数据
│   ├── org/              # 组织架构
│   ├── hr/               # HR 数据
│   ├── reports/          # 汇报文件
│   └── compensation/      # 报酬核算
└── system/                # 升级脚本
```

### 四、升级机制

- 三层目录隔离，软件/用户数据/Pclaw数据完全分离
- 模块化升级（core/runtime/skills 单独升级）
- 热插拔支持
- 启动时自动检查更新，用户确认后安装

---

## 项目组织架构

### 9大专业经理

| 角色 | 职责 |
|------|------|
| 项目经理 | 全面负责项目对接、统筹协调 |
| 设计经理 | 设计进度/质量管控 |
| 采购经理 | 供应商管理、物资采购 |
| 施工经理 | 现场管理、施工进度 |
| 控制经理 | 进度管理、变更管理 |
| 费控经理 | 费用预算、成本分析 |
| 财务经理 | 资金管理、付款审核 |
| 文控经理 | 文档收发、档案管理 |
| 商务经理 | 市场对接、招投标 |

### 项目文件夹体系

| 类别 | 文件夹 |
|------|--------|
| 管理类 | 项目进度管理、变更管理、文档管理、质量管理、安全管理 |
| 技术类 | 设计规范、船级社(ABS/DNV/CCS)、标准规范、行业最佳实践 |
| 商务类 | 供应商寻源、历史合同、经验教训、招投标信息 |

---

## 组织连接功能

### 上下级关系

- 每个 Pclaw 可连接多个上级 Pclaw
- 每个 Pclaw 可连接多个下级 Pclaw
- 上级可查询下级工作汇报文件夹

### 汇报审批流程

1. 下级创建汇报内容 → 2. 进入待审批文件夹 → 3. 用户审批 → 4. 归档到正式文件夹

---

## 报酬核算功能（可选）

### 核心功能

- 对下级 Pclaw 的工作进行评估
- 核算应付报酬
- 下级连接时提供基础报价及交付标准（KPI）

### KPI 维度

| 维度 | 说明 |
|------|------|
| 交付质量 | 成果完整性、准确性 |
| 交付时间 | 按时/提前/延迟 |
| 工作量 | 任务数量、难度 |
| 客户满意度 | 上级评价 |

---

## 快速开始

### 客户端安装

从 [Releases](https://github.com/shuangxipop1/Pclaw/releases) 下载：

- **macOS**: `.dmg` 磁盘镜像
- **Windows**: `.exe` 安装程序
- **便携版**: `.tar.gz` 解压即用
- **安装脚本**: 一键导入

### Docker 部署

```bash
git clone https://github.com/shuangxipop1/Pclaw.git
cd Pclaw/docker
docker-compose up -d
```

### 浏览器插件

Chrome/Edge: `chrome://extensions/` → 开启开发者模式 → 加载已解压的扩展程序

---

## 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 相关链接

- [OpenClaw 官网](https://openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)
- [U-Claw 原版](https://github.com/dongsheng123132/u-claw)
