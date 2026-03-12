/**
 * Pclaw Parser - 任务解析器
 * 将 JSON/DSL 解析为 Task Graph
 */

const { v4: uuidv4 } = require('uuid');

class TaskParser {
  constructor() {
    this.parsers = new Map();
  }

  /**
   * 解析 JSON 为 Task
   */
  parse(json) {
    if (Array.isArray(json)) {
      // 批量任务
      return json.map(j => this.parseTask(j));
    }
    return this.parseTask(json);
  }

  /**
   * 解析单个 Task
   */
  parseTask(obj, parent = null) {
    const {
      goal,
      executor = null,
      subtasks = [],
      metadata = {},
      confirmType = 'system'
    } = obj;

    const task = {
      id: obj.id || `task_${uuidv4().slice(0, 8)}`,
      goal,
      executor: this.parseExecutor(executor),
      status: 'pending',
      
      confirm: {
        type: confirmType,
        status: 'pending',
        signer: null,
        evidence: {},
        liability: null,
        timestamp: null
      },
      
      result: {
        output: null,
        artifacts: []
      },
      
      subtasks: [],
      parent,
      
      metadata: {
        priority: metadata.priority || 'medium',
        deadline: metadata.deadline || null,
        tags: metadata.tags || [],
        dependencies: metadata.dependencies || [],
        cost: metadata.cost || { compute: 0, human: 0 }
      },
      
      history: [{
        event: 'parsed',
        timestamp: new Date().toISOString()
      }],
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 递归解析子任务
    if (subtasks.length > 0) {
      for (const sub of subtasks) {
        const subTask = this.parseTask(sub, task.id);
        task.subtasks.push(subTask.id);
      }
    }

    return task;
  }

  /**
   * 解析 Executor
   */
  parseExecutor(executor) {
    if (!executor) {
      return { type: 'Agent', id: 'default', name: 'Default Agent' };
    }
    
    if (typeof executor === 'string') {
      return { type: 'Agent', id: executor, name: executor };
    }
    
    return {
      type: executor.type || 'Agent',
      id: executor.id || 'default',
      name: executor.name || executor.id
    };
  }

  /**
   * DSL 解析（简化版）
   * 输入格式: "(task goal:xxx executor:agent_1 subtasks:...)"
   */
  parseDSL(dsl) {
    // 简化 DSL 解析
    const match = dsl.match(/\(task\s+(.*)\)/);
    if (!match) {
      throw new Error('Invalid DSL format');
    }

    const content = match[1];
    const result = {
      goal: this.extractValue(content, 'goal'),
      executor: this.extractValue(content, 'executor'),
      subtasks: [],
      metadata: {}
    };

    return this.parseTask(result);
  }

  /**
   * 提取值
   */
  extractValue(content, key) {
    const regex = new RegExp(`${key}:([^\\s]+)`);
    const match = content.match(regex);
    return match ? match[1] : null;
  }
}

module.exports = { TaskParser };
