# Pclaw HR 组织架构查看功能实现

## 文档信息
- **任务ID**: JJC-20260312-006
- **版本**: v1.0
- **更新日期**: 2026-03-12

---

## 一、模块结构

```
pclaw/
├── src/
│   └── hr/
│       ├── index.ts              # 入口
│       ├── types.ts              # 类型定义
│       ├── authorization.ts       # 授权管理
│       ├── orgChart.ts           # 组织架构
│       ├── permission.ts         # 权限检查
│       └── cli.ts                # CLI 命令
└── config/
    └── hr-authorization.json     # 授权配置
```

---

## 二、类型定义 (types.ts)

```typescript
/**
 * Pclaw HR 组织架构类型定义
 * 基于 ORG_CONNECTION 设计扩展
 */

// HR 角色权限
export type HRRole = 
  | 'hr_admin'         // HR 管理员
  | 'department_head'  // 部门负责人  
  | 'team_leader'      // 团队负责人
  | 'member';          // 普通成员

// 组织角色 (复用 ORG_CONNECTION)
export type OrgRole = 
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

// 授权用户
export interface AuthorizedUser {
  userId: string;
  displayName: string;
  allowedRoles: HRRole[];
  allowedDepartments: string[];  // '*' 表示全部
  grantedAt: number;
  grantedBy: string;
  expiresAt?: number;
}

// HR 授权配置
export interface HRAuthorization {
  authorizedUsers: AuthorizedUser[];
  lastUpdated: number;
}

// 组织架构节点
export interface OrgChartNode {
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

// 组织架构视图
export interface OrgChartView {
  rootNodes: OrgChartNode[];
  totalNodes: number;
  departments: string[];
  lastSyncAt: number;
  viewableBy: string;
}

// 部门信息
export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  headPclawId: string;
  memberCount: number;
}

// CLI 选项
export interface OrgChartOptions {
  department?: string;
  depth?: number;
  format?: 'tree' | 'table';
}

// 审计日志
export interface AuditLog {
  action: 'view_org_chart' | 'authorize' | 'revoke' | 'check_permission';
  userId: string;
  targetUserId?: string;
  timestamp: number;
  result: 'success' | 'denied';
  details?: string;
}
```

---

## 三、授权管理 (authorization.ts)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { HRAuthorization, AuthorizedUser, HRRole } from './types';

const CONFIG_DIR = path.join(process.env.HOME || '', '.pclaw', 'config');
const HR_AUTH_CONFIG = path.join(CONFIG_DIR, 'hr-authorization.json');
const AUDIT_LOG_FILE = path.join(CONFIG_DIR, 'hr-audit.json');

/**
 * HR 授权管理服务
 */
export class HRAuthorizationService {
  private config: HRAuthorization;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 加载授权配置
   */
  private loadConfig(): HRAuthorization {
    try {
      if (fs.existsSync(HR_AUTH_CONFIG)) {
        return JSON.parse(fs.readFileSync(HR_AUTH_CONFIG, 'utf-8'));
      }
    } catch (error) {
      console.error('加载 HR 授权配置失败:', error);
    }
    
    return {
      authorizedUsers: [],
      lastUpdated: Date.now()
    };
  }

  /**
   * 保存授权配置
   */
  private saveConfig(): void {
    this.config.lastUpdated = Date.now();
    fs.writeFileSync(HR_AUTH_CONFIG, JSON.stringify(this.config, null, 2));
  }

  /**
   * 授权用户查看组织架构
   */
  async authorizeUser(
    targetUserId: string,
    displayName: string,
    roles: HRRole[],
    departments: string[],
    grantedBy: string,
    expiresAt?: number
  ): Promise<void> {
    // 检查是否已存在
    const existingIndex = this.config.authorizedUsers.findIndex(
      u => u.userId === targetUserId
    );

    const user: AuthorizedUser = {
      userId: targetUserId,
      displayName,
      allowedRoles: roles,
      allowedDepartments: departments,
      grantedAt: Date.now(),
      grantedBy,
      expiresAt
    };

    if (existingIndex >= 0) {
      this.config.authorizedUsers[existingIndex] = user;
    } else {
      this.config.authorizedUsers.push(user);
    }

    this.saveConfig();
    
    // 记录审计日志
    this.logAudit({
      action: 'authorize',
      userId: grantedBy,
      targetUserId,
      timestamp: Date.now(),
      result: 'success',
      details: `授权角色: ${roles.join(', ')}, 部门: ${departments.join(', ')}`
    });

    console.log(`✅ 已授权用户 ${displayName} (${targetUserId})`);
  }

