# Pclaw 底层设计文档
# 基于 Lisp 思想的 Task-oriented 架构

---

## 一、核心理念

> 一切皆 Task，Task 嵌套 Task

```
Lisp: (defun 最小单元 (嵌套 组合))
Pclaw: (task (subtask (subtask)))
```

---

## 二、数据结构

### 2.1 Task - 唯一数据类型

```json
{
  "id": "task_uuid",
  
  // === 核心三要素 ===
  "goal": "任务目标",
  "executor": {
    "type": "Agent|Human",
    "id": "agent_xxx",
    "name": "执行者名称"
  },
  "status": "pending|running|confirming|completed|rejected",
  
  // === 确认流 ===
  "confirm": {
    "type": "signature|email|system|blockchain",
    "status": "pending|approved|rejected",
    "signer": { "id": "...", "name": "..." },
    "evidence": {
      "fileId": "...",
      "fileHash": "sha256_xxx",
      "emailId": "...",
      "blockchainTx": "0x..."
    },
    "liability": {
      "human": "责任人ID",
      "weight": 1.0,
      "reason": "确认后承担全部责任"
    },
    "timestamp": "ISO8601"
  },
  
  // === 执行结果 ===
  "result": {
    "output": "执行产出",
    "artifacts": [
      { "type": "file", "path": "...", "hash": "..." },
      { "type": "data", "content": "..." }
    ]
  },
  
  // === 嵌套子任务 ===
  "subtasks": ["task_id_1", "task_id_2"],
  "parent": "task_id_parent",
  
  // === 元数据 ===
  "metadata": {
    "priority": "low|medium|high|urgent",
    "deadline": "ISO8601",
    "tags": ["设计", "施工"],
    "dependencies": ["task_id_dep1"],
    "cost": { "compute": 100, "human": 50 }
  },
  
  // === 审计 ===
  "history": [
    { "event": "created", "timestamp": "...", "actor": "..." },
    { "event": "started", "timestamp": "...", "actor": "..." },
    { "event": "confirmed", "timestamp": "...", "actor": "..." }
  ],
  
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

---

## 三、架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Pclaw 顶层                                    │
│                    (pclaw - Task Engine)                              │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
    ┌────▼────┐           ┌─────▼─────┐          ┌────▼────┐
    │ Parser  │           │  Executor │          │ Storage │
    │ 解析器  │           │  执行器   │          │  存储   │
    └────┬────┘           └─────┬─────┘          └────┬────┘
         │                       │                       │
         │   ┌──────────────────┼───────────────────┐   │
         │   │                  │                   │   │
         │   │    Task Engine Core                 │   │
         │   │  ┌─────────────────────────────────┐ │   │
         │   │  │  Task Graph (有向无环图)        │ │   │
         │   │  │                                  │ │   │
         │   │  │   task_1                         │ │   │
         │   │  │     │                             │ │   │
         │   │  │     ├── subtask_1.1              │ │   │
         │   │  │     │     └── subtask_1.1.1      │ │   │
         │   │  │     │                             │ │   │
         │   │  │     └── subtask_1.2              │ │   │
         │   │  │                                  │ │   │
         │   │  │   task_2                         │ │   │
         │   │  │     │                             │ │   │
         │   │  │     └── subtask_2.1 ──► task_3   │ │   │
         │   │  │                                  │ │   │
         │   │  └─────────────────────────────────┘ │   │
         │   │                                      │   │
         │   │  ┌─────────────────────────────────┐ │   │
         │   │  │  State Machine                  │ │   │
         │   │  │                                  │ │   │
         │   │  │  pending → running → confirming │ │   │
         │   │  │                        ↓          │ │   │
         │   │  │                    completed      │ │   │
         │   │  │                        ↓          │ │   │
         │   │  │                     rejected       │ │   │
         │   │  │                                  │ │   │
         │   │  └─────────────────────────────────┘ │   │
         │   │                                      │   │
         │   └──────────────────────────────────────┘   │
         │                                               │
         └───────────────────────────────────────────────┘
```

---

## 四、核心模块

### 4.1 Parser - 任务解析

```
输入: JSON/DSL
         │
         ▼
┌─────────────────┐
│  Lexer          │  → 词法分析
│  Tokenize       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Parser         │  → 语法分析
│  Build AST      │    构建任务图
└────────┬────────┘
         │
         ▼
    Task Graph
```

### 4.2 Executor - 任务执行

```
Task Graph
    │
    ▼
┌─────────────────────────────────────────┐
│           Task Scheduler                │
│  - 依赖解析                             │
│  - 拓扑排序                             │
│  - 并行/串行调度                         │
└────────────────┬────────────────────────┘
                 │
     ┌───────────┼───────────┐
     │           │           │
     ▼           ▼           ▼
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Agent   │ │ Human   │ │ Hybrid  │
│ Executor│ │ Task    │ │ (Agent+ │
│         │ │ (手动)  │ │ Human)  │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┼───────────┘
                 │
                 ▼
         ┌──────────────┐
         │ Result       │
         │ Aggregator   │
         └──────────────┘
```

