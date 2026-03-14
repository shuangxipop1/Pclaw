# Pclaw 企业级顶层规划设计

## 一、设计理念

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **模块化** | 像n8n一样，节点可插拔 |
| **可视化** | 流程可拖拽编排 |
| **可扩展** | 轻松接入新Agent类型 |
| **企业级** | 权限、安全、合规 |
| **可观测** | 全链路存证追溯 |

### 1.2 对标 n8n

```
n8n 核心特点:
├── 可视化工作流编辑器
├── 丰富的节点生态 (300+)
├── 灵活的执行模式
├── 自托管选项
└── 开发者友好

Pclaw 要做:
├── 可视化 + 存证 + 协作
├── AI Agent 专用节点
├── 贡献追踪 + 收益分配
├── 企业级权限 + 审计
└── 信用体系
```

---

## 二、架构总览

### 2.1 分层架构

```
┌────────────────────────────────────────────────────────────────────┐
│                        Pclaw 企业级架构                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                      用户层 (User Layer)                     │ │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │ │
│  │   │ Web UI  │ │ API    │ │ SDK    │ │ CLI    │         │ │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  可视化层 (Visual Layer)                     │ │
│  │   ┌─────────────────────────────────────────────────────┐   │ │
│  │   │              工作流编辑器 (Flow Editor)              │   │ │
│  │   │   拖拽 → 连接 → 配置 → 测试 → 部署                   │   │ │
│  │   └─────────────────────────────────────────────────────┘   │ │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │ │
│  │   │节点市场 │ │执行监控│ │日志查看│ │调试工具│         │ │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                   编排层 (Orchestration Layer)               │ │
│  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│  │   │  任务调度   │ │  流程引擎   │ │   事件总线  │         │ │
│  │   │  Scheduler  │ │   Engine   │ │  EventBus   │         │ │
│  │   └─────────────┘ └─────────────┘ └─────────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    协作层 (Collaboration Layer)              │ │
│  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│  │   │  贡献追踪   │ │  收益分配   │ │   信用体系  │         │ │
│  │   │Contribution │ │Distribution │ │ Reputation  │         │ │
│  │   └─────────────┘ └─────────────┘ └─────────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    存证层 (Ledger Layer)                    │ │
│  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │ │
│  │   │  哈希存证   │ │  责任追溯   │ │   审计日志  │         │ │
│  │   │  Hash Chain │ │  Lineage   │ │    Audit   │         │ │
│  │   └─────────────┘ └─────────────┘ └─────────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  集成层 (Integration Layer)                  │ │
│  │   ┌─────────────────────────────────────────────────────┐   │ │
│  │   │                 Agent 连接器 (Connectors)            │   │ │
│  │   │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│   │ │
│  │   │  │OpenAI│ │Claude│ │Gemini│ │自定义│ │本地 │ │... ││   │ │
│  │   │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│   │ │
│  │   └─────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                  基础设施 (Infrastructure)                  │ │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │ │
│  │   │Database │ │  Cache  │ │ Message │ │Blockchain│         │ │
│  │   │ PostgreSQL│ │ Redis  │ │ RabbitMQ│ │(可选)   │         │ │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 三、核心设计

### 3.1 工作流节点系统 (类 n8n)

#### 3.1.1 节点类型

```
┌─────────────────────────────────────────────────────────────┐
│                    Pclaw 节点市场                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  触发器 (Triggers)                                         │
│  ├── 定时触发 (Schedule)                                   │
│  ├── Webhook 触发                                          │
│  ├── 消息触发 (IM/邮件)                                    │
│  └── 事件触发 (数据库/文件)                                │
│                                                             │
│  AI Agent 节点                                              │
│  ├── OpenAI GPT                                            │
│  ├── Anthropic Claude                                      │
│  ├── Google Gemini                                         │
│  ├── 本地模型 (Ollama/LM Studio)                          │
│  ├── 自定义 Agent (MCP)                                    │
│  └── Agent 集群 (多Agent协作)                              │
│                                                             │
│  数据处理                                                   │
│  ├── HTTP 请求                                              │
│  ├── 数据库操作                                             │
│  ├── 条件分支 (IF)                                         │
│  ├── 循环 (Loop)                                           │
│  ├── 转换 (Transform)                                      │
│  └── 工具 (Code/Math/Date)                                │
│                                                             │
│  存储与输出                                                 │
│  ├── 存储到 S3/本地                                        │
│  ├── 发送邮件/IM                                           │
│  ├── 写入数据库                                            │
│  └── 回调 (Callback)                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 节点定义格式