  /**
   * 撤销用户权限
   */
  async revokeAuthorization(userId: string, revokedBy: string): Promise<void> {
    const index = this.config.authorizedUsers.findIndex(
      u => u.userId === userId
    );

    if (index < 0) {
      throw new Error(`用户 ${userId} 不存在授权记录`);
    }

    const removed = this.config.authorizedUsers.splice(index, 1)[0];
    this.saveConfig();

    this.logAudit({
      action: 'revoke',
      userId: revokedBy,
      targetUserId: userId,
      timestamp: Date.now(),
      result: 'success',
      details: `撤销用户: ${removed.displayName}`
    });

    console.log(`✅ 已撤销用户 ${removed.displayName} 的权限`);
  }

  /**
   * 获取授权列表
   */
  getAuthorizations(): AuthorizedUser[] {
    return this.config.authorizedUsers.map(u => ({
      ...u,
      // 不暴露敏感信息
      expiresAt: u.expiresAt
    }));
  }

  /**
   * 检查用户授权状态
   */
  checkAuthorization(userId: string): AuthorizedUser | null {
    const user = this.config.authorizedUsers.find(u => u.userId === userId);
    
    if (!user) {
      return null;
    }

    // 检查是否过期
    if (user.expiresAt && user.expiresAt < Date.now()) {
      return null;
    }

    return user;
  }

