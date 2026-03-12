# Pclaw 组织连接功能技术方案

## 文档信息

- **任务ID**: JJC-20260312-005
- **版本**: v1.0
- **更新日期**: 2026-03-12
- **状态**: 技术方案初稿

---

## 一、需求概述

### 1.1 设计理念

每个运行 Pclaw 的机器背后都有一个人，这个人是为 Pclaw 的产出负责的，是属于真实架构中的一份子，需受组织管理的约束与管理。

### 1.2 核心需求

| 需求编号 | 描述 |
|----------|------|
| REQ-001 | 每个 Pclaw 可以连接多个上级 Pclaw |
| REQ-002 | 每个 Pclaw 可以连接多个下级 Pclaw |
| REQ-003 | 上级 Pclaw 具备查询下级 Pclaw 工作专属汇报文件夹的权利 |
| REQ-004 | 有多个上级时，分别建立多个汇报文件夹 |
| REQ-005 | 每个 Pclaw 对自己的工作汇报文件夹负责，放入文件夹的内容需经用户批准 |

---

## 二、系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Pclaw 组织网络                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌──────────────┐                                            │
│    │  上级 Pclaw A │◄─────── 汇报 ───────┐                     │
│    │  (项目经理)    │                    │                     │
│    └──────┬───────┘                    │                     │
│           │                             │                     │
│    ┌──────▼───────┐              ┌──────▼───────┐              │
│    │ 下级 Pclaw B  │◄─── 汇报 ──►│ 下级 Pclaw C  │              │
│    │ (设计经理)    │              │ (采购经理)    │              │
│    └──────┬───────┘              └──────┬───────┘              │
│           │                             │                      │
│    ┌──────▼───────┐              ┌──────▼───────┐              │
│    │ 下级 Pclaw D  │              │ 下级 Pclaw E  │              │
│    │ (设计师A)     │              │ (设计师B)     │              │
│    └──────────────┘              └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块划分

| 模块 | 职责 |
|------|------|
| OrgConnectionManager | 组织连接管理：上下级关系建立、维护、验证 |
| ReportFolderManager | 汇报文件夹管理：创建、权限、访问控制 |
| ApprovalWorkflowManager | 审批工作流：提交、审批、驳回、归档 |
| NotificationManager | 通知管理：消息推送、状态变更提醒 |
| SyncManager | 数据同步：组织架构同步、文件夹同步 |

---

## 三、详细设计

### 3.1 数据结构

#### 3.1.1 Pclaw 身份标识

```typescript
interface PclawIdentity {
  pclawId: string;           // 全局唯一标识 (UUID v4)
  displayName: string;       // 显示名称
  machineId: string;         // 机器指纹
  userId: string;            // 绑定用户ID
  createdAt: number;         // 创建时间戳
  publicKey: string;         // 用于安全通信的非对称公钥
  endpoint: string;         // P2P 通信端点
}
```

#### 3.1.2 组织关系配置

```typescript
interface OrgRelationship {
  // 自身信息
  self: PclawIdentity;
  
  // 角色信息
  role: OrgRole;
  
  // 上级关系
  parents: ParentConnection[];
  
  // 下级关系
  children: ChildConnection[];
  
  // 汇报文件夹映射
  reportFolders: ReportFolderConfig;
  
  // 同步状态
  syncState: SyncState;
}

type OrgRole = 
  | 'project_manager'
  | 'design_manager'
  | 'procurement_manager'
  | 'construction_manager'
  | 'control_manager'
  | 'cost_control_manager'
  | 'finance_manager'
  | 'document_control_manager'
  | 'business_manager'
  | 'engineer'
  | 'designer'
  | 'custom';

interface ParentConnection {
  pclawId: string;
  displayName: string;
  role: OrgRole;
  connectedAt: number;
  lastSyncAt: number;
  status: 'active' | 'inactive' | 'pending';
}

interface ChildConnection {
  pclawId: string;
  displayName: string;
  role: OrgRole;
  connectedAt: number;
  lastSyncAt: number;
  status: 'active' | 'inactive' | 'pending';
  reportFolderPath: string;
}

interface ReportFolderConfig {
  basePath: string;                    // 汇报文件夹根目录
  pendingFolder: string;               // 待审批文件夹
  approvedFolder: string;              // 已通过文件夹
  rejectedFolder: string;              // 已驳回文件夹
  perSuperior: Record<string, SuperiorReportFolder>;
}

interface SuperiorReportFolder {
  superiorId: string;
  superiorName: string;
  folderPath: string;                  // 专属汇报文件夹路径
  createdAt: number;
  lastAccessAt: number;
}

interface SyncState {
  lastSyncAt: number;
  syncVersion: number;
  pendingChanges: SyncChange[];
}
```

