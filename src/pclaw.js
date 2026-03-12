/**
 * Pclaw Core - Task Engine V2
 * 基于 Lisp 思想：一切皆 Task
 */

const { Task, TaskEngine } = require('./core/taskEngine');
const { TaskParser } = require('./core/parser');
const { Executor } = require('./core/executor');
const { Storage } = require('./core/storage');

class Pclaw {
  constructor(options = {}) {
    this.options = options;
    
    // 初始化各模块
    this.parser = new TaskParser();
    this.executor = new Executor(options);
    this.storage = new Storage({
      baseDir: options.dataDir || './data',
      engine: options.engine || 'file'
    });
    
    // TaskEngine 兼容
    this.tasks = new Map();
  }

  /**
   * 创建 Task（支持嵌套）
   */
  create(taskData) {
    const parsed = this.parser.parse(taskData);
    
    // 保存到存储
    this.storage.saveTask(parsed);
    
    // 同时保存到内存
    this.tasks.set(parsed.id, parsed);
    
    // 递归保存子任务
    if (parsed.subtasks?.length > 0) {
      for (const subId of parsed.subtasks) {
        const subTask = this.parser.parseTask(
          taskData.subtasks.find(s => s.id === subId || s.goal),
          parsed.id
        );
        this.storage.saveTask(subTask);
        this.tasks.set(subTask.id, subTask);
      }
    }
    
    // 记录审计
    this.storage.saveAudit({
      event: 'task_created',
      taskId: parsed.id,
      actor: parsed.executor?.id
    });
    
    return parsed;
  }

  /**
   * 获取 Task
   */
  get(taskId) {
    // 先从内存获取
    if (this.tasks.has(taskId)) {
      return this.tasks.get(taskId);
    }
    // 再从存储加载
    const task = this.storage.loadTask(taskId);
    if (task) {
      this.tasks.set(taskId, task);
    }
    return task;
  }

  /**
   * 查询 Tasks
   */
  query(filter = {}) {
    return this.storage.queryTasks(filter);
  }

  /**
   * 执行 Task
   */
  async execute(taskId, options = {}) {
    const task = this.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (task.status !== 'pending') {
      throw new Error(`Task cannot execute, status: ${task.status}`);
    }
    
    // 更新状态
    task.status = 'running';
    task.history.push({
      event: 'started',
      timestamp: new Date().toISOString(),
      actor: task.executor?.id
    });
    this.storage.saveTask(task);
    
    // 执行
    const result = await this.executor.execute(task);
    
    // 更新任务状态
    task.status = result.task.status;
    task.result = result.task.result;
    task.history.push({
      event: 'executed',
      timestamp: new Date().toISOString(),
      actor: result.execution.agentId,
      executionId: result.execution.id
    });
    
    this.storage.saveTask(task);
    
    // 审计
    this.storage.saveAudit({
      event: 'task_executed',
      taskId: task.id,
      executorId: result.execution.agentId,
      executionId: result.execution.id,
      status: result.execution.status
    });
    
    return { task, execution: result.execution };
  }

  /**
   * 执行 Task（含子任务）
   */
  async executeAll(taskId, options = {}) {
    const task = this.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    const results = [];
    
    // 先执行所有子任务
    if (task.subtasks?.length > 0) {
      for (const subId of task.subtasks) {
        const subResult = await this.execute(subId, options);
        results.push(subResult);
      }
    }
    
    // 再执行主任务
    const mainResult = await this.execute(taskId, options);
    results.push(mainResult);
    
    return results;
  }

  /**
   * 确认 Task
   */
  confirm(taskId, options = {}) {
    const task = this.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    if (task.status !== 'confirming') {
      throw new Error(`Task cannot confirm, status: ${task.status}`);
    }
    
    const { type, signer, evidence } = options;
    
    task.confirm = {
      type: type || task.confirm?.type || 'system',
      status: 'approved',
      signer: signer || null,
      evidence: evidence || {},
      liability: {
        human: signer?.id || task.executor?.id,
        weight: 1.0,
        reason: `${type || 'system'} confirmation`
      },
      timestamp: new Date().toISOString()
    };
    
    task.status = 'completed';
    task.history.push({
      event: 'confirmed',
      timestamp: new Date().toISOString(),
      actor: signer?.id,
      confirmType: type
    });
    
    this.storage.saveTask(task);
    
    // 审计
    this.storage.saveAudit({
      event: 'task_confirmed',
      taskId: task.id,
      signerId: signer?.id,
      confirmType: type,
      liability: task.confirm.liability
    });
    
    return task;
  }

  /**
   * 驳回 Task
   */
  reject(taskId, reason) {
    const task = this.get(taskId);
    if (!task) {
      throw new Error('Task not found');
    }
    
    task.status = 'rejected';
    task.history.push({
      event: 'rejected',
      timestamp: new Date().toISOString(),
      reason
    });
    
    this.storage.saveTask(task);
    
    return task;
  }

  /**
   * 获取历史
   */
  getHistory(taskId) {
    const task = this.get(taskId);
    return task?.history || [];
  }

  /**
   * 获取审计日志
   */
  getAudit(filter = {}) {
    return this.storage.queryAudit(filter);
  }

  /**
   * 获取待确认列表
   */
  getPendingConfirmations() {
    return this.query({ status: 'confirming' });
  }

  /**
   * 创建快照
   */
  createSnapshot(name) {
    return this.storage.createSnapshot(name);
  }

  /**
   * 恢复快照
   */
  restoreSnapshot(snapshotId) {
    return this.storage.restoreSnapshot(snapshotId);
  }

  /**
   * 获取 Agent 列表
   */
  getAgents() {
    return this.executor.getAgentStatus();
  }
}

module.exports = { Pclaw, Task, TaskParser, Executor, Storage };