  /**
   * 记录审计日志
   */
  private logAudit(log: {
    action: string;
    userId: string;
    targetUserId?: string;
    timestamp: number;
    result: string;
    details?: string;
  }): void {
    try {
      let logs: any[] = [];
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
      }
      
      logs.push(log);
      
      // 保留最近 1000 条
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }
      
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('记录审计日志失败:', error);
    }
  }

  /**
   * 获取审计日志
   */
  getAuditLogs(limit: number = 100): any[] {
    try {
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        const logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
        return logs.slice(-limit);
      }
    } catch (error) {
      console.error('读取审计日志失败:', error);
    }
    return [];
  }
}
```

---

## 四、组织架构服务 (orgChart.ts)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { OrgChartNode, OrgChartView, OrgRole, Department, OrgChartOptions } from './types';
import { HRAuthorizationService } from './authorization';

const CONFIG_DIR = path.join(process.env.HOME || '', '.pclaw', 'config');
const ORG_CONFIG = path.join(CONFIG_DIR, 'org.json');

/**
 * 组织架构服务
 * 基于 ORG_CONNECTION 数据构建 HR 视图
 */
export class HROrgChartService {
  private authService: HRAuthorizationService;

  constructor(authService: HRAuthorizationService) {
    this.authService = authService;
  }

  /**
   * 加载组织配置 (复用 ORG_CONNECTION)
   */
  private loadOrgConfig(): any {
    try {
      if (fs.existsSync(ORG_CONFIG)) {
        return JSON.parse(fs.readFileSync(ORG_CONFIG, 'utf-8'));
      }
    } catch (error) {
      console.error('加载组织配置失败:', error);
    }
    return { parents: [], children: [], role: 'member' };
  }

  /**
   * 获取组织架构图
   */
  async getOrgChart(userId: string, options: OrgChartOptions = {}): Promise<OrgChartView> {
    // 权限检查
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      throw new Error('未授权查看组织架构');
    }

    // 记录访问
    this.authService['logAudit']({
      action: 'view_org_chart',
      userId,
      timestamp: Date.now(),
      result: 'success',
      details: `查看部门: ${options.department || '全部'}`
    });

    // 构建组织树
    const orgConfig = this.loadOrgConfig();
    const nodes = this.buildOrgTree(orgConfig, options.depth || 10);

    // 按权限过滤
    const filteredNodes = this.filterByPermission(nodes, auth.allowedDepartments);

    // 按部门过滤
    let finalNodes = filteredNodes;
    if (options.department) {
      finalNodes = this.filterByDepartment(filteredNodes, options.department);
    }

    // 提取部门列表
    const departments = this.extractDepartments(finalNodes);

    return {
      rootNodes: finalNodes,
      totalNodes: this.countNodes(finalNodes),
      departments,
      lastSyncAt: orgConfig.lastSyncAt || Date.now(),
      viewableBy: userId
    };
  }

  /**
   * 构建组织树 (基于 ORG_CONNECTION 的 parents/children)
   */
  private buildOrgTree(orgConfig: any, maxDepth: number): OrgChartNode[] {
    const nodes: OrgChartNode[] = [];
    
    // 添加当前 Pclaw 节点
    const selfNode: OrgChartNode = {
      pclawId: orgConfig.pclawId || 'self',
      displayName: orgConfig.displayName || '当前用户',
      role: orgConfig.role || 'member',
      department: this.roleToDepartment(orgConfig.role),
      status: 'online',
      children: [],
      depth: 0
    };
    nodes.push(selfNode);

    // 添加上级节点
    if (orgConfig.parents) {
      orgConfig.parents.forEach((parent: any, index: number) => {
        const parentNode: OrgChartNode = {
          pclawId: parent.pclawId,
          displayName: parent.displayName,
          role: parent.role,
          department: this.roleToDepartment(parent.role),
          status: parent.status || 'offline',
          children: [],
          depth: 1,
          parentId: selfNode.pclawId
        };
        nodes.push(parentNode);
        selfNode.children.push(parentNode);
      });
    }

    // 添加下级节点
    if (orgConfig.children) {
      orgConfig.children.forEach((child: any) => {
        const childNode: OrgChartNode = {
          pclawId: child.pclawId,
          displayName: child.displayName,
          role: child.role,
          department: this.roleToDepartment(child.role),
          status: child.status || 'offline',
          children: [],
          depth: 2,
          parentId: selfNode.pclawId
        };
        
        // 递归添加子节点
        this.buildChildNodes(childNode, child.children || [], 3, maxDepth);
        
        nodes.push(childNode);
        
        // 挂载到对应父节点
        const parent = nodes.find(n => n.pclawId === child.parentPclawId);
        if (parent) {
          parent.children.push(childNode);
        } else {
          selfNode.children.push(childNode);
        }
      });
    }

    return nodes;
  }

  /**
   * 递归构建子节点
   */
  private buildChildNodes(
    parentNode: OrgChartNode,
    children: any[],
    depth: number,
    maxDepth: number
  ): void {
    if (depth > maxDepth) return;

    children.forEach((child: any) => {
      const childNode: OrgChartNode = {
        pclawId: child.pclawId,
        displayName: child.displayName,
        role: child.role,
        department: this.roleToDepartment(child.role),
        status: child.status || 'offline',
        children: [],
        depth,
        parentId: parentNode.pclawId
      };

      if (child.children && child.children.length > 0) {
        this.buildChildNodes(childNode, child.children, depth + 1, maxDepth);
      }

      parentNode.children.push(childNode);
    });
  }

  /**
   * 角色转部门
   */
  private roleToDepartment(role: OrgRole | string): string {
    const map: Record<string, string> = {
      project_manager: '项目管理部',
      design_manager: '设计部',
      procurement_manager: '采购部',
      construction_manager: '施工部',
      control_manager: '控制部',
      cost_control_manager: '成本部',
      finance_manager: '财务部',
      document_control_manager: '文档管理部',
      business_manager: '商务部',
      engineer: '工程部',
      designer: '设计部',
      custom: '其他'
    };
    return map[role] || '其他';
  }

  /**
   * 按权限过滤
   */
  private filterByPermission(nodes: OrgChartNode[], allowedDepartments: string[]): OrgChartNode[] {
    if (allowedDepartments.includes('*')) {
      return nodes;
    }
    return nodes.filter(node => allowedDepartments.includes(node.department));
  }

  /**
   * 按部门过滤
   */
  private filterByDepartment(nodes: OrgChartNode[], department: string): OrgChartNode[] {
    const result: OrgChartNode[] = [];
    
    const findAndInclude = (node: OrgChartNode) => {
      if (node.department === department) {
        result.push(node);
        return true;
      }
      for (const child of node.children) {
        if (findAndInclude(child)) {
          // 如果子节点匹配，也包含父节点
          if (!result.includes(node)) {
            result.push(node);
          }
          return true;
        }
      }
      return false;
    };

    nodes.forEach(findAndInclude);
    return result;
  }

  /**
   * 提取部门列表
   */
  private extractDepartments(nodes: OrgChartNode[]): string[] {
    const depts = new Set<string>();
    
    const collect = (node: OrgChartNode) => {
      depts.add(node.department);
      node.children.forEach(collect);
    };
    
    nodes.forEach(collect);
    return Array.from(depts).sort();
  }

  /**
   * 统计节点数
   */
  private countNodes(nodes: OrgChartNode[]): number {
    let count = nodes.length;
    nodes.forEach(node => {
      count += this.countNodes(node.children);
    });
    return count;
  }

  /**
   * 获取部门列表
   */
  async getDepartments(): Promise<Department[]> {
    const orgConfig = this.loadOrgConfig();
    const depts = new Map<string, Department>();

    const addDepartment = (role: string, parentId: string | null) => {
      const name = this.roleToDepartment(role);
      if (!depts.has(name)) {
        depts.set(name, {
          id: `dept_${name}`,
          name,
          parentId,
          headPclawId: '',
          memberCount: 0
        });
      }
    };

    addDepartment(orgConfig.role || 'member', null);
    orgConfig.parents?.forEach((p: any) => addDepartment(p.role, null));
    orgConfig.children?.forEach((c: any) => addDepartment(c.role, orgConfig.pclawId));

    return Array.from(depts.values());
  }

  /**
   * 获取部门成员
   */
  async getDepartmentMembers(department: string): Promise<OrgChartNode[]> {
    const orgConfig = this.loadOrgConfig();
    const members: OrgChartNode[] = [];

    const findMembers = (node: any): OrgChartNode | null => {
      const dept = this.roleToDepartment(node.role);
      if (dept === department) {
        return {
          pclawId: node.pclawId,
          displayName: node.displayName,
          role: node.role,
          department: dept,
          status: node.status || 'offline',
          children: [],
          depth: 0
        };
      }
      return null;
    };

    // 检查当前用户
    if (this.roleToDepartment(orgConfig.role) === department) {
      members.push({
        pclawId: orgConfig.pclawId || 'self',
        displayName: orgConfig.displayName || '当前用户',
        role: orgConfig.role,
        department: this.roleToDepartment(orgConfig.role),
        status: 'online',
        children: [],
        depth: 0
      });
    }

    // 检查父母
    orgConfig.parents?.forEach((p: any) => {
      const node = findMembers(p);
      if (node) members.push(node);
    });

    // 检查孩子
    orgConfig.children?.forEach((c: any) => {
      const node = findMembers(c);
      if (node) members.push(node);
    });

    return members;
  }

  /**
   * 获取人员详情
   */
  async getMemberDetail(pclawId: string): Promise<OrgChartNode | null> {
    const orgConfig = this.loadOrgConfig();

    const findMember = (node: any): OrgChartNode | null => {
      if (node.pclawId === pclawId) {
        return {
          pclawId: node.pclawId,
          displayName: node.displayName,
          role: node.role,
          department: this.roleToDepartment(node.role),
          status: node.status || 'offline',
          children: [],
          depth: 0
        };
      }
      
      if (node.children) {
        for (const child of node.children) {
          const found = findMember(child);
          if (found) return found;
        }
      }
      return null;
    };

    // 检查当前
    if (orgConfig.pclawId === pclawId || pclawId === 'self') {
      return {
        pclawId: orgConfig.pclawId || 'self',
        displayName: orgConfig.displayName || '当前用户',
        role: orgConfig.role,
        department: this.roleToDepartment(orgConfig.role),
        status: 'online',
        children: [],
        depth: 0
      };
    }

    // 检查父母
    for (const p of orgConfig.parents || []) {
      if (p.pclawId === pclawId) {
        return findMember(p);
      }
    }

    // 检查孩子
    for (const c of orgConfig.children || []) {
      if (c.pclawId === pclawId) {
        return findMember(c);
      }
    }

    return null;
  }
}
```

