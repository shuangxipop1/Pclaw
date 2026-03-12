/**
 * Pclaw Task Engine V2
 * 基于 Lisp 思想：一切皆 Task
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class Task {
  /**
   * 创建 Task
   */
  static create(options = {}) {
    const {
      goal,
      executor = { type: 'Agent', id: null, name: null },
      subtasks = [],
      parent = null,
      metadata = {},
      confirmType = 'system'
    } = options;

    const taskId = `task_${uuidv4().slice(0, 8)}`;

    const task = {
      // 核心三要素
      id: taskId,
      goal,
      executor,
      status: 'pending',

      // 确认流
      confirm: {
        type: confirmType,
        status: 'pending',
        signer: null,
        evidence: {},
        liability: null,
        timestamp: null
      },

      // 执行结果
      result: {
        output: null,
        artifacts: []
      },

      // 嵌套
      subtasks: [],
      parent,

      // 元数据
      metadata: {
        priority: metadata.priority || 'medium',
        deadline: metadata.deadline || null,
        tags: metadata.tags || [],
        dependencies: metadata.dependencies || [],
        cost: metadata.cost || { compute: 0, human: 0 }
      },

      // 审计
      history: [
        {
          event: 'created',
          timestamp: new Date().toISOString(),
          actor: executor.id
        }
      ],

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return task;
  }
}

class TaskEngine {
  constructor(options = {}) {
    this.tasks = new Map();
    this.dataDir = options.dataDir || './data/tasks';
    
    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 创建 Task
   */
  create(options) {
    const task = Task.create(options);
    this.tasks.set(task.id, task);
    this.save(task);
    return task;
  }

  /**
   * 批量创建（支持嵌套）
   */
  createWithSubtasks(taskOptions) {
    const { subtasks = [], ...mainOptions } = taskOptions;
    
    // 先创建主任务
    const mainTask = this.create(mainOptions);
    
    // 创建子任务
    if (subtasks.length > 0) {
      for (const subOptions of subtasks) {
        const subTask = this.create({
          ...subOptions,
          parent: mainTask.id
        });
        mainTask.subtasks.push(subTask.id);
      }
      this.save(mainTask);
    }
    
    return mainTask;
  }

  /**
   * 获取 Task
   */
  get(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有 Task
   */
  getAll(filter = {}) {
    let result = Array.from(this.tasks.values());
    
    if (filter.status) {
      result = result.filter(t => t.status === filter.status);
    }
    if (filter.executorType) {
      result = result.filter(t => t.executor?.type === filter.executorType);
    }
    if (filter.parent) {
      result = result.filter(t => t.parent === filter.parent);
    }
    
    return result;
  }

  /**
   * 开始执行 Task
   */
  async execute(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} cannot execute, status: ${task.status}`);
    }
    
    // 更新状态
    task.status = 'running';
    task.history.push({
      event: 'started',
      timestamp: new Date().toISOString(),
      actor: task.executor.id
    });
    task.updatedAt = new Date().toISOString();
    
    // TODO: 实际调用 OpenClaw 执行
    // 模拟执行
    task.result = {
      output: `Task "${task.goal}" executed by ${task.executor.name || task.executor.id}`,
      artifacts: []
    };
    
    task.status = 'confirming';
    task.history.push({
      event: 'completed',
      timestamp: new Date().toISOString(),
      actor: task.executor.id
    });
    
    this.save(task);
    return task;
  }

  /**
   * 执行主任务（包括所有子任务）
   */
  async executeWithSubtasks(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    // 先执行所有子任务
    for (const subtaskId of task.subtasks) {
      await this.execute(subtaskId);
    }
    
    // 再执行主任务
    return await this.execute(taskId);
  }

  /**
   * 确认 Task
   */
  confirm(taskId, options = {}) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    if (task.status !== 'confirming') {
      throw new Error(`Task ${taskId} cannot confirm, status: ${task.status}`);
    }
    
    const { type, signer, evidence } = options;
    
    task.confirm = {
      type: type || task.confirm.type,
      status: 'approved',
      signer: signer || null,
      evidence: evidence || {},
      liability: {
        human: signer?.id || 'unknown',
        weight: 1.0,
        reason: `${type || 'system'} confirmation, full liability`
      },
      timestamp: new Date().toISOString()
    };
    
    task.status = 'completed';
    task.history.push({
      event: 'confirmed',
      timestamp: new Date().toISOString(),
      actor: signer?.id || 'system',
      confirmType: type
    });
    
    task.updatedAt = new Date().toISOString();
    this.save(task);
    return task;
  }

  /**
   * 驳回 Task
   */
  reject(taskId, reason) {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    
    task.status = 'rejected';
    task.confirm.status = 'rejected';
    
    task.history.push({
      event: 'rejected',
      timestamp: new Date().toISOString(),
      reason
    });
    
    task.updatedAt = new Date().toISOString();
    this.save(task);
    return task;
  }

  /**
   * 获取审计历史
   */
  getHistory(taskId) {
    const task = this.tasks.get(taskId);
    return task?.history || [];
  }

  /**
   * 获取待确认列表
   */
  getPendingConfirmations() {
    return this.getAll({ status: 'confirming' });
  }

  /**
   * 持久化
   */
  save(task) {
    const filePath = path.join(this.dataDir, `${task.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(task, null, 2));
  }

  /**
   * 加载
   */
  load(taskId) {
    const filePath = path.join(this.dataDir, `${taskId}.json`);
    if (fs.existsSync(filePath)) {
      const task = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.tasks.set(taskId, task);
      return task;
    }
    return null;
  }
}

module.exports = { Task, TaskEngine };