#### 3.1.3 汇报文件

```typescript
interface ReportFile {
  fileId: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  
  // 提交者信息
  submitter: {
    pclawId: string;
    displayName: string;
    role: OrgRole;
  };
  
  // 目标上级
  targetSuperior: string;  // 上级 Pclaw ID
  
  // 文件信息
  filePath: string;       // 原始文件路径
  reportPath: string;     // 汇报文件夹中的路径
  
  // 审批信息
  approval: {
    submittedAt: number;
    approvedAt?: number;
    rejectedAt?: number;
    approverId?: string;
    approverName?: string;
    comment?: string;
  };
  
  // 元数据
  createdAt: number;
  updatedAt: number;
  version: number;
}

type ReportCategory = 
  | 'progress'        // 工作进展
  | 'design_output'  // 设计成果
  | 'purchase_req'   // 采购申请
  | 'budget申请'      // 预算申请
  | 'change_request' // 变更申请
  | 'document'       // 文档交付
  | 'other';         // 其他

type ReportStatus = 
  | 'draft'          // 草稿
  | 'pending'        // 待审批
  | 'approved'       // 已通过
  | 'rejected';      // 已驳回
```

#### 3.1.4 审批记录

```typescript
interface ApprovalRecord {
  recordId: string;
  reportFileId: string;
  
  // 审批流程
  action: 'submit' | 'approve' | 'reject' | 'resubmit';
  
  // 操作者
  operator: {
    pclawId: string;
    displayName: string;
    isUser: boolean;  // true=人类用户, false=AI代理
  };
  
  // 审批意见
  comment?: string;
  
  // 时间戳
  timestamp: number;
}
```

### 3.2 组织连接管理

#### 3.2.1 连接建立流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Pclaw A    │     │  Pclaw B    │     │   用户 A    │
│ (申请加入)   │────►│ (收到请求)  │     │ (审批确认)  │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                          │                    │
                          ▼                    ▼
                   ┌─────────────┐     ┌─────────────┐
                   │ 通知用户B   │◄────│ 确认关系    │
                   └──────┬──────┘     └─────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ 建立双向连接 │
                   └─────────────┘
```

#### 3.2.2 API 设计

```typescript
// 组织连接管理服务
interface OrgConnectionService {
  // 发起连接请求
  requestConnection(
    targetPclawId: string,
    targetEndpoint: string,
    role: OrgRole
  ): Promise<ConnectionRequest>;
  
  // 响应连接请求
  respondToConnection(
    requestId: string,
    approved: boolean,
    role: OrgRole
  ): Promise<void>;
  
  // 断开连接
  disconnect(pclawId: string): Promise<void>;
  
  // 获取组织架构
  getOrgChart(): Promise<OrgChart>;
  
  // 获取上级列表
  getParents(): Promise<ParentConnection[]>;
  
  // 获取下级列表
  getChildren(): Promise<ChildConnection[]>;
  
