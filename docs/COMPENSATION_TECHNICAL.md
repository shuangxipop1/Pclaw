# Pclaw 报酬核算功能技术方案

## 1. 功能概述

### 1.1 目标
为 Pclaw 提供可选的报酬核算模块，支持：
- 对下级 Pclaw 工作进行评估
- 核算应付报酬
- 下级连接时提供基础报价及交付标准（KPI）

### 1.2 数据存储位置
```
pclaw-data/
└── compensation/
    ├── config/           # KPI 配置
    │   ├── roles.json   # 角色基础报价
    │   └── metrics.json # KPI 指标权重
    ├── evaluations/      # 评估记录
    │   └── {period}/
    │       └── {pclawId}.json
    ├── reports/         # 汇报关联
    │   └── {pclawId}/
    │       └── {period}.json
    └── payments/        # 报酬记录
        └── {period}/
            └── {pclawId}.json
```

---

## 2. 数据模型

### 2.1 KPI 配置 (compensation/config/metrics.json)

```typescript
interface KPIMetrics {
  version: string;
  lastUpdated: number;
  
  // 维度权重配置
  dimensions: {
    quality: {      // 交付质量
      weight: number;      // 权重 0-1
      maxScore: number;     // 满分
      metrics: {
        completeness: { label: string; weight: number; };
        accuracy: { label: string; weight: number; };
        documentation: { label: string; weight: number; };
      };
    };
    timeliness: {   // 交付时间
      weight: number;
      maxScore: number;
      metrics: {
        onTime: { label: string; weight: number; };
        early: { label: string; weight: number; };
        late: { label: string; weight: number; };
      };
    };
    workload: {     // 工作量
      weight: number;
      maxScore: number;
      metrics: {
        taskCount: { label: string; weight: number; };
        difficulty: { label: string; weight: number; };
        complexity: { label: string; weight: number; };
      };
    };
    satisfaction: {  // 客户满意度
      weight: number;
      maxScore: number;
      metrics: {
        rating: { label: string; weight: number; };
        feedback: { label: string; weight: number; };
      };
    };
  };
  
  // 评分等级
  grades: {
    S: { minScore: number; multiplier: number; description: '卓越'; };
    A: { minScore: number; multiplier: number; description: '优秀'; };
    B: { minScore: number; multiplier: number; description: '良好'; };
    C: { minScore: number; multiplier: number; description: '合格'; };
    D: { minScore: number; multiplier: number; description: '待改进'; };
  };
}
```

### 2.2 角色基础报价 (compensation/config/roles.json)

```typescript
interface RolePricing {
  version: string;
  lastUpdated: number;
  
  // 角色基础报价（单位：元/任务周期）
  roles: {
    [role: string]: {
      basePrice: number;          // 基础报价
      taskUnit: string;           // 任务单位：次/周/月
      minTasks: number;           // 最低任务数
      maxTasks: number;           // 最高任务数
      difficultyMultiplier: {     // 难度系数
        simple: number;
        normal: number;
        complex: number;
        expert: number;
      };
    };
  };
  
  // 项目类型加成
  projectTypeBonus: {
    [type: string]: number;       // 百分比加成
  };
}
```

### 2.3 评估记录 (compensation/evaluations/{period}/{pclawId}.json)

```typescript
interface Evaluation {
  id: string;
  period: string;                 // 格式：2024-W01 或 2024-Q1
  targetPclawId: string;           // 被评估的下级 Pclaw
  evaluatorPclawId: string;       // 评估方（上级）
  
  // KPI 评分
  scores: {
    quality: {
      completeness: number;       // 0-100
      accuracy: number;
      documentation: number;
    };
    timeliness: {
      onTime: number;
      early: number;
      late: number;
    };
    workload: {
      taskCount: number;
      difficulty: number;          // 1-5
      complexity: number;         // 1-5
    };
    satisfaction: {
      rating: number;              // 1-5
      feedback?: string;
    };
  };
  
  // 综合得分
  totalScore: number;              // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  
  // 备注
  notes?: string;
  
  // 时间戳
  createdAt: number;
  updatedAt: number;
}
```

### 2.4 报酬记录 (compensation/payments/{period}/{pclawId}.json)

