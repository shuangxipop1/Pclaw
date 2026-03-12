/**
 * Pclaw Modules - Permission Management
 * 权限管理：角色权限 + 访问控制
 */

const { v4: uuidv4 } = require('uuid');

class PermissionManager {
  constructor() {
    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map();
    
    // 初始化默认角色
    this.initDefaultRoles();
  }

  /**
   * 初始化默认角色
   */
  initDefaultRoles() {
    const defaultRoles = [
      {
        id: 'role_admin',
        name: '管理员',
        description: '系统管理员',
        permissions: ['*'],
        isSystem: true
      },
      {
        id: 'role_pm',
        name: '项目经理',
        description: '项目管理角色',
        permissions: [
          'task.create', 'task.read', 'task.update', 'task.delete',
          'project.create', 'project.read', 'project.update',
          'org.read', 'org.update',
          'confirm.approve', 'confirm.reject',
          'report.read'
        ],
        isSystem: true
      },
      {
        id: 'role_design',
        name: '设计经理',
        description: '设计管理角色',
        permissions: [
          'task.create', 'task.read', 'task.update',
          'project.read',
          'design.read', 'design.create', 'design.update',
          'confirm.read'
        ],
        isSystem: true
      },
      {
        id: 'role_construction',
        name: '施工经理',
        description: '施工管理角色',
        permissions: [
          'task.create', 'task.read', 'task.update',
          'project.read',
          'construction.read', 'construction.create', 'construction.update',
          'confirm.read', 'inspection.create'
        ],
        isSystem: true
      },
      {
        id: 'role_member',
        name: '普通成员',
        description: '基本成员权限',
        permissions: [
          'task.read', 'task.update:own',
          'project.read',
          'confirm.read'
        ],
        isSystem: true
      }
    ];
    
    for (const role of defaultRoles) {
      this.roles.set(role.id, role);
    }
  }

  /**
   * 创建角色
   */
  createRole(data) {
    const { name, description, permissions = [], parentRole } = data;
    const roleId = `role_${uuidv4().slice(0, 8)}`;
    
    let finalPermissions = [...permissions];
    if (parentRole) {
      const parent = this.roles.get(parentRole);
      if (parent) {
        finalPermissions = [...parent.permissions, ...permissions];
      }
    }
    
    const role = {
      id: roleId,
      name,
      description,
      permissions: [...new Set(finalPermissions)],
      parentRole,
      createdAt: new Date().toISOString()
    };
    
    this.roles.set(roleId, role);
    return role;
  }

  /**
   * 分配角色给用户
   */
  assignRole(userId, roleId) {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, []);
    }
    
    const roles = this.userRoles.get(userId);
    if (!roles.includes(roleId)) {
      roles.push(roleId);
    }
    
    return roles;
  }

  /**
   * 检查权限
   */
  checkPermission(userId, permission) {
    const roles = this.userRoles.get(userId) || [];
    
    for (const roleId of roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      
      // 管理员拥有所有权限
      if (role.permissions.includes('*')) {
        return true;
      }
      
      // 精确匹配
      if (role.permissions.includes(permission)) {
        return true;
      }
      
      // 前缀匹配 (e.g., 'task.read' 匹配 'task.read:own')
      for (const p of role.permissions) {
        if (permission.startsWith(p.split(':')[0])) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * 获取用户权限列表
   */
  getUserPermissions(userId) {
    const roles = this.userRoles.get(userId) || [];
    const permissions = new Set();
    
    for (const roleId of roles) {
      const role = this.roles.get(roleId);
      if (role) {
        for (const p of role.permissions) {
          permissions.add(p);
        }
      }
    }
    
    return Array.from(permissions);
  }

  /**
   * 获取角色
   */
  getRole(roleId) {
    return this.roles.get(roleId);
  }

  /**
   * 获取所有角色
   */
  getAllRoles() {
    return Array.from(this.roles.values());
  }
}

module.exports = { PermissionManager };