```json
{
  "node": {
    "name": "OpenAI GPT",
    "type": "ai_agent",
    "version": "1.0",
    "icon": "🤖",
    "credentials": [
      {
        "name": "openai_api",
        "required": true
      }
    ],
    "properties": [
      {
        "name": "model",
        "type": "options",
        "options": [
          { "name": "gpt-4", "value": "gpt-4" },
          { "name": "gpt-4-turbo", "value": "gpt-4-turbo" },
          { "name": "gpt-3.5-turbo", "value": "gpt-3.5-turbo" }
        ],
        "default": "gpt-4"
      },
      {
        "name": "systemMessage",
        "type": "string",
        "default": "你是一个专业的助手"
      },
      {
        "name": "prompt",
        "type": "string",
        "expression": true
      }
    ],
    "outputMethods": ["main"]
  }
}
```

### 3.2 存证系统

#### 3.2.1 存证数据结构

```typescript
// 每个节点执行的存证
interface ExecutionRecord {
  // 唯一标识
  recordId: string;
  workflowId: string;
  executionId: string;
  nodeId: string;
  
  // 时间戳
  timestamp: number;
  blockNumber?: number; // 区块链高度
  
  // 输入
  input: {
    data: any;
    hash: string; // 输入数据哈希
  };
  
  // 输出
  output: {
    data: any;
    hash: string; // 输出数据哈希
  };
  
  // 上下文
  context: {
    agentId?: string; // 关联的Agent
    agentDid?: string; // Agent DID
    operatorId?: string; // 运营方
    userId?: string; // 用户
  };
  
  // 哈希链
  chain: {
    previousHash: string;
    currentHash: string;
  };
  
  // 签名
  signatures: {
    node: string; // 节点签名
    platform: string; // 平台签名
  };
}

// 哈希链验证
function verifyChain(record: ExecutionRecord): boolean {
  const data = record.input.hash + record.output.hash + record.timestamp;
  const computed = sha256(data + record.chain.previousHash);
  return computed === record.chain.currentHash;
}
```

### 3.3 协作系统

#### 3.3.1 多Agent协作模式

```typescript
// 协作模式
enum CollaborationMode {
  SEQUENTIAL = "sequential",    // 串行: A→B→C
  PARALLEL = "parallel",        // 并行: A/B/C 同时
  PIPELINE = "pipeline",        // 流水线: A输出→B输入
  ROUND_ROBIN = "round_robin", // 轮询: A1→A2→A3→A1
  SWARM = "swarm"              // 蜂群: 多个Agent协作
}

// 贡献计算
interface Contribution {
  agentId: string;
  mode: CollaborationMode;
  inputs: string[];      // 消耗的资源
  outputs: string[];     // 产出的资源
  weight: number;        // 权重
  quality: number;       // 质量评分 (0-100)
  timestamp: number;
}

// 收益分配
function calculateDistribution(contributions: Contribution[], totalReward: number) {
  const totalWeight = contributions.reduce((sum, c) => sum + c.weight * c.quality, 0);
  
  return contributions.map(c => ({
    agentId: c.agentId,
    amount: Math.floor(totalReward * (c.weight * c.quality / totalWeight))
  }));
}
```

---

## 四、集成设计

### 4.1 AI Agent 无缝衔接

#### 4.1.1 连接器框架

```typescript
// 通用 Agent 连接器接口
interface AgentConnector {
  // 标识
  type: string;
  version: string;
  
  // 连接
  connect(credentials: any): Promise<boolean>;
  disconnect(): Promise<void>;
  
  // 执行
  execute(input: AgentInput): Promise<AgentOutput>;
  
  // 能力
  capabilities(): AgentCapabilities;
  
  // 元数据
  metadata(): AgentMetadata;
}

// 能力定义
interface AgentCapabilities {
  streaming: boolean;        // 是否支持流式
  functionCall: boolean;    // 是否支持函数调用
  vision: boolean;          // 是否支持视觉
  tools: boolean;           // 是否支持工具
  multiModal: boolean;      // 是否支持多模态
}
```

#### 4.1.2 内置连接器

| 连接器 | 状态 | 说明 |
|--------|------|------|
| OpenAI | ✅ 内置 | GPT-4/GPT-3.5 |
| Anthropic | ✅ 内置 | Claude |
| Google | ✅ 内置 | Gemini |
| Ollama | ✅ 内置 | 本地模型 |
| LM Studio | ✅ 内置 | 本地模型 |
| MCP | ✅ 内置 | Model Context Protocol |
| Custom HTTP | ✅ 内置 | 任意 HTTP API |
| Function | ✅ 内置 | 自定义函数 |

#### 4.1.3 自定义 Agent (MCP)

```json
{
  "mcp": {
    "name": "Custom Research Agent",
    "type": "mcp",
    "server": "https://research-agent.example.com/mcp",
    "capabilities": {
      "streaming": true,
      "functionCall": true
    },
    "tools": [
      {
        "name": "search",
        "description": "搜索学术论文"
      },
      {
        "name": "summarize",
        "description": "总结论文内容"
      }
    ]
  }
}
```

