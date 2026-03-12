/**
 * Pclaw HR 组织架构类型定义
 * 基于 ORG_CONNECTION 设计扩展
 */

export type HRRole = 
  | 'hr_admin'         // HR 管理员
  | 'department_head'  // 部门负责人  
  | 'team_leader'      // 团队负责人
  | 'member';          // 普通成员

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

export interface AuthorizedUser {
  userId: string;
  displayName: string;
  allowedRoles: HRRole[];
  allowedDepartments: string[];  // '*' 表示全部
  grantedAt: number;
  grantedBy: string;
  expiresAt?: number;
}

export interface HRAuthorization {
  authorizedUsers: AuthorizedUser[];
  lastUpdated: number;
}

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

export interface OrgChartView {
  rootNodes: OrgChartNode[];
  totalNodes: number;
  departments: string[];
  lastSyncAt: number;
  viewableBy: string;
}

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  headPclawId: string;
  memberCount: number;
}

export interface OrgChartOptions {
  department?: string;
  depth?: number;
  format?: 'tree' | 'table';
}

export interface AuditLog {
  action: 'view_org_chart' | 'authorize' | 'revoke' | 'check_permission';
  userId: string;
  targetUserId?: string;
  timestamp: number;
  result: 'success' | 'denied';
  details?: string;
}
