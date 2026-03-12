/**
 * HR 权限检查服务
 */

import { HRAuthorizationService } from './authorization';
import { AuthorizedUser } from './types';

export class HRPermissionChecker {
  private authService: HRAuthorizationService;

  constructor(authService: HRAuthorizationService) {
    this.authService = authService;
  }

  async canViewOrgChart(userId: string): Promise<boolean> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      return false;
    }
    return true;
  }

  async canViewDepartment(userId: string, department: string): Promise<boolean> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      return false;
    }

    if (auth.allowedDepartments.includes('*')) {
      return true;
    }

    return auth.allowedDepartments.includes(department);
  }

  async canViewMember(userId: string, targetPclawId: string): Promise<boolean> {
    return this.canViewOrgChart(userId);
  }

  async getAllowedDepartments(userId: string): Promise<string[]> {
    const auth = this.authService.checkAuthorization(userId);
    if (!auth) {
      return [];
    }
    return auth.allowedDepartments;
  }

  getUserRole(userId: string): AuthorizedUser | null {
    return this.authService.checkAuthorization(userId);
  }
}