  // 验证连接状态
  validateConnection(pclawId: string): Promise<boolean>;
}
```

### 3.3 汇报文件夹管理

#### 3.3.1 文件夹结构

```
{user_home}/
└── .pclaw/
    └── reports/
        ├── {pclawId}_config.json          # 汇报配置
        ├── pending/                        # 待审批 (提交给上级的文件)
        │   ├── {superiorId}/
        │   │   ├── 2026-03-12-项目进展.md
        │   │   └── 2026-03-12-设计成果.md
        │   └── {superiorId2}/
        │       └── ...
        ├── approved/                      # 已通过 (已获批准可公开)
        │   ├── {superiorId}/
        │   └── {superiorId2}/
        └── rejected/                      # 已驳回
            ├── {superiorId}/
            └── {superiorId2}/
```

#### 3.3.2 汇报文件夹创建规则

| 场景 | 行为 |
|------|------|
| 新增上级连接 | 自动创建该上级专属汇报文件夹 |
| 断开上级连接 | 保留历史记录，标记为归档 |
| 删除下级 | 保留下级汇报历史 |
| 多上级场景 | 每个上级独立文件夹，物理隔离 |

#### 3.3.3 API 设计

```typescript
interface ReportFolderService {
  // 初始化汇报文件夹
  initReportFolders(parentIds: string[]): Promise<void>;
  
  // 获取汇报文件夹路径
  getReportFolderPath(superiorId: string, type: 'pending' | 'approved' | 'rejected'): string;
  