```typescript
interface Payment {
  id: string;
  period: string;
  targetPclawId: string;
  
  // 计算明细
  calculation: {
    role: string;
    basePrice: number;
    difficultyMultiplier: number;
    projectBonus: number;
    taskCount: number;
    kpiMultiplier: number;
    finalAmount: number;
  };
  
  // 状态
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  
  // 审批信息
  approvedBy?: string;
  approvedAt?: number;
  paidAt?: number;
  
  // 备注
  notes?: string;
  
  createdAt: number;
  updatedAt: number;
}
```

---

## 3. API 设计

### 3.1 KPI 配置接口

```typescript
// GET /api/compensation/config/metrics
// 获取 KPI 指标配置

// GET /api/compensation/config/roles  
// 获取角色基础报价

// PUT /api/compensation/config/metrics
// 更新 KPI 配置（仅 HR 管理员）

// PUT /api/compensation/config/roles
// 更新角色报价（仅 HR 管理员）
```

### 3.2 评估接口

```typescript
// GET /api/compensation/evaluations?period=2024-W01
// 获取指定周期的评估列表

// GET /api/compensation/evaluations/:id
// 获取单个评估详情

// POST /api/compensation/evaluations
// 创建评估
// Body: { targetPclawId, period, scores, notes }

// PUT /api/compensation/evaluations/:id
// 更新评估

// GET /api/compensation/subordinates/:pclawId/evaluations
// 获取指定下级的所有评估记录
```

### 3.3 报酬计算接口

```typescript
// GET /api/compensation/payments?period=2024-W01
// 获取指定周期的报酬列表

// POST /api/compensation/calculate
// 计算应付报酬
// Body: { targetPclawId, period, role, difficulty, projectType, taskCount }

// PUT /api/compensation/payments/:id/approve
// 审批报酬

// PUT /api/compensation/payments/:id/mark-paid
// 标记已支付
```

### 3.4 报表接口

```typescript
// GET /api/compensation/reports/summary?period=2024-W01
// 获取周期报酬汇总

// GET /api/compensation/reports/trend?pclawId=xxx&periods=6
// 获取报酬趋势

// GET /api/compensation/reports/leaderboard?period=2024-W01
// 获取排行榜
```

---

## 4. 业务逻辑

### 4.1 KPI 评分计算

```typescript
function calculateKPIScore(scores: Evaluation['scores'], metrics: KPIMetrics): number {
  // 质量维度
  const qualityScore = 
    scores.quality.completeness * metrics.dimensions.quality.metrics.completeness.weight +
    scores.quality.accuracy * metrics.dimensions.quality.metrics.accuracy.weight +
    scores.quality.documentation * metrics.dimensions.quality.metrics.documentation.weight;
  
  // 时间维度
  const timelinessScore = 
    scores.timeliness.onTime * metrics.dimensions.timeliness.metrics.onTime.weight +
    scores.timeliness.early * metrics.dimensions.timeliness.metrics.early.weight -
    scores.timeliness.late * metrics.dimensions.timeliness.metrics.late.weight;
  
  // 工作量维度
  const workloadScore = 
    (scores.workload.taskCount / 10) * metrics.dimensions.workload.metrics.taskCount.weight +
    scores.workload.difficulty * metrics.dimensions.workload.metrics.difficulty.weight * 20 +
    scores.workload.complexity * metrics.dimensions.workload.metrics.complexity.weight * 20;
  
  // 满意度维度
  const satisfactionScore = 
    scores.satisfaction.rating * 20 * metrics.dimensions.satisfaction.metrics.rating.weight;
  
  // 加权总分
  const totalScore = 
    qualityScore * metrics.dimensions.quality.weight +
    timelinessScore * metrics.dimensions.timeliness.weight +
    workloadScore * metrics.dimensions.workload.weight +
    satisfactionScore * metrics.dimensions.satisfaction.weight;
  
  return Math.min(100, Math.max(0, totalScore));
}

function getGrade(score: number, metrics: KPIMetrics): string {
  if (score >= metrics.grades.S.minScore) return 'S';
  if (score >= metrics.grades.A.minScore) return 'A';
  if (score >= metrics.grades.B.minScore) return 'B';
  if (score >= metrics.grades.C.minScore) return 'C';
  return 'D';
}
```

