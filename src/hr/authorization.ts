/**
 * HR 授权管理服务
 */

import * as fs from 'fs';
import * as path from 'path';
import { HRAuthorization, AuthorizedUser, HRRole, AuditLog } from './types';

const CONFIG_DIR = path.join(process.env.HOME || '', '.pclaw', 'config');
const HR_AUTH_CONFIG = path.join(CONFIG_DIR, 'hr-authorization.json');
const AUDIT_LOG_FILE = path.join(CONFIG_DIR, 'hr-audit.json');

export class HRAuthorizationService {
  private config: HRAuthorization;

  constructor() {
    this.ensureConfigDir();
    this.config = this.loadConfig();
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }

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

  private saveConfig(): void {
    this.config.lastUpdated = Date.now();
    fs.writeFileSync(HR_AUTH_CONFIG, JSON.stringify(this.config, null, 2));
  }

  async authorizeUser(
    targetUserId: string,
    displayName: string,
    roles: HRRole[],
    departments: string[],
    grantedBy: string,
    expiresAt?: number
  ): Promise<void> {
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

  getAuthorizations(): AuthorizedUser[] {
    return this.config.authorizedUsers.map(u => ({
      ...u,
      expiresAt: u.expiresAt
    }));
  }

  checkAuthorization(userId: string): AuthorizedUser | null {
    const user = this.config.authorizedUsers.find(u => u.userId === userId);
    
    if (!user) {
      return null;
    }

    if (user.expiresAt && user.expiresAt < Date.now()) {
      return null;
    }

    return user;
  }

  private logAudit(log: AuditLog): void {
    try {
      let logs: AuditLog[] = [];
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
      }
      
      logs.push(log);
      
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }
      
      fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('记录审计日志失败:', error);
    }
  }

  getAuditLogs(limit: number = 100): AuditLog[] {
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
