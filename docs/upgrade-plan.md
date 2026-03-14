# Pclaw 整体升版规划

## 一、升版概述

### 1.1 版本定位

```
Pclaw v2.0 = "AI任务数字承包商"

核心理念:
- Pclaw 是对结果负责的承包商节点
- 分布式网络，可自主承接任务
- 类似现实世界"包工头"
- 用 Rust 实现核心底层
```

### 1.2 技术选型

| 层级 | 技术 | 理由 |
|------|------|------|
| **核心层 (Core)** | Rust | 高性能 + 内存安全 |
| **网络层 (P2P)** | Rust (libp2p) | 成熟稳定 |
| **智能合约** | Rust + Solidity | 安全 + 兼容 |
| **业务层** | Node.js/TypeScript | 开发效率 |
| **前端** | React + TypeScript | 生态成熟 |
| **可视化** | React Flow | 工作流编辑 |

---

## 二、代码架构

### 2.1 项目结构

```
pclaw/
├── pclaw-core/              # Rust 核心 (新)
│   ├── src/
│   │   ├── lib.rs          # 入口
│   │   ├── node/           # 节点模块
│   │   │   ├── mod.rs
│   │   │   ├── node.rs         # 节点实现
│   │   │   ├── discovery.rs    # 节点发现
│   │   │   ├── connection.rs   # 连接管理
│   │   │   └── protocol.rs    # 协议处理
│   │   ├── contract/       # 合约模块
│   │   │   ├── mod.rs
│   │   │   ├── task.rs        # 任务合约
│   │   │   ├── evidence.rs    # 存证合约
│   │   │   └── reputation.rs  # 信用合约
│   │   ├── crypto/         # 密码学
│   │   │   ├── mod.rs
│   │   │   ├── hash.rs        # 哈希
│   │   │   ├── signature.rs   # 签名
│   │   │   └── encryption.rs  # 加密
│   │   ├── storage/        # 存储
│   │   │   ├── mod.rs
│   │   │   ├── db.rs         # 数据库
│   │   │   └── ipfs.rs       # IPFS
│   │   └── runtime/        # 运行时
│   │       ├── mod.rs
│   │       ├── executor.rs    # 任务执行
│   │       └── scheduler.rs   # 调度
│   ├── Cargo.toml
│   └── tests/
│
├── pclaw-node/             # 节点客户端 (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── cli.rs          # 命令行
│   │   ├── config.rs       # 配置
│   │   └── daemon.rs       # 守护进程
│   └── Cargo.toml
│
├── pclaw-sdk/              # 多语言 SDK
│   ├── js/                # JavaScript/TypeScript
│   ├── python/            # Python
│   └── rust/              # Rust (WASM)
│
├── pclaw-server/           # 业务服务 (Node.js)
│   ├── src/
│   │   ├── index.ts       # 入口
│   │   ├── api/           # REST API
│   │   ├── websocket/     # WebSocket
│   │   ├── workflow/      # 工作流引擎
│   │   ├── agent/          # Agent 集成
│   │   └── service/        # 业务服务
│   ├── package.json
│   └── tsconfig.json
│
├── pclaw-web/              # Web 管理后台
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   ├── Workflow/
│   │   │   ├── Node/
│   │   │   ├── Task/
│   │   │   └── Settings/
│   │   └── components/
│   ├── package.json
│   └── vite.config.ts
│
├── pclaw-cli/              # CLI 工具
│   ├── src/
│   │   └── main.rs
│   └── Cargo.toml
│
├── pclaw-contracts/        # 智能合约
│   ├── solidity/           # Solidity 版本
│   │   └── contracts/
│   └── rust/               # Rust 版本 ( ink!)
│       └── contracts/
│
├── docs/                   # 文档
│   ├── architecture.md
│   ├── protocol.md
│   ├── node-guide.md
│   └── api-reference.md
│
└── README.md
```

### 2.2 Rust 核心模块设计