### 4.3 Confirm - 确认流

```
执行完成
    │
    ▼
┌─────────────────────────────────────┐
│       Confirm Engine                │
│                                     │
│  确认类型:                          │
│  ┌─────────┬─────────┬─────────┐   │
│  │Signature│  Email  │ System  │   │
│  │  签字   │  邮件   │  系统   │   │
│  └────┬────┴────┬────┴────┬────┘   │
│       │         │         │         │
│       └─────────┼─────────┘         │
│                 ▼                  │
│         ┌──────────────┐           │
│         │ Liability    │           │
│         │ 责任归属     │           │
│         └──────────────┘           │
└─────────────────────────────────────┘
```

### 4.4 Storage - 持久化

```
┌─────────────────────────────────────┐
│           Storage Layer             │
│                                     │
│  ┌─────────────┐  ┌─────────────┐ │
│  │  Task Store │  │Graph Store │ │
│  │  (KV)       │  │ (图数据库) │ │
│  └─────────────┘  └─────────────┘ │
│                                     │
│  ┌─────────────┐  ┌─────────────┐ │
│  │ Audit Log   │  │Artifact    │ │
│  │ 审计日志    │  │ Store      │ │
│  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
```

---

## 五、工作流示例

### 5.1 创建任务

```
POST /api/task
{
  "goal": "设计办公楼",
  "executor": { "type": "Agent", "id": "agent_design" },
  "subtasks": [
    { "goal": "建筑方案", "executor": { "type": "Agent", "id": "agent_arch" }},
    { "goal": "结构设计", "executor": { "type": "Agent", "id": "agent_struct" }}
  ]
}
        │
        ▼
返回 task_id
```

### 5.2 执行任务

```
GET /api/task/:id/execute
        │
        ▼
Scheduler 解析依赖
        │
    ┌───┴───┐
    │       │
    ▼       ▼
subtask1  subtask2  (并行执行)
    │       │
    └───────┼───────┐
            │       │
            ▼       ▼
        Agent 执行  Agent 执行
            │       │
            └───────┼───────┐
                    │       │
                    ▼       ▼
                汇总结果 → 状态变为 confirming
```

### 5.3 确认任务

```
POST /api/task/:id/confirm
{
  "type": "signature",
  "signer": { "id": "user_pm", "name": "项目经理" },
  "evidence": { "fileHash": "sha256_xxx" }
}
        │
        ▼
确认成功
  - liability = { human: "user_pm", weight: 1.0 }
  - status = completed
  - history + confirmed 事件
  - 审计日志 + 存证
```

---

## 六、API 设计

### 6.1 Task CRUD

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/task | 创建任务 |
| GET | /api/task/:id | 获取任务 |
| GET | /api/task | 列表(支持filter) |
| PUT | /api/task/:id | 更新任务 |
| DELETE | /api/task/:id | 删除任务 |

### 6.2 执行

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/task/:id/execute | 执行任务 |
| GET | /api/task/:id/status | 状态 |
| POST | /api/task/:id/cancel | 取消 |

### 6.3 确认

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/task/:id/confirm | 确认(自动判断类型) |
| POST | /api/task/:id/confirm/signature | 签字确认 |
| POST | /api/task/:id/confirm/email | 邮件确认 |
| POST | /api/task/:id/confirm/system | 系统确认 |

### 6.4 审计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/audit | 审计日志 |
| GET | /api/task/:id/history | 任务历史 |

---

## 七、与 OpenClaw 的关系

```
┌─────────────────────────────────────────────────┐
│              Pclaw (Task Engine)               │
│                                                 │
│  唯一职责:                                     │
│  - 任务图管理                                  │
│  - 状态机                                      │
│  - 确认流                                      │
│  - 存证                                        │
└────────────────────┬────────────────────────────┘
                     │ 调用
                     ▼
┌─────────────────────────────────────────────────┐
│              OpenClaw (Executor)                │
│                                                 │
│  唯一职责:                                     │
│  - 执行任务 (Agent Run)                         │
│  - 产出结果                                    │
│  - 工具调用                                    │
└─────────────────────────────────────────────────┘
```

---

## 八、扩展性

### 8.1 自定义 Task 类型

```javascript
// 注册自定义任务类型
pclaw.registerTaskType('design', {
  validate: (task) => { ... },
  execute: async (task) => { ... },
  confirm: async (task, evidence) => { ... }
})
```

### 8.2 自定义 Confirm 类型

```javascript
pclaw.registerConfirmType('blockchain', {
  sign: async (task, signer) => { ... },
  verify: async (evidence) => { ... }
})
```

---

*文档版本: 2.0*
*设计理念: Lisp - 一切皆 Task*
