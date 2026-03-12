/**
 * Pclaw Core - Intent Engine
 * 意图引擎：理解人类目标，分解为可执行任务
 */

const { v4: uuidv4 } = require('uuid');

class IntentEngine {
  constructor() {
    this.intents = new Map();
  }

  /**
   * 解析人类意图
   * @param {Object} input - 意图输入
   * @returns {Object} 解析后的任务计划
   */
  parse(input) {
    const { goal, constraints = [], deadline, humanId } = input;
    
    // 生成唯一意图ID
    const intentId = `intent_${uuidv4().slice(0, 8)}`;
    
    // 基础解析（简化版，后续可接入LLM增强）
    const tasks = this.decompose(goal, constraints);
    
    const intent = {
      id: intentId,
      goal,
      constraints,
      deadline,
      humanId,
      tasks,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    this.intents.set(intentId, intent);
    return intent;
  }

  /**
   * 目标分解（简化版规则）
   * 后续可接入 AI/LLM 进行智能分解
   */
  decompose(goal, constraints) {
    const tasks = [];
    const taskId = `task_${uuidv4().slice(0, 8)}`;
    
    // 简化处理：一个大任务
    tasks.push({
      id: taskId,
      title: goal,
      description: goal,
      constraints,
      status: 'pending',
      assignedAgent: null,
      subtasks: []
    });
    
    return tasks;
  }

  /**
   * 获取意图状态
   */
  getIntent(intentId) {
    return this.intents.get(intentId);
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(intentId, taskId, status) {
    const intent = this.intents.get(intentId);
    if (!intent) return null;
    
    const task = intent.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
    }
    
    return intent;
  }
}

module.exports = { IntentEngine };