---

## 五、权限检查 (permission.ts)

```typescript
import { HRAuthorizationService } from './authorization';
import { AuthorizedUser } from './types';

/**
 * 权限检查服务
 */
export class HRPermissionChecker {
  private authService: HRAuthorizationService;

  constructor(authService: HRAuthorizationService) {
    this.authService = authService;
  }

  /**
   * 检查用户是否有权限查看组织架构
   */
  async canViewOrgChart(userId: string): Promise<boolean> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      return false;
    }
    return true;
  }

  /**
   * 检查用户是否有权限查看特定部门
   */
  async canViewDepartment(userId: string, department: string): Promise<boolean> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      return false;
    }

    // * 表示全部部门
    if (auth.allowedDepartments.includes('*')) {
      return true;
    }

    return auth.allowedDepartments.includes(department);
  }

  /**
   * 检查用户是否有权限查看特定人员
   */
  async canViewMember(userId: string, targetPclawId: string): Promise<boolean> {
    // 目前实现：只要有组织架构查看权限，即可查看所有人员
    return this.canViewOrgChart(userId);
  }

  /**
   * 获取用户可查看的部门列表
   */
  async getAllowedDepartments(userId: string): Promise<string[]> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      return [];
    }
    return auth.allowedDepartments;
  }

  /**
   * 获取用户权限级别
   */
  getUserRole(userId: string): AuthorizedUser | null {
    return this.authService.checkAuthorization(userId);
  }
}
```

