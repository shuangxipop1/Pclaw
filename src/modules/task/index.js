/**
 * Pclaw Modules - Task Management
 * 任务分发：任务创建、指派、状态流转
 */

const { v4: uuidv4 } = require('uuid');

class TaskManager {
  constructor() {
    this.tasks = new Map();
  }

  /**
   * 创建任务
   */
  create(data) {
    const { title, description, type, priority, assigneeId, dueDate, parentId, metadata = {} } = data;
    const taskId = `task_${uuidv4().slice(0, 8)}`;
    
    const task = {
      id: taskId,
      title,
      description,
      type,           // 'design' | 'construction' | 'cost' | 'general'
      priority,       // 'low' | 'medium' | 'high' | 'urgent'
      status: 'pending',  // pending / in_progress / review / completed / cancelled
      assigneeId,
      reporterId: metadata.reporterId,
      parentId,
      children: [],
      dueDate,
      startDate: null,
      completedDate: null,
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.tasks.set(taskId, task);
    
    // 更新父任务
    if (parentId) {
      const parent = this.tasks.get(parentId);
      if (parent) {
        parent.children.push(taskId);
      }
    }
    
    return task;
  }

  /**
   * 指派任务
   */
  assign(taskId, assigneeId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    task.assigneeId = assigneeId;
    task.status = 'in_progress';
    task.startDate = new Date().toISOString();
    task.updatedAt = new Date().toISOString();
    
    return task;
  }

  /**
   * 更新状态
   */
  updateStatus(taskId, status) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    task.status = status;
    task.updatedAt = new Date().toISOString();
    
    if (status === 'completed') {
      task.completedDate = new Date().toISOString();
    }
    
    return task;
  }

  /**
   * 获取任务
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * 获取待办任务
   */
  getTodoList(assigneeId = null) {
    const result = [];
    for (const task of this.tasks.values()) {
      if (task.status === 'pending' || task.status === 'in_progress') {
        if (!assigneeId || task.assigneeId === assigneeId) {
          result.push(task);
        }
      }
    }
    return result.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * 获取已完成任务
   */
  getCompletedList(assigneeId = null, limit = 50) {
    const result = [];
    for (const task of this.tasks.values()) {
      if (task.status === 'completed') {
        if (!assigneeId || task.assigneeId === assigneeId) {
          result.push(task);
        }
      }
    }
    return result.slice(-limit).reverse();
  }

  /**
   * 获取所有任务
   */
  getAllTasks(filter = {}) {
    let result = Array.from(this.tasks.values());
    
    if (filter.status) {
      result = result.filter(t => t.status === filter.status);
    }
    if (filter.type) {
      result = result.filter(t => t.type === filter.type);
    }
    if (filter.assigneeId) {
      result = result.filter(t => t.assigneeId === filter.assigneeId);
    }
    
    return result;
  }
}

module.exports = { TaskManager };