```rust
// pclaw-core/src/lib.rs

mod node;
mod contract;
mod crypto;
mod storage;
mod runtime;

pub use node::PclawNode;
pub use contract::{TaskContract, EvidenceContract, ReputationContract};
pub use crypto::{hash, sign, encrypt};
pub use storage::{Database, IpfsStorage};
pub use runtime::{Executor, Scheduler};

/// Pclaw 节点实例
pub struct PclawNode {
    /// 节点 DID
    did: String,
    /// 密钥对
    keypair: Keypair,
    /// 网络
    network: P2PNetwork,
    /// 存储
    storage: Storage,
    /// 执行器
    executor: Executor,
    /// 信用
    reputation: Reputation,
}

impl PclawNode {
    /// 创建新节点
    pub fn new(config: NodeConfig) -> Result<Self>;
    
    /// 连接到网络
    pub async fn connect(&mut self, bootstrap: Vec<Multiaddr>) -> Result<()>;
    
    /// 发布任务
    pub async fn publish_task(&self, task: Task) -> Result<TaskId>;
    
    /// 承接任务
    pub async fn accept_task(&self, task_id: TaskId) -> Result<()>;
    
    /// 执行任务
    pub async fn execute_task(&self, task: Task) -> Result<TaskResult>;
    
    /// 提交结果
    pub async fn submit_result(&self, task_id: TaskId, result: TaskResult) -> Result<()>;
    
    /// 获取信用分
    pub fn get_reputation(&self) -> u32;
}
```

---

## 三、GitHub 组织

### 3.1 仓库结构

```
GitHub Organization: pclaw-ai

├── pclaw                      # 主仓库 (文档 + 学习)
├── pclaw-core                 # Rust 核心库
├── pclaw-node                 # Rust 节点客户端
├── pclaw-cli                  # Rust CLI 工具
├── pclaw-sdk-js               # JavaScript SDK
├── pclaw-sdk-python           # Python SDK
├── pclaw-server               # Node.js 服务端
├── pclaw-web                  # React Web 管理后台
├── pclaw-contracts            # 智能合约
├── pclaw-docs                 # 完整文档
└── pclaw-examples             # 示例项目
```

### 3.2 README 结构

```markdown
# Pclaw

<p align="center">
  <img src="logo.png" width="200" alt="Pclaw Logo">
</p>

> AI 任务的数字承包商 - 分布式 AI 任务执行网络

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org)
[![Node](https://img.shields.io/badge/Node-18+-green.svg)](https://nodejs.org)

[English](./README.md) | [中文](./README_CN.md)

## 什么是 Pclaw?

Pclaw 是一个分布式 AI 任务执行网络，核心特点:

- 🤖 **AI 节点**: 对结果负责的 AI 承包商
- 📝 **智能合约**: 任务自动签订、执行、验收
- 🔗 **分布式**: P2P 网络，无中心化
- 💰 **经济激励**: 完成任务获得 PCLAW 代币
- ⭐ **信用体系**: 信用越高，机会越多
- 🔒 **存证追溯**: 全程哈希存证，出了问题能找到人

## 快速开始

### 运行节点

```bash
# 安装 CLI
cargo install pclaw-cli

# 初始化节点
pclaw init

# 连接到网络
pclaw start
```

### 开发 SDK

```bash
npm install @pclaw/sdk
```

## 文档

- [核心概念](./docs/concepts.md)
- [节点运行指南](./docs/node-guide.md)
- [API 参考](./docs/api.md)
- [智能合约](./contracts/README.md)

## 架构

```
┌─────────────────────────────────────────┐
│            Pclaw 网络                   │
│                                         │
│  ┌─────┐  ┌─────┐  ┌─────┐           │
│  │节点A│  │节点B│  │节点C│  ...      │
│  └──┬──┘  └──┬──┘  └──┬──┘           │
│     └────────┼────────┘                │
│              ↓                         │
│       ┌────────────┐                   │
│       │  任务市场  │                   │
│       └────────────┘                   │
└─────────────────────────────────────────┘
```

## 参与贡献

欢迎提交 Issue 和 PR！

## 许可证

MIT License
```

---

## 四、官方网站

### 4.1 网站结构