  // 获取下级汇报内容
  getChildReports(
    childPclawId: string,
    options?: {
      status?: ReportStatus;
      superiorId?: string;
      fromDate?: number;
      toDate?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<ReportFile[]>;
  
  // 获取下级列表
  getChildReportFolders(): Promise<ChildConnection[]>;
  
  // 监听下级汇报更新
  watchChildReports(childPclawId: string, callback: (reports: ReportFile[]) => void): void;
}
```

### 3.4 审批工作流

#### 3.4.1 审批流程状态机

```
┌────────┐     提交      ┌────────┐     批准      ┌─────────┐
│ 草稿   │────────────►│ 待审批 │────────────►│ 已通过  │
└────────┘              └────────┘              └─────────┘
    │                        │                        │
    │ 撤回/删除              │ 驳回                    │
    └──────────────────────┘ ▼                        │
                          ┌────────┐                  │
                          │ 已驳回 │                  │
                          └────────┘                  │
                              │                        │
                              └─────── 重新提交 ───────┘
```

#### 3.4.2 审批规则

| 规则 | 说明 |
|------|------|
| 提交者限制 | 只能提交到自己连接的上级文件夹 |
| 文件大小限制 | 单个文件 ≤ 50MB |
| 格式限制 | 支持: md, txt, pdf, docx, xlsx, 图片 |
| 审批时限 | 默认 72 小时，可配置 |
| 审批权限 | 仅上级 Pclaw 绑定的用户可审批 |

#### 3.4.3 API 设计

```typescript
interface ApprovalService {
  // 提交汇报
  submitReport(
    filePath: string,
    title: string,
    description: string,
    category: ReportCategory,
    targetSuperiorId: string
  ): Promise<ReportFile>;
  
  // 审批汇报
  approveReport(
    reportId: string,
    comment?: string
  ): Promise<void>;
  
  // 驳回报销
  rejectReport(
    reportId: string,
    reason: string
  ): Promise<void>;
  
  // 撤回汇报
  withdrawReport(reportId: string): Promise<void>;
  
  // 重新提交
  resubmitReport(reportId: string): Promise<void>;
  
  // 获取待审批列表
  getPendingReports(superiorId?: string): Promise<ReportFile[]>;
  
  // 获取审批历史
  getApprovalHistory(
    options?: {
      reportId?: string;
      fromDate?: number;
      toDate?: number;
      limit?: number;
    }
  ): Promise<ApprovalRecord[]>;
}
```

### 3.5 通知机制

#### 3.5.1 通知类型

| 通知类型 | 触发条件 | 接收者 |
|----------|----------|--------|
| 新连接请求 | 下级申请加入 | 上级用户 |
| 连接确认 | 上级确认连接 | 下级 |
| 新汇报提交 | 下级提交汇报 | 上级用户 |
| 审批通过 | 上级批准汇报 | 提交者 |
| 审批驳回 | 上级驳回汇报 | 提交者 |
| 下级离线 | 下级 Pclaw 离线 | 上级用户 |
| 下级上线 | 下级 Pclaw 上线 | 上级用户 |

#### 3.5.2 通知渠道

```typescript
interface NotificationConfig {
  channels: {
    qq?: boolean;        // QQ 消息
    feishu?: boolean;    // 飞书消息
    telegram?: boolean;  // Telegram
    email?: boolean;      // 邮件
    system?: boolean;    // 系统通知
  };
  
  // 每种通知类型的开关
  types: {
    connectionRequest: boolean;
    newReport: boolean;
    approvalResult: boolean;
    statusChange: boolean;
  };
  
  // 静默时段
  quietHours?: {
    start: string;  // HH:mm
    end: string;    // HH:mm
  };
}
```

### 3.6 安全设计

#### 3.6.1 身份验证

```typescript
interface SecurityConfig {
  // P2P 通信加密
  encryption: {
    algorithm: 'AES-256-GCM';
    keyExchange: 'ECDHE';
  };
  
  // 身份认证
  authentication: {
    method: 'token' | 'certificate';
    tokenExpiry: number;  // 毫秒
    requireUserConfirmation: boolean;
  };
  
  // 访问控制
  accessControl: {
    requireApprovalForConnection: boolean;
    requireApprovalForReport: boolean;
    allowCrossOrgQuery: boolean;
  };
}
```

#### 3.6.2 权限矩阵

| 操作 | Pclaw 自身 | 上级 | 下级 | 其他 Pclaw |
|------|------------|------|------|------------|
| 查看自己汇报 | ✓ | - | - | - |
| 提交汇报给上级 | ✓ | - | - | - |
| 审批下级汇报 | - | ✓ | - | - |
| 查看下级汇报 | - | ✓ | - | - |
| 查看上级汇报 | - | - | - | - |
| 管理组织连接 | ✓ | - | - | - |

---

## 四、用户交互设计

### 4.1 命令行接口

```bash
# 组织管理
pclaw org connect <target-pclaw-id> --role designer
pclaw org disconnect <pclaw-id>
pclaw org list --parents
pclaw org list --children

# 汇报管理
pclaw report submit <file> --to <superior-id> --category progress
pclaw report list --pending
pclaw report approve <report-id> --comment "同意"
pclaw report reject <report-id> --reason "需补充数据"

# 文件夹管理
pclaw folder init
pclaw folder list --children
pclaw folder view <child-pclaw-id> --status approved
```

### 4.2 Web 界面

```html
<!-- 组织架构视图 -->
<div class="org-chart">
  <div class="node superior">
    <span class="name">项目经理</span>
    <span class="status online">在线</span>
  </div>
  <div class="connections">
    <div class="node child">
      <span class="name">设计经理</span>
      <span class="reports-count">3 份待审批</span>
    </div>
  </div>
</div>

<!-- 汇报审批面板 -->
<div class="approval-panel">
  <div class="report-card pending">
    <div class="report-title">项目进展汇报 (2026-03-12)</div>
    <div class="report-meta">提交人: 设计经理A | 提交时间: 10:30</div>
    <div class="report-actions">
      <button class="approve">批准</button>
      <button class="reject">驳回</button>
    </div>
  </div>
</div>
```

---

## 五、存储设计

### 5.1 本地存储

```json
// ~/.pclaw/config/org.json
{
  "pclawId": "550e8400-e29b-41d4-a716-446655440000",
  "role": "designer",
  "parents": [
    {
      "pclawId": "550e8400-e29b-41d4-a716-446655440001",
      "displayName": "设计经理",
      "connectedAt": 1709234567000,
      "status": "active"
    }
  ],
  "children": [],
  "reportFolders": {
    "basePath": "/Users/mac/.pclaw/reports",
    "pendingFolder": "/Users/mac/.pclaw/reports/pending",
    "perSuperior": {
      "550e8400-e29b-41d4-a716-446655440001": {
        "folderPath": "/Users/mac/.pclaw/reports/pending/550e8400-e29b-41d4-a716-446655440001"
      }
    }
  }
}
```

### 5.2 数据库 (SQLite)

```sql
-- 组织关系表
CREATE TABLE org_relationships (
  id TEXT PRIMARY KEY,
  pclaw_id TEXT NOT NULL,
  parent_id TEXT,
  child_id TEXT,
  role TEXT,
  status TEXT DEFAULT 'pending',
  created_at INTEGER,
  updated_at INTEGER
);

-- 汇报文件表
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT DEFAULT 'draft',
  submitter_id TEXT,
  target_superior_id TEXT,
  file_path TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 审批记录表
CREATE TABLE approval_records (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  action TEXT,
  operator_id TEXT,
  operator_name TEXT,
  is_user INTEGER,
  comment TEXT,
  timestamp INTEGER,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);
```

---

## 六、关键实现细节

### 6.1 汇报提交审批流程

```javascript
class ReportWorkflow {
  async submitReport(filePath, targetSuperiorId, title, description, category) {
    // 1. 验证上级连接存在
    const parent = await this.orgService.getParent(targetSuperiorId);
    if (!parent || parent.status !== 'active') {
      throw new Error('上级连接不存在或已断开');
    }
    
    // 2. 创建汇报记录
    const report = await this.reportRepo.create({
      title,
      description,
      category,
      submitterId: this.pclawId,
      targetSuperiorId,
      status: 'pending',
      filePath
    });
    
    // 3. 移动文件到待审批文件夹
    const folderPath = this.folderService.getReportFolderPath(
      targetSuperiorId, 
      'pending'
    );
    const destPath = await this.fileService.move(filePath, folderPath);
    await this.reportRepo.update(report.id, { reportPath: destPath });
    
    // 4. 通知上级
    await this.notificationService.notify(targetSuperiorId, {
      type: 'new_report',
      reportId: report.id,
      title: report.title
    });
    
    return report;
  }
  
  async approveReport(reportId, approverId, comment) {
    // 1. 获取汇报
    const report = await this.reportRepo.get(reportId);
    
    // 2. 验证审批权限 (仅上级可审批)
    if (report.targetSuperiorId !== this.pclawId) {
      throw new Error('无审批权限');
    }
    
    // 3. 移动文件到已通过文件夹
    const approvedFolder = this.folderService.getReportFolderPath(
      report.targetSuperiorId,
      'approved'
    );
    const destPath = await this.fileService.move(
      report.reportPath,
      approvedFolder
    );
    
    // 4. 更新状态
    await this.reportRepo.update(reportId, {
      status: 'approved',
      approval: {
        approvedAt: Date.now(),
        approverId,
        comment
      }
    });
    
    // 5. 通知提交者
    await this.notificationService.notify(report.submitterId, {
      type: 'report_approved',
      reportId: report.id
    });
    
    // 6. 记录审批历史
    await this.approvalRecordRepo.create({
      reportId,
      action: 'approve',
      operatorId: approverId,
      comment,
      timestamp: Date.now()
    });
  }
}
```

### 6.2 上级查询下级汇报

```javascript
class ReportQueryService {
  async getChildReports(childPclawId, options = {}) {
    // 1. 验证下级关系
    const child = await this.orgService.getChild(childPclawId);
    if (!child) {
      throw new Error('下级连接不存在');
    }
    
    // 2. 查询汇报文件
    const query = {
      submitterId: childPclawId,
      ...options
    };
    
    // 3. 过滤权限范围内的上级
    if (options.targetSuperiorId) {
      // 仅查询发给自己(当前用户)的汇报
      query.targetSuperiorId = this.pclawId;
    }
    
    const reports = await this.reportRepo.find(query);
    
    // 4. 补充下级信息
    return reports.map(r => ({
      ...r,
      submitterName: child.displayName,
      submitterRole: child.role
    }));
  }
  
  async watchChildReports(childPclawId) {
    // 监听下级汇报文件夹变化
    const folderPath = path.join(
      this.config.reportsPath,
      'pending',
      childPclawId
    );
    
    return this.fileWatcher.watch(folderPath, async (event, filename) => {
      if (event === 'add' && filename) {
        // 新增文件，解析汇报信息并通知
        const report = await this.parseReportFile(filename);
        await this.notificationService.notify(this.pclawId, {
          type: 'new_child_report',
          childPclawId,
          report
        });
      }
    });
  }
}
```

---

## 七、配置示例

### 7.1 首次配置

```json
// ~/.pclaw/config.json
{
  "org": {
    "enabled": true,
    "pclawId": "550e8400-e29b-41d4-a716-446655440000",
    "role": "designer",
    "displayName": "设计师张三"
  },
  "notifications": {
    "channels": {
      "qq": true,
      "feishu": false
    },
    "types": {
      "connectionRequest": true,
      "newReport": true,
      "approvalResult": true,
      "statusChange": true
    }
  },
  "security": {
    "requireApprovalForConnection": true,
    "requireApprovalForReport": true
  }
}
```

### 7.2 汇报文件夹初始化

```bash
# 初始化汇报文件夹
$ pclaw folder init

✅ 汇报文件夹初始化完成
📁 位置: /Users/mac/.pclaw/reports/
   ├── pending/      (待审批)
   ├── approved/     (已通过)
   └── rejected/     (已驳回)

# 添加上级后
$ pclaw org connect 550e8400-e29b-41d4-a716-446655440001 --role design_manager

✅ 连接成功
📁 已为上级"设计经理"创建汇报文件夹:
   /Users/mac/.pclaw/reports/pending/550e8400-e29b-41d4-a716-446655440001/
```

---

## 八、测试用例

### 8.1 组织连接测试

| 用例ID | 描述 | 预期结果 |
|--------|------|----------|
| TC-ORG-001 | Pclaw A 申请连接 Pclaw B | B 收到连接请求通知 |
| TC-ORG-002 | Pclaw B 同意连接 | 双向连接建立成功 |
| TC-ORG-003 | Pclaw B 拒绝连接 | 连接未建立，A 收到通知 |
| TC-ORG-004 | 断开上下级连接 | 关系解除，历史保留 |
| TC-ORG-005 | 多上级场景 | 多个汇报文件夹正确创建 |

### 8.2 汇报审批测试

| 用例ID | 描述 | 预期结果 |
|--------|------|----------|
| TC-REP-001 | 提交汇报给上级 | 文件移至待审批文件夹，上级收到通知 |
| TC-REP-002 | 上级审批通过 | 文件移至已通过文件夹，提交者收到通知 |
| TC-REP-003 | 上级审批驳回 | 文件移至已驳回文件夹，提交者收到通知 |
| TC-REP-004 | 上级查询下级汇报 | 返回下级所有汇报列表 |
| TC-REP-005 | 越权审批 | 拒绝操作，返回权限错误 |

---

## 九、后续工作

1. **优先级高 (P0)**
   - 实现组织连接管理核心功能
   - 实现汇报文件夹创建与权限控制
   - 实现审批工作流

2. **优先级中 (P1)**
   - 实现通知机制
   - 实现数据同步
   - CLI 命令开发

3. **优先级低 (P2)**
   - Web 界面开发
   - 移动端适配
   - 高级统计分析

---

*本文档为技术方案初稿，需要进一步评审和迭代*
