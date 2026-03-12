/**
 * HR 组织架构服务
 * 基于 ORG_CONNECTION 数据构建
 */

import * as fs from 'fs';
import * as path from 'path';
import { OrgChartNode, OrgChartView, OrgRole, Department, OrgChartOptions } from './types';
import { HRAuthorizationService } from './authorization';

const CONFIG_DIR = path.join(process.env.HOME || '', '.pclaw', 'config');
const ORG_CONFIG = path.join(CONFIG_DIR, 'org.json');

export class HROrgChartService {
  private authService: HRAuthorizationService;

  constructor(authService: HRAuthorizationService) {
    this.authService = authService;
  }

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

  async getOrgChart(userId: string, options: OrgChartOptions = {}): Promise<OrgChartView> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      throw new Error('未授权查看组织架构');
    }

    this.authService['logAudit']({
      action: 'view_org_chart',
      userId,
      timestamp: Date.now(),
      result: 'success',
      details: `查看部门: ${options.department || '全部'}`
    } as any);

    const orgConfig = this.loadOrgConfig();
    const nodes = this.buildOrgTree(orgConfig, options.depth || 10);
    const filteredNodes = this.filterByPermission(nodes, auth.allowedDepartments);
    let finalNodes = filteredNodes;
    
    if (options.department) {
      finalNodes = this.filterByDepartment(filteredNodes, options.department);
    }

    const departments = this.extractDepartments(finalNodes);

    return {
      rootNodes: finalNodes,
      totalNodes: this.countNodes(finalNodes),
      departments,
      lastSyncAt: orgConfig.lastSyncAt || Date.now(),
      viewableBy: userId
    };
  }

  private buildOrgTree(orgConfig: any, maxDepth: number): OrgChartNode[] {
    const nodes: OrgChartNode[] = [];
    
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

    if (orgConfig.parents) {
      orgConfig.parents.forEach((parent: any) => {
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

        if (child.children && child.children.length > 0) {
          this.buildChildNodes(childNode, child.children, 3, maxDepth);
        }

        nodes.push(childNode);
        
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

  private filterByPermission(nodes: OrgChartNode[], allowedDepartments: string[]): OrgChartNode[] {
    if (allowedDepartments.includes('*')) {
      return nodes;
    }
    return nodes.filter(node => allowedDepartments.includes(node.department));
  }

  private filterByDepartment(nodes: OrgChartNode[], department: string): OrgChartNode[] {
    const result: OrgChartNode[] = [];
    
    const findAndInclude = (node: OrgChartNode): boolean => {
      if (node.department === department) {
        result.push(node);
        return true;
      }
      for (const child of node.children) {
        if (findAndInclude(child)) {
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

  private extractDepartments(nodes: OrgChartNode[]): string[] {
    const depts = new Set<string>();
    
    const collect = (node: OrgChartNode) => {
      depts.add(node.department);
      node.children.forEach(collect);
    };
    
    nodes.forEach(collect);
    return Array.from(depts).sort();
  }

  private countNodes(nodes: OrgChartNode[]): number {
    let count = nodes.length;
    nodes.forEach(node => {
      count += this.countNodes(node.children);
    });
    return count;
  }

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

  async getDepartmentMembers(department: string): Promise<OrgChartNode[]> {
    const orgConfig = this.loadOrgConfig();
    const members: OrgChartNode[] = [];

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

    orgConfig.parents?.forEach((p: any) => {
      if (this.roleToDepartment(p.role) === department) {
        members.push({
          pclawId: p.pclawId,
          displayName: p.displayName,
          role: p.role,
          department: this.roleToDepartment(p.role),
          status: p.status || 'offline',
          children: [],
          depth: 0
        });
      }
    });

    orgConfig.children?.forEach((c: any) => {
      if (this.roleToDepartment(c.role) === department) {
        members.push({
          pclawId: c.pclawId,
          displayName: c.displayName,
          role: c.role,
          department: this.roleToDepartment(c.role),
          status: c.status || 'offline',
          children: [],
          depth: 0
        });
      }
    });

    return members;
  }

  async getMemberDetail(pclawId: string): Promise<OrgChartNode | null> {
    const orgConfig = this.loadOrgConfig();

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

    for (const p of orgConfig.parents || []) {
      if (p.pclawId === pclawId) {
        return {
          pclawId: p.pclawId,
          displayName: p.displayName,
          role: p.role,
          department: this.roleToDepartment(p.role),
          status: p.status || 'offline',
          children: [],
          depth: 0
        };
      }
    }

    for (const c of orgConfig.children || []) {
      if (c.pclawId === pclawId) {
        return {
          pclawId: c.pclawId,
          displayName: c.displayName,
          role: c.role,
          department: this.roleToDepartment(c.role),
          status: c.status || 'offline',
          children: [],
          depth: 0
        };
      }
    }

    return null;
  }
}