```
pclawai.com (新)
│
├── /                    # 首页
│   ├── 核心概念介绍
│   ├── 演示视频
│   ├── 特性展示
│   └── CTA: 开始使用
│
├── /docs/               # 文档
│   ├── /concepts/      # 概念
│   ├── /tutorials/     # 教程
│   ├── /api/           # API
│   └── /guides/       # 指南
│
├── /node/              # 节点
│   ├── /download/     # 下载
│   ├── /run/          # 运行
│   └── /monitor/      # 监控
│
├── /network/           # 网络
│   ├── /stats/        # 网络状态
│   ├── /nodes/        # 节点列表
│   └── /tasks/        # 任务市场
│
├── /developers/        # 开发者
│   ├── /sdk/          # SDK
│   ├── /api/           # API
│   └── /examples/      # 示例
│
├── /blog/              # 博客
│
├── /about/             # 关于
│
└── /pricing/          # 价格 (可选)
```

### 4.2 首页设计

```
┌─────────────────────────────────────────────────────────────┐
│  Pclaw                                                  │
│  AI 任务的数字承包商                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  让 AI 工作像外包一样:                                    │
│  • 有承接方 (节点)                                        │
│  • 有合同 (合约)                                          │
│  • 有验收 (存证)                                          │
│  • 有报酬 (经济)                                          │
│  • 有信誉 (信用)                                          │
│                                                             │
│  [开始运行节点]  [查看文档]  [GitHub]                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  核心特性                                                 │
│                                                             │
│  🤖 AI 节点           📝 智能合约        🔗 分布式网络    │
│  💰 经济激励           ⭐ 信用体系          🔒 存证追溯      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  工作原理                                                 │
│                                                             │
│  1. 发布任务        2. 节点竞标        3. 签订合约       │
│     ↓                  ↓                  ↓                │
│  4. 执行任务        5. 提交结果        6. 获取报酬       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  代码预览 (Rust)                                           │
│                                                             │
│  use pclaw_core::PclawNode;                               │
│                                                             │
│  let mut node = PclawNode::new(config).await?;           │
│  node.connect(bootstrap_nodes).await?;                    │
│  node.accept_task(task_id).await?;                       │
│  let result = node.execute_task(task).await?;            │
│  node.submit_result(task_id, result).await?;             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  社区                                                     │
│                                                             │
│  [GitHub] [Discord] [Twitter] [Telegram]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、开发路线图

### 5.1 Phase 1: 核心基础 (0-3月)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 1-2 | Rust 核心库设计 + 基础结构 | pclaw-core v0.1 |
| 3-4 | 密码学模块 (哈希/签名/加密) | pclaw-core v0.2 |
| 5-6 | P2P 网络模块 (libp2p) | pclaw-core v0.3 |
| 7-8 | 存证模块 (哈希链) | pclaw-core v0.4 |
| 9-10 | 信用模块 | pclaw-core v0.5 |
| 11-12 | 任务合约 | pclaw-core v1.0 |

### 5.2 Phase 2: 节点客户端 (3-5月)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 13-14 | CLI 工具 | pclaw-cli v1.0 |
| 15-16 | 守护进程 | pclaw-node v1.0 |
| 17-18 | SDK (JS/Python) | pclaw-sdk v1.0 |
| 19-20 | 单元测试 + 集成测试 | 测试报告 |

### 5.3 Phase 3: 服务端 (5-7月)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 21-22 | REST API | pclaw-server |
| 23-24 | WebSocket | 实时通信 |
| 25-26 | 工作流引擎 | 工作流模块 |
| 27-28 | Agent 集成 | OpenAI/Claude |

### 5.4 Phase 4: 前端 (7-9月)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 29-30 | React 基础框架 | pclaw-web |
| 31-32 | 工作流编辑器 | 可视化 |
| 33-34 | 节点监控面板 | 监控 |
| 35-36 | 响应式 + 移动端 | 移动适配 |

### 5.5 Phase 5: 部署 + 文档 (9-10月)

| 周次 | 任务 | 交付物 |
|------|------|--------|
| 37-38 | Docker 镜像 | 容器化 |
| 39 | 云部署 (AWS/GCP) | 云服务 |
| 40 | 完整文档 | docs.pclawai.com |

---

## 六、技术栈详细

### 6.1 Rust 核心

```toml
# pclaw-core/Cargo.toml

