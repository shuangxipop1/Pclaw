# Pclaw HR 组织架构查看功能技术方案

## 任务信息
- **任务ID**: JJC-20260312-006
- **版本**: v1.0
- **更新日期**: 2026-03-12

---

## 一、需求概述

| 需求编号 | 描述 | 优先级 |
|----------|------|--------|
| REQ-HR-001 | 授权后查看组织架构图 | P0 |
| REQ-HR-002 | 基于现有 ORG_CONNECTION 功能 | P0 |
| REQ-HR-003 | 权限控制，只有授权用户可查看 | P0 |

---

## 二、设计理念

HR 组织架构查看是 ORG_CONNECTION 的可视化扩展：
- 数据来源：复用 ORG_CONNECTION 中的组织关系数据
- 权限模型：基于用户授权而非 Pclaw 身份
- 展示方式：树形组织架构图 + 表格视图

---

## 三、数据结构

### 3.1 授权用户配置

```typescript
interface HRAuthorization {
  authorizedUsers: AuthorizedUser[];
  lastUpdated: number;
}

interface AuthorizedUser {
  userId: string;           // 用户唯一标识
  displayName: string;      // 显示名称
  allowedRoles: HRRole[];   // 允许查看的角色范围
  allowedDepartments: string[];  // 允许查看的部门
  grantedAt: number;        // 授权时间
  grantedBy: string;        // 授权者
  expiresAt?: number;       // 过期时间（可选）
}

type HRRole = 
  | 'hr_admin'         // HR 管理员
  | 'department_head'  // 部门负责人  
  | 'team_leader'      // 团队负责人
  | 'member';          // 普通成员
```

### 3.2 组织架构节点

```typescript
interface OrgChartNode {
  pclawId: string;
  displayName: string;
  role: OrgRole;
  department: string;
  email?: string;
  phone?: string;
  status: 'online' | 'offline';
  children: OrgChartNode[];
  depth: number;
  parentId?: string;
}
```

### 3.3 视图模型

```typescript
interface OrgChartView {
  rootNodes: OrgChartNode[];
  totalNodes: number;
  departments: string[];
  lastSyncAt: number;
  viewableBy: string;  // 当前查看者的 userId
}
```

---

## 四、权限控制设计

### 4.1 授权流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户 A    │     │  HR 管理员   │     │   系统      │
│ (申请查看)  │────►│ (审批授权)  │────►│ (记录授权)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 4.2 权限级别

| 权限级别 | 可查看范围 |
|----------|------------|
| hr_admin | 全部组织架构 |
| department_head | 本部门及子部门 |
| team_leader | 本团队 |
| member | 仅自己 |

### 4.3 权限检查

```typescript
interface PermissionChecker {
  // 检查用户是否有权限查看组织架构
  canViewOrgChart(userId: string): Promise<boolean>;
  
  // 检查用户是否有权限查看特定部门
  canViewDepartment(userId: string, department: string): Promise<boolean>;
  
  // 检查用户是否有权限查看特定人员
  canViewMember(userId: string, targetPclawId: string): Promise<boolean>;
  
  // 获取用户可查看的部门列表
  getAllowedDepartments(userId: string): Promise<string[]>;
}
```

---

## 五、API 设计

### 5.1 组织架构服务

```typescript
interface HROrgChartService {
  // 获取组织架构图（需授权）
  getOrgChart(userId: string, options?: {
    department?: string;
    depth?: number;
  }): Promise<OrgChartView>;
  
  // 获取部门列表
  getDepartments(): Promise<Department[]>;
  
  // 获取部门人员
  getDepartmentMembers(department: string): Promise<OrgChartNode[]>;
  
  // 获取人员详情
  getMemberDetail(pclawId: string): Promise<OrgChartNode>;
}
```

### 5.2 授权管理服务