### 4.2 工作流模板

#### 4.2.1 预设模板

```
Pclaw 模板市场:

企业场景:
├── 客服工作流
│   ├── 用户意图识别 → Agent处理 → 人工复核 → 存证
│   └── 情绪分析 → 风险预警 → 升级处理
│
├── 销售工作流
│   ├── 线索评分 → Agent跟进 → 商机转化 → 存证
│   └── 来电处理 → 需求分析 → 报价 → 记录
│
├── 内容审核
│   ├── 内容采集 → AI审核 → 人工复核 → 存证
│   └── 批量审核 → 风险标注 → 报告生成
│
└── 代码审查
    ├── PR触发 → Agent审查 → 人工确认 → 存证
    └── 定时扫描 → 风险评估 → 报告

协作场景:
├── 多Agent研究
│   ├── 任务分解 → 并行执行 → 结果汇总 → 报告
│   └── 文献检索 → 分析 → 写作 → 校对
│
└── 内容生产
    ├── 选题 → 写作 → 配图 → 审核 → 发布
    └── 翻译 → 校对 → 排版 → 发布
```

---

## 五、企业级特性

### 5.1 权限系统

```
┌─────────────────────────────────────────────────────────────┐
│                    企业权限模型                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  角色 (Role)                                               │
│  ├── 超级管理员 (Super Admin)                              │
│  │   └── 全部权限                                          │
│  │                                                        │
│  ├── 租户管理员 (Tenant Admin)                             │
│  │   ├── 用户管理                                          │
│  │   ├── 角色管理                                          │
│  │   └── 资源配额                                          │
│  │                                                        │
│  ├── 工作流管理员 (Workflow Admin)                         │
│  │   ├── 创建/编辑工作流                                   │
│  │   ├── 部署/监控                                        │
│  │   └── 查看日志                                          │
│  │                                                        │
│  ├── 开发者 (Developer)                                    │
│  │   ├── 创建工作流                                        │
│  │   ├── 执行自己的                                        │
│  │   └── 查看日志                                          │
│  │                                                        │
│  ├── 运营 (Operator)                                        │
│  │   ├── 执行工作流                                        │
│  │   └── 查看执行记录                                      │
│  │                                                        │
│  └── 只读 (Viewer)                                          │
│      └── 查看工作流和日志                                   │
│                                                             │
│  数据权限 (Data Scope)                                      │
│  ├── 全部数据                                              │
│  ├── 部门数据                                              │
│  ├── 团队数据                                              │
│  └── 个人数据                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 安全特性

| 特性 | 说明 |
|------|------|
| **传输加密** | TLS 1.3 |
| **存储加密** | AES-256 |
| **密钥管理** | KMS / HashiCorp Vault |
| **API 认证** | OAuth 2.0 / API Key / JWT |
| **审计日志** | 全部操作记录 |
| **敏感脱敏** | 自动脱敏敏感数据 |
| **IP 白名单** | 访问控制 |
| **MFA** | 多因素认证 |

### 5.3 合规特性

```
合规模块:

├── 数据合规
│   ├── GDPR 合规 (欧盟)
│   ├── 个保法合规 (中国)
│   └── CCPA 合规 (美国)
│
├── 审计合规
│   ├── 操作审计
│   ├── 数据访问审计
│   └── 导出审计
│
├── 地区合规
│   ├── 数据本地化存储
│   ├── 跨境传输控制
│   └── 地区封锁
│
└── 行业合规
    ├── 金融合规
    ├── 医疗合规
    └── 政务合规
```

### 5.4 高可用架构

```
┌─────────────────────────────────────────────────────────────┐
│                    高可用部署架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                         CDN                                 │
│                    (全球加速)                               │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  负载均衡                            │  │
│  │                  (Nginx/HAProxy)                    │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         ↓                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │  API Server │  │ API Server │  │ API Server │          │
│  │   (x3)     │  │   (x3)     │  │   (x3)     │          │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘          │
│         └────────────────┼────────────────┘                │
│                          ↓                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │   Redis    │  │   Redis    │  │   Redis    │          │
│  │  Cluster  │  │  Cluster  │  │  Cluster  │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                          ↓                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │PostgreSQL │  │PostgreSQL │  │PostgreSQL │          │
│  │  Primary  │ ←→│ Standby  │ ←→│ Standby   │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │              异步任务队列 (RabbitMQ)               │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、API 设计

### 6.1 REST API