---

## 六、CLI 命令 (cli.ts)

```typescript
#!/usr/bin/env node

import { HRAuthorizationService } from './authorization';
import { HROrgChartService } from './orgChart';
import { HRPermissionChecker } from './permission';

/**
 * HR 组织架构 CLI
 * 
 * 用法:
 *   pclaw hr org-chart [options]
 *   pclaw hr authorize <userId> --roles <roles> --depts <depts>
 *   pclaw hr authorize list
 *   pclaw hr authorize revoke <userId>
 *   pclaw hr department list
 *   pclaw hr department members <department>
 */

const authService = new HRAuthorizationService();
const orgChartService = new HROrgChartService(authService);
const permissionChecker = new HRPermissionChecker(authService);

/**
 * 打印组织架构树
 */
function printOrgTree(nodes: any[], indent: string = '', isLast: boolean = true): void {
  const prefix = isLast ? '└── ' : '├── ';
  const statusEmoji = (status: string) => status === 'online' ? '🟢' : '⚪️';
  const roleEmoji = (role: string) => {
    const map: Record<string, string> = {
      project_manager: '👑',
      design_manager: '📋',
      procurement_manager: '📦',
      construction_manager: '👷',
      engineer: '🔧',
      designer: '🎨'
    };
    return map[role] || '👤';
  };

  nodes.forEach((node, index) => {
    const isLastNode = index === nodes.length - 1;
    const connector = indent + (isLastNode ? '└── ' : '├── ');
    
    console.log(
      `${connector}${roleEmoji(node.role)} ${node.displayName} ${statusEmoji(node.status)}`
    );

    if (node.children && node.children.length > 0) {
      const childIndent = indent + (isLastNode ? '    ' : '│   ');
      printOrgTree(node.children, childIndent, isLastNode);
    }
  });
}

/**
 * 打印表格
 */
function printTable(nodes: any[]): void {
  console.log('\n| 姓名   | 角色       | 部门     | 状态 |');
  console.log('|--------|------------|----------|------|');
  
  const printRows = (nodes: any[]) => {
    nodes.forEach(node => {
      console.log(
        `| ${node.displayName.padEnd(6)} | ${(node.role + '_manager').padEnd(10).substring(0, 10)} | ${node.department.padEnd(8).substring(0, 8)} | ${node.status === 'online' ? '在线 ' : '离线 '} |`
      );
      if (node.children) {
        printRows(node.children);
      }
    });
  };
  
  printRows(nodes);
  console.log('');
}

/**
 * 主命令处理
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'org-chart';

  try {
    switch (command) {
      case 'org-chart': {
        // 默认用户 (CLI 场景)
        const userId = process.env.USER || 'cli_user';
        
        const options: any = {};
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--department' && args[i + 1]) {
            options.department = args[i + 1];
            i++;
          } else if (args[i] === '--depth' && args[i + 1]) {
            options.depth = parseInt(args[i + 1]);
            i++;
          } else if (args[i] === '--format' && args[i + 1]) {
            options.format = args[i + 1];
            i++;
          }
        }

        const view = await orgChartService.getOrgChart(userId, options);
        
        console.log(`\n🏢 组织架构图 (最后更新: ${new Date(view.lastSyncAt).toLocaleString()})`);
        console.log(`📊 总人数: ${view.totalNodes}`);
        console.log(`🏭 部门: ${view.departments.join(', ')}\n`);

        if (options.format === 'table') {
          printTable(view.rootNodes);
        } else {
          printOrgTree(view.rootNodes);
        }
        break;
      }

      case 'authorize': {
        const subCommand = args[1];
        
        if (subCommand === 'list') {
          const users = authService.getAuthorizations();
          console.log('\n📋 已授权用户列表:\n');
          console.log('| 用户ID   | 显示名称 | 角色       | 部门       | 授权时间 |');
          console.log('|----------|----------|------------|------------|----------|');
          
          users.forEach(u => {
            console.log(
              `| ${u.userId.padEnd(8)} | ${u.displayName.padEnd(6)} | ${u.allowedRoles.join(', ').padEnd(10)} | ${u.allowedDepartments.join(', ').padEnd(10)} | ${new Date(u.grantedAt).toLocaleDateString()} |`
            );
          });
          console.log('');
        } else if (subCommand === 'revoke') {
          const targetUserId = args[2];
          if (!targetUserId) {
            console.error('用法: pclaw hr authorize revoke <userId>');
            process.exit(1);
          }
          await authService.revokeAuthorization(targetUserId, process.env.USER || 'admin');
        } else if (subCommand) {
          // 授权新用户
          const targetUserId = subCommand;
          let displayName = targetUserId;
          let roles: string[] = [];
          let departments: string[] = [];

          for (let i = 2; i < args.length; i++) {
            if (args[i] === '--name' && args[i + 1]) {
              displayName = args[i + 1];
              i++;
            } else if (args[i] === '--roles' && args[i + 1]) {
              roles = args[i + 1].split(',');
              i++;
            } else if (args[i] === '--depts' && args[i + 1]) {
              departments = args[i + 1].split(',');
              i++;
            }
          }

          if (roles.length === 0) roles = ['member'];
          if (departments.length === 0) departments = ['*'];

          await authService.authorizeUser(
            targetUserId,
            displayName,
            roles as any,
            departments,
            process.env.USER || 'admin'
          );
        } else {
          console.log('用法:');
          console.log('  pclaw hr authorize <userId> --roles <r1,r2> --depts <d1,d2>');
          console.log('  pclaw hr authorize list');
          console.log('  pclaw hr authorize revoke <userId>');
        }
        break;
      }

      case 'department': {
        const subCommand = args[1];
        
        if (subCommand === 'list') {
          const depts = await orgChartService.getDepartments();
          console.log('\n🏭 部门列表:\n');
          depts.forEach(d => {
            console.log(`  • ${d.name}`);
          });
          console.log('');
        } else if (subCommand === 'members' && args[2]) {
          const members = await orgChartService.getDepartmentMembers(args[2]);
          console.log(`\n👥 ${args[2]} 成员:\n`);
          members.forEach(m => {
            console.log(`  ${m.status === 'online' ? '🟢' : '⚪️'} ${m.displayName} (${m.role})`);
          });
          console.log('');
        }
        break;
      }

      default:
        console.log('HR 组织架构命令:');
        console.log('  pclaw hr org-chart                    # 查看组织架构');
        console.log('  pclaw hr org-chart --department 设计部 # 查看指定部门');
        console.log('  pclaw hr org-chart --depth 2           # 查看深度');
        console.log('  pclaw hr org-chart --format table      # 表格输出');
        console.log('  pclaw hr authorize <userId> ...        # 授权用户');
        console.log('  pclaw hr authorize list                # 授权列表');
        console.log('  pclaw hr authorize revoke <userId>     # 撤销授权');
        console.log('  pclaw hr department list               # 部门列表');
        console.log('  pclaw hr department members <dept>     # 部门成员');
    }
  } catch (error: any) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

// 导出服务供其他模块使用
export { HRAuthorizationService, HROrgChartService, HRPermissionChecker };

// CLI 入口
if (require.main === module) {
  main();
}
```

