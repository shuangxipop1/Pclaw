/**
 * Pclaw - Main Entry
 * 主入口：整合所有模块
 */

const { PclawCore } = require('./src/core');
const { OrganizationManager } = require('./src/modules/org');
const { TaskManager } = require('./src/modules/task');
const { PermissionManager } = require('./src/modules/permission');

class Pclaw {
  constructor() {
    // 核心层
    this.core = new PclawCore();
    
    // 功能模块
    this.org = new OrganizationManager();
    this.task = new TaskManager();
    this.permission = new PermissionManager();
    
    // 初始化示例数据
    this.initDemo();
  }

  /**
   * 初始化示例数据
   */
  initDemo() {
    // 创建示例组织
    const ceo = this.org.createNode({
      name: '总经理',
      type: 'human',
      role: 'CEO',
      parentId: null
    });
    
    const pm = this.org.createNode({
      name: '项目经理',
      type: 'human',
      role: 'PM',
      parentId: ceo.id
    });
    
    const design = this.org.createNode({
      name: '设计Agent',
      type: 'agent',
      role: 'Design',
      parentId: pm.id
    });
    
    const construction = this.org.createNode({
      name: '施工Agent',
      type: 'agent',
      role: 'Construction',
      parentId: pm.id
    });
    
    // 给用户分配角色
    this.permission.assignRole('user_demo', 'role_pm');
    
    // 创建示例任务
    this.task.create({
      title: '完成项目设计方案',
      description: '设计建筑结构方案',
      type: 'design',
      priority: 'high',
      assigneeId: design.id,
      metadata: { reporterId: pm.id }
    });
    
    this.task.create({
      title: '施工进度检查',
      description: '现场施工进度检查',
      type: 'construction',
      priority: 'medium',
      assigneeId: construction.id,
      metadata: { reporterId: pm.id }
    });
  }
}

// 导出
module.exports = { Pclaw };