[package]
name = "pclaw-core"
version = "1.0.0"
edition = "2021"

[dependencies]
# 异步运行时
tokio = { version = "1.35", features = ["full"] }

# P2P 网络
libp2p = { version = "0.53", features = ["tcp", "websocket", "noise", "gossipsub", "mdns"] }

# 密码学
sha2 = "0.10"
ed25519-dalek = "2.0"
aes-gcm = "0.10"
rand = "0.8"

# 数据库
rocksdb = "0.21"
sled = "0.34"

# 序列化
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# 日志
tracing = "0.1"
tracing-subscriber = "0.3"

# 错误处理
thiserror = "1.0"
anyhow = "1.0"

# 时间
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
tempfile = "3.8"
criterion = "0.5"

[[bench]]
name = "crypto"
harness = false
```

### 6.2 Node.js 服务

```json
{
  "name": "@pclaw/server",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18",
    "ws": "^8.16",
    "@grpc/grpc-js": "^1.9",
    "@pclaw/core": "workspace:*",
    "ioredis": "^5.3",
    "typeorm": "^0.3",
    "zod": "^3.22"
  },
  "devDependencies": {
    "typescript": "^5.3",
    "tsx": "^4.7",
    "vitest": "^1.2"
  }
}
```

### 6.3 前端

```json
{
  "name": "@pclaw/web",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2",
    "react-dom": "^18.2",
    "react-router-dom": "^6.22",
    "@tanstack/react-query": "^5.17",
    "reactflow": "^11.10",
    "zustand": "^4.5",
    "recharts": "^2.12"
  },
  "devDependencies": {
    "vite": "^5.0",
    "typescript": "^5.3",
    "tailwindcss": "^3.4"
  }
}
```

---

## 七、命名规范

### 7.1 项目命名

| 模块 | 命名 | 示例 |
|------|------|------|
| Rust 核心 | pclaw-core | pclaw-core |
| Rust CLI | pclaw-cli | pclaw-cli |
| Node.js 服务 | pclaw-server | pclaw-server |
| React 前端 | pclaw-web | pclaw-web |
| JS SDK | @pclaw/sdk | @pclaw/sdk |
| Python SDK | pclaw-sdk | pclaw-sdk |

### 7.2 代码命名

```rust
// 模块: snake_case
mod pclaw_node;
mod task_contract;

// 结构体: PascalCase
pub struct PclawNode {
    pub did: String,
    pub keypair: Keypair,
}

// 函数: snake_case
pub fn new_node(config: Config) -> Result<PclawNode> {
    // ...
}

// 枚举: PascalCase
pub enum NodeStatus {
    Online,
    Offline,
    Busy,
}

// 常量: SCREAMING_SNAKE_CASE
const MAX_TASK_SIZE: usize = 1024 * 1024;
```

---

## 八、总结

### 8.1 技术选型

| 层级 | 技术 |
|------|------|
| 核心 | Rust |
| 网络 | Rust + libp2p |
| 合约 | Solidity + Rust (ink!) |
| 业务 | Node.js + TypeScript |
| 前端 | React + TypeScript |
| 可视化 | React Flow |

### 8.2 GitHub 组织

```
pclaw-ai/
├── pclaw-core (Rust)
├── pclaw-node (Rust)
├── pclaw-cli (Rust)
├── pclaw-sdk-js
├── pclaw-sdk-python
├── pclaw-server (Node.js)
├── pclaw-web (React)
├── pclaw-contracts
└── pclaw-docs
```

### 8.3 时间线

```
Month 1-3:  Rust 核心
Month 3-5:  节点客户端
Month 5-7:  服务端
Month 7-9:  前端
Month 9-10: 部署 + 文档
```

---

*升版规划完成：中书省*
*日期：2026-03-13*