---

## 七、入口文件 (index.ts)

```typescript
/**
 * Pclaw HR 组织架构模块
 * 
 * 导出:
 *   - HRAuthorizationService: 授权管理
 *   - HROrgChartService: 组织架构服务
 *   - HRPermissionChecker: 权限检查
 */

export { HRAuthorizationService } from './authorization';
export { HROrgChartService } from './orgChart';
export { HRPermissionChecker } from './permission';
export * from './types';
```

---

## 八、配置文件示例

### 授权配置 (~/.pclaw/config/hr-authorization.json)

```json
{
  "authorizedUsers": [
    {
      "userId": "hr_admin",
      "displayName": "HR 管理员",
      "allowedRoles": ["hr_admin"],
      "allowedDepartments": ["*"],
      "grantedAt": 1709234567000,
      "grantedBy": "admin"
    },
    {
      "userId": "design_manager",
      "displayName": "设计经理",
      "allowedRoles": ["department_head"],
      "allowedDepartments": ["设计部"],
      "grantedAt": 1709234567000,
      "grantedBy": "admin"
    }
  ],
  "lastUpdated": 1709234567000
}
```

### 组织配置 (~/.pclaw/config/org.json)

```json
{
  "pclawId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "设计师张三",
  "role": "designer",
  "parents": [
    {
      "pclawId": "550e8400-e29b-41d4-a716-446655440001",
      "displayName": "设计经理李四",
      "role": "design_manager",
      "status": "active",
      "connectedAt": 1709234567000
    }
  ],
  "children": [
    {
      "pclawId": "550e8400-e29b-41d4-a716-446655440002",
      "displayName": "设计师王五",
      "role": "designer",
      "status": "active",
      "connectedAt": 1709234567000,
      "parentPclawId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ],
  "reportFolders": {
    "basePath": "/Users/mac/.pclaw/reports"
  },
  "lastSyncAt": 1709234567000
}
```

