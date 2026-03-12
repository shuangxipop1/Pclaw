# Pclaw 架构设计文档

## 一、整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Pclaw 云平台                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │  组织管理层  │  │  结算中心   │  │  知识中心   │           │
│  │  (动态)    │  │  (未来)    │  │            │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
         ↑              ↑              ↑
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │         │    │         │    │         │
┌───▼────────▼───▼─────────▼───▼─────────▼───────────────────────┐
│                    Pclaw Registry (注册中心)                      │
│   - Claw 注册   - 版本管理   - 能力清单   - 连接发现         │
└───────────────────────────────────────────────────────────────┘
         ↑              ↑              ↑
    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
    │  Claw A  │    │  Claw B  │    │  Claw N  │
    │ (Pclaw)  │    │ (OpenClaw)│    │ (其他)    │
    └─────────┘    └─────────┘    └─────────┘
         ↑
    ┌────┴────┐
    │ 人类用户  │
    │ + Agent  │
    └─────────┘
```

---

## 二、核心模块设计

### 2.1 注册中心 (Registry)

```typescript
interface ClawRegistry {
  // Claw 实例注册
  register(claw: ClawInstance): Promise<ClawId>
  
  // 版本管理
  versions: Map<ClawId, ClawVersion[]>
  
  // 能力发现
  capabilities: Map<ClawId, Capability[]>
  
  // 组织发现（远程连接）
  discoverOrg(): OrganizationNode[]
}
```

### 2.2 组织管理层（动态架构）

```typescript
interface Organization {
  // 动态组织架构
  nodes: OrganizationNode[]
  
  // 节点类型
  nodeTypes: ['human', 'agent', 'mixed']
  
  // 汇报关系（可动态调整）
  relationships: Relationship[]
  
  // 组织版本（快照）
  versions: OrganizationSnapshot[]
}

// 关系类型
type Relationship = 
  | { type: 'report', from: NodeId, to: NodeId }  // 汇报
  | { type: 'collaborate', nodes: NodeId[] }       // 协作
  | { type: 'delegate', from: NodeId, to: NodeId }  // 委托
```

### 2.3 Claw 版本管理

```typescript
interface ClawVersion {
  id: string
  name: string              // e.g., "Pclaw v1.0", "OpenClaw v2.1"
  base: string              // 基于的 Claw 类型
  capabilities: Capability[]
  releaseDate: Date
  status: 'stable' | 'beta' | 'deprecated'
  
  // 升级路径
  upgradeFrom?: string[]
  upgradeTo?: string[]
}
```

---

## 三、扩展性设计

### 3.1 模块化架构

```
┌─────────────────────────────────────┐
│           Pclaw Core               │
├─────────────────────────────────────┤
│  📦 Plugin System                   │
│  - 任务管理插件                    │
│  - 结算插件                        │
│  - 报表插件                        │
└─────────────────────────────────────┘
         ↑
    ┌────┴────┐
    │   Modules │
    ├──────────┤
    │ Registry │  ← 注册中心（必须）
    │ Org     │  ← 组织管理（必须）
    │ Task    │  ← 任务管理
    │ Payment │  ← 结算（未来）
    │ Reward  │  ← 报酬（可选）
    │ Penalty │  ← 处罚（未来）
    └─────────┘
```

### 3.2 配置驱动

```yaml
# pclaw.config.json
{
  "modules": {
    "org": "required",
    "task": "required", 
    "payment": "future",     # 未来启用
    "reward": "optional",   # 可选
    "penalty": "future"     # 未来启用
  },
  "features": {
    "multiClaw": true,
    "remoteConnect": true,
    "autoUpgrade": true
  }
}
```

---

## 四、远程连接设计

### 4.1 P2P 连接发现

```typescript
interface RemoteConnection {
  // 连接方式
  type: 'direct' | 'relay' | 'blockchain'
  
  // 发现服务
  discovery: {
    announce: (info: ClawInfo) => void
    find: (filter: Filter) => ClawInfo[]
  }
  
  // 安全传输
  security: {
    encryption: '端到端加密'
    auth: 'Token / DID'
  }
}
```

### 4.2 组织网络

```
     组织 A                    组织 B
   ┌─────────┐              ┌─────────┐
   │ Pclaw  │◄───连接───►│ Pclaw  │
   └────┬────┘              └────┬────┘
        │                        │
   人类用户                  人类用户
   
   - 跨组织协作
   - 资源共享
   - 联合项目
```

---

## 五、结算与利益分配（未来模块）

### 5.1 结算模型

```typescript
interface Settlement {
  // 结算主体
  from: AgentId | OrganizationId
  to: AgentId | OrganizationId
  
  // 结算内容
  resource: {
    type: 'compute' | 'data' | 'task' | 'knowledge'
    amount: number
    unit: string
  }
  
  // 价格
  price: {
    token: string
    amount: number
  }
  
  // 确认
  status: 'pending' | 'confirmed' | 'disputed'
}
```

### 5.2 利益分配规则

```typescript
interface ProfitDistribution {
  // 分配规则
  rules: {
    // 任务贡献分配
    task: { agent: number, human: number }
    
    // 资源贡献分配
    resource: { owner: number, platform: number }
    
    // 组织贡献分配
    org: { member: number, org: number }
  }
  
  // 争议处理
  dispute: {
   仲裁: '社区投票' | 'DAO' | '人工'
  }
}
```

---

## 六、责任与处罚（未来模块）

### 6.1 责任追溯

```typescript
interface Accountability {
  // 任务链追溯
  taskChain: TaskNode[]
  
  // 决策记录
  decisions: Decision[]
  
  // 人工审核点
  humanApprovals: Approval[]
  
  // 责任判定
  liability: {
    responsible: AgentId | HumanId
    weight: number    // 0-1
    reason: string
  }
}
```

### 6.2 处罚机制

```typescript
interface Penalty {
  // 触发条件
  trigger: {
    type: 'error' | 'delay' | 'misconduct'
    threshold: number
  }
  
  // 处罚方式
  method: {
    type: 'reputation' | 'resource' | 'access'
    amount: number
  }
  
  // 申诉机制
  appeal: {
    enabled: boolean
    process: '人工' | 'DAO'
  }
}
```

---

## 七、实施路线图

### Phase 1: 基础版（当前）
- [x] 组织架构管理
- [x] 任务分发
- [x] 汇报关系
- [x] 基础权限

### Phase 2: 结算版（近期）
- [ ] 多 Claw 注册
- [ ] 版本管理
- [ ] 远程连接
- [ ] 基础结算

### Phase 3: 生态版（中期）
- [ ] 完整结算系统
- [ ] 利益分配
- [ ] 责任追溯

### Phase 4: 自治版（远期）
- [ ] 处罚机制
- [ ] DAO 治理
- [ ] 完全自动化

---

## 八、扩展性保障

| 原则 | 实现方式 |
|------|----------|
| **模块化** | 插件系统，按需加载 |
| **配置化** | JSON/YAML 驱动 |
| **版本化** | API 版本管理 + 数据迁移 |
| **分布式** | P2P 连接 + 区块链（可选） |
| **可插拔** | 核心接口 + 实现分离 |

---

*本文档为 Pclaw 架构设计 v1.0*