### 4.2 报酬计算公式

```typescript
function calculatePayment(
  role: string,
  basePrice: number,
  difficulty: 'simple' | 'normal' | 'complex' | 'expert',
  projectType: string,
  taskCount: number,
  kpiScore: number,
  metrics: KPIMetrics
): Payment['calculation'] {
  // 获取难度系数
  const difficultyMultiplier = rolePricing.roles[role].difficultyMultiplier[difficulty];
  
  // 项目类型加成
  const projectBonus = (rolePricing.projectTypeBonus[projectType] || 0) / 100 + 1;
  
  // KPI 评级系数
  const grade = getGrade(kpiScore, metrics);
  const kpiMultiplier = metrics.grades[grade].multiplier;
  
  // 任务数量系数
  const taskCountMultiplier = Math.min(taskCount / 10, 1.5);
  
  // 最终报酬
  const finalAmount = basePrice * difficultyMultiplier * projectBonus * kpiMultiplier * taskCountMultiplier;
  
  return {
    role,
    basePrice,
    difficultyMultiplier,
    projectBonus,
    taskCount,
    kpiMultiplier,
    finalAmount: Math.round(finalAmount * 100) / 100
  };
}
```

---

## 5. 下级连接时的报价展示

### 5.1 连接时返回的报价信息

```typescript
interface ConnectionQuote {
  pclawId: string;
  role: string;
  
  // 基础报价
  quote: {
    basePrice: number;
    taskUnit: string;
    difficultyLevels: {
      simple: number;
      normal: number;
      complex: number;
      expert: number;
    };
  };
  
  // 交付标准 (KPI)
  deliveryStandards: {
    quality: {
      minComplet   eness: number; // 最低完整率
      minAccuracy: number;        // 最低准确率
    };
    timeliness: {
      maxLateRate: number;        // 最高延迟率
    };
    workload: {
      minTasksPerPeriod: number;  // 最低任务数
    };
  };
  
  // 评级对应的报酬系数
  gradeMultipliers: {
    S: number;
    A: number;
    B: number;
    C: number;
    D: number;
  };
}
```

---

## 6. 前端界面设计

### 6.1 角色与权限

| 角色 | 功能权限 |
|------|----------|
| HR 管理员 | 全部权限（配置、评估、审批） |
| 部门负责人 | 评估下级、查看本部门报酬 |
| 团队负责人 | 评估直属下级 |
| 普通成员 | 查看自己的评估和报酬 |

### 6.2 界面模块

1. **KPI 配置面板** - HR 管理员配置指标和权重
2. **评估录入页面** - 上级为下级打分
3. **报酬计算页面** - 自动计算应付报酬
4. **报酬审批页面** - 审批和支付记录
5. **报表中心** - 汇总、趋势、排行榜

---

## 7. 实现计划

### Phase 1: 基础功能
- [ ] 创建数据目录结构
- [ ] 实现 KPI 配置管理
- [ ] 实现角色报价配置
- [ ] 实现评估 CRUD

### Phase 2: 核心业务
- [ ] 实现 KPI 评分计算
- [ ] 实现报酬自动计算
- [ ] 实现审批流程

### Phase 3: 增强功能
- [ ] 报表和趋势分析
- [ ] 连接时报价展示
- [ ] 通知和提醒

---

## 8. 文件清单

```
pclaw/src/
└── compensation/
    ├── index.ts              # 入口文件
    ├── types.ts              # 类型定义
    ├── config/
    │   ├── metrics.ts        # KPI 配置管理
    │   └── roles.ts          # 角色报价管理
    ├── evaluation/
    │   ├── service.ts        # 评估服务
    │   └── handlers.ts       # API 处理器
    ├── payment/
    │   ├── calculator.ts     # 报酬计算器
    │   └── handlers.ts       # API 处理器
    ├── reports/
    │   └── generator.ts      # 报表生成
    └── cli.ts                # CLI 命令
```

---

## 9. 后续扩展

- [ ] 支持多币种
- [ ] 支持自定义评分模板
- [ ] 支持绩效历史对比
- [ ] 支持导出 PDF 报表
- [ ] 集成通知系统（支付提醒）