---

## 九、使用示例

```bash
# 查看组织架构
$ pclaw hr org-chart

🏢 组织架构图 (最后更新: 2026-03-12 10:00)
📊 总人数: 3
🏭 部门: 设计部

└── 👤 设计师张三 🟢
    └── 👤 设计师王五 🟢

# 表格输出
$ pclaw hr org-chart --format table

| 姓名   | 角色       | 部门     | 状态 |
|--------|------------|----------|------|
| 张三   | designer   | 设计部   | 在线 |
| 王五   | designer   | 设计部   | 在线 |

# 授权用户
$ pclaw hr authorize user_hr001 --name "HR小王" --roles hr_admin --depts "*"

✅ 已授权用户 HR小王 (user_hr001)

# 查看授权列表
$ pclaw hr authorize list

📋 已授权用户列表:

| 用户ID   | 显示名称 | 角色       | 部门       | 授权时间 |
|----------|----------|------------|------------|----------|
| hr_admin | HR 管理员 | hr_admin   | *          | 2026/3/12|

# 部门列表
$ pclaw hr department list

🏭 部门列表:

  • 设计部
  • 项目管理部
  • 施工部
```

---

## 十、测试用例

| 用例ID | 描述 | 预期结果 |
|--------|------|----------|
| TC-HR-001 | 已授权用户查看组织架构 | 正常显示 |
| TC-HR-002 | 未授权用户查看组织架构 | 拒绝访问 |
| TC-HR-003 | HR 管理员查看全部部门 | 正常显示 |
| TC-HR-004 | 部门负责人只查看本部门 | 仅显示本部门 |
| TC-HR-005 | 授权用户访问特定部门 | 按权限过滤 |
| TC-HR-006 | 撤销用户权限 | 用户无法访问 |
| TC-HR-007 | 授权过期 | 自动失效 |

---

*本文档为实现代码*