```typescript
interface HRAuthorizationService {
  // 授权用户查看组织架构
  authorizeUser(
    targetUserId: string,
    displayName: string,
    roles: HRRole[],
    departments: string[],
    grantedBy: string,
    expiresAt?: number
  ): Promise<void>;
  
  // 撤销用户权限
  revokeAuthorization(userId: string): Promise<void>;
  
  // 获取授权列表
  getAuthorizations(): Promise<AuthorizedUser[]>;
  
  // 检查用户权限
  checkAuthorization(userId: string): Promise<AuthorizedUser | null>;
}
```

---

## 六、存储设计

### 6.1 授权配置

```json
// ~/.pclaw/config/hr-authorization.json
{
  "authorizedUsers": [
    {
      "userId": "user_001",
      "displayName": "HR 张三",
      "allowedRoles": ["hr_admin"],
      "allowedDepartments": ["*"],
      "grantedAt": 1709234567000,
      "grantedBy": "admin"
    }
  ],
  "lastUpdated": 1709234567000
}
```

### 6.2 组织缓存

```json
// ~/.pclaw/cache/org-chart.json
{
  "departments": [
    {
      "id": "dept_001",
      "name": "设计部",
      "parentId": null,
      "headPclawId": "pclaw_001"
    }
  ],
  "members": {},
  "lastSyncAt": 1709234567000
}
```

---

## 七、CLI 命令设计

```bash
# 查看组织架构（需授权）
pclaw hr org-chart                    # 查看全部
pclaw hr org-chart --department 设计部  # 查看指定部门
pclaw hr org-chart --depth 2          # 查看深度

# 授权管理（仅 hr_admin）
pclaw hr authorize user_001 --roles hr_admin --depts *
pclaw hr authorize list
pclaw hr authorize revoke user_001

# 部门管理
pclaw hr department list
pclaw hr department members 设计部
```

---

## 八、输出格式

### 8.1 组织架构树形输出

```
🏢 组织架构图 (最后更新: 2026-03-12 10:00)

├── 👑 项目管理部
│   ├── 📋 设计经理 (张三) [在线]
│   │   ├── 🎨 设计师A [在线]
│   │   └── 🎨 设计师B [离线]
│   └── 📋 采购经理 (李四) [在线]
│       └── 📦 采购员A [在线]
└── 👷 施工部
    └── 🏗️ 施工经理 (王五) [在线]
```

### 8.2 表格输出

```
| 姓名   | 角色       | 部门     | 状态 |
|--------|------------|----------|------|
| 张三   | 设计经理   | 设计部   | 在线 |
| 李四   | 采购经理   | 采购部   | 在线 |
```

---

## 九、安全设计

### 9.1 权限验证流程

```typescript
class HRAuthorizationMiddleware {
  async validateAccess(userId: string): Promise<AuthorizedUser> {
    // 1. 检查用户是否已授权
    const auth = await this.authService.checkAuthorization(userId);
    if (!auth) {
      throw new ForbiddenError('未授权访问组织架构');
    }
    
    // 2. 检查授权是否过期
    if (auth.expiresAt && auth.expiresAt < Date.now()) {
      throw new ForbiddenError('授权已过期');
    }
    
    // 3. 返回授权信息
    return auth;
  }
}
```

### 9.2 审计日志

```typescript
interface AuditLog {
  action: 'view_org_chart' | 'authorize' | 'revoke';
  userId: string;
  targetUserId?: string;
  timestamp: number;
  ip?: string;
  result: 'success' | 'denied';
}
```

---

## 十、复用 ORG_CONNECTION 设计

本功能完全基于 ORG_CONNECTION 现有设计：

| ORG_CONNECTION 组件 | 复用方式 |
|---------------------|----------|
| OrgRelationship | 获取上下级关系构建树 |
| PclawIdentity | 获取人员基本信息 |
| ParentConnection/ChildConnection | 构建组织树节点 |
| ReportFolderManager | 未来可扩展汇报关系 |

---

## 十一、后续工作

1. **P0**
   - 实现授权管理核心功能
   - 实现组织架构图生成
   - 实现权限检查中间件

2. **P1**
   - CLI 命令完善
   - 缓存优化
   - 审计日志

3. **P2**
   - Web 界面
   - 实时同步
   - 统计分析

---

*本文档为技术方案初稿*