```
基础 URL: /api/v1

认证:
├── Header: Authorization: Bearer <token>
└── Header: X-API-Key: <key>

工作流:
├── POST   /workflows              创建工作流
├── GET    /workflows               列表
├── GET    /workflows/:id          详情
├── PUT    /workflows/:id          更新
├── DELETE /workflows/:id          删除
├── POST   /workflows/:id/execute   执行
└── GET    /workflows/:id/history  执行历史

执行:
├── GET    /executions             列表
├── GET    /executions/:id         详情
├── POST   /executions/:id/cancel  取消
└── GET    /executions/:id/data    输入输出数据

存证:
├── GET    /records                列表
├── GET    /records/:id            详情
├── GET    /records/:id/verify     验证哈希链
└── POST   /records/export         导出

Agent:
├── GET    /agents                 列表
├── POST   /agents                 注册
├── PUT    /agents/:id             更新
└── DELETE /agents/:id             删除

协作:
├── GET    /contributions          贡献列表
├── GET    /distributions          分配列表
└── POST   /distributions/calculate 计算收益
```

### 6.2 Webhook

```json
{
  "webhook": {
    "events": [
      "execution.started",
      "execution.completed",
      "execution.failed",
      "node.executed",
      "record.created",
      "alert.triggered"
    ],
    "format": {
      "url": "https://your-server.com/webhook",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer xxx"
      },
      "body": "{{ { executionId, status, data } }}"
    }
  }
}
```

---

## 七、SDK 与集成

### 7.1 多语言 SDK

```
SDK 支持:

├── JavaScript/TypeScript
│   └── @pclaw/sdk
│
├── Python
│   └── pclaw-python
│
├── Go
│   └── pclaw-go
│
├── Java
│   └── pclaw-java
│
└── Rust
    └── pclaw-rust (WASM)
```

### 7.2 快速集成示例

```typescript
// JavaScript SDK 示例
import { Pclaw, Workflow } from '@pclaw/sdk';

// 1. 创建工作流
const workflow = new Workflow({
  name: '客服工作流',
  nodes: [
    {
      id: 'trigger',
      type: 'webhook',
      config: { path: '/customer-service' }
    },
    {
      id: 'classify',
      type: 'openai',
      config: {
        model: 'gpt-4',
        prompt: '分析用户意图: {{$json.message}}'
      }
    },
    {
      id: 'process',
      type: 'agent',
      config: {
        agentId: 'customer-service-v1'
      }
    },
    {
      id: 'record',
      type: 'ledger',
      config: {
        record: true,
        chain: 'hash'
      }
    }
  ],
  edges: [
    { from: 'trigger', to: 'classify' },
    { from: 'classify', to: 'process' },
    { from: 'process', to: 'record' }
  ]
});

// 2. 部署
await workflow.deploy();

// 3. 执行
const result = await workflow.execute({
  message: '我想查询订单'
});

console.log(result.data);
```

---

## 八、实施路线图

### 8.1 开发阶段

| 阶段 | 时间 | 内容 | 里程碑 |
|------|------|------|--------|
| **Phase 1** | 0-4周 | 核心引擎 | 可执行简单工作流 |
| **Phase 2** | 4-8周 | 存证系统 | 哈希链存证 |
| **Phase 3** | 8-12周 | Agent连接器 | OpenAI/Claude集成 |
| **Phase 4** | 12-16周 | 协作系统 | 贡献追踪 |
| **Phase 5** | 16-20周 | 企业特性 | 权限/审计 |
| **Phase 6** | 20-24周 | 可视化 | Web编辑器 |

### 8.2 MVP 交付

```
MVP 功能:
├── 工作流执行引擎
├── 节点: Trigger + AI + Output
├── 存证系统 (哈希链)
├── 基础权限
├── REST API
└── Web 管理后台
```

---

## 九、总结

### 9.1 设计目标达成

| 目标 | 实现方式 |
|------|----------|
| **无缝衔接各类AI Agent** | 连接器框架 + MCP支持 |
| **参考n8n优秀设计** | 可视化节点 + 工作流引擎 |
| **企业级快速安全** | 权限 + 审计 + 高可用 + 合规 |
| **存证协作** | 哈希链 + 贡献追踪 + 收益分配 |

### 9.2 核心优势

```
技术优势:
├── 节点化架构 (可扩展)
├── 哈希存证 (可追溯)
├── 贡献追踪 (可变现)
└── 企业级 (可信赖)

商业优势:
├── 场景通用 (不绑定)
├── 生态开放 (可扩展)
├── 渐进复杂 (可从小开始)
└── 网络效应 (越用越有价值)
```

### 9.3 一句话定位

```
Pclaw = "企业级 AI 工作流平台"

让企业的 AI Agent:
- 像 n8n 一样易用
- 像银行一样安全
- 像区块链一样可追溯
- 像市场一样可协作
```

---

*顶层设计完成：中书省*
*日期：2026-03-13*
