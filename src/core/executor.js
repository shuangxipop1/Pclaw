/**
 * Pclaw Executor - 任务执行器
 * 负责调度 Agent 执行任务
 */

const { v4: uuidv4 } = require('uuid');

class Executor {
  constructor(options = {}) {
    this.openclawUrl = options.openclawUrl || 'http://localhost:18789';
    this.agents = new Map();
    this.executions = new Map();
    
    // 注册默认 Agent
    this.registerDefaultAgents();
  }

  /**
   * 注册默认 Agent
   */
  registerDefaultAgents() {
    const agents = [
      { id: 'agent_design', name: '设计Agent', type: 'design', capabilities: ['design', 'drawing'] },
      { id: 'agent_struct', name: '结构Agent', type: 'struct', capabilities: ['structure', 'analysis'] },
      { id: 'agent_mep', name: '机电Agent', type: 'mep', capabilities: ['mechanical', 'electrical'] },
      { id: 'agent_cost', name: '造价Agent', type: 'cost', capabilities: ['estimate', 'budget'] },
      { id: 'agent_construction', name: '施工Agent', type: 'construction', capabilities: ['construction', 'planning'] },
      { id: 'agent_safety', name: '安全Agent', type: 'safety', capabilities: ['safety', 'inspection'] },
      { id: 'agent_quality', name: '质量Agent', type: 'quality', capabilities: ['quality', 'inspection'] }
    ];
    
    for (const agent of agents) {
      this.registerAgent(agent);
    }
  }

  /**
   * 注册 Agent
   */
  registerAgent(agent) {
    this.agents.set(agent.id, {
      ...agent,
      status: 'idle',
      currentTask: null,
      registeredAt: new Date().toISOString()
    });
  }

  /**
   * 获取可用 Agent
   */
  getAvailableAgents(capability = null) {
    const available = [];
    for (const [id, agent] of this.agents) {
      if (agent.status === 'idle') {
        if (!capability || agent.capabilities?.includes(capability)) {
          available.push(agent);
        }
      }
    }
    return available;
  }

  /**
   * 选择最佳 Agent
   */
  selectAgent(task) {
    const { executor } = task;
    
    // 如果指定了 executor
    if (executor?.id) {
      const agent = this.agents.get(executor.id);
      if (agent && agent.status === 'idle') {
        return agent;
      }
    }
    
    // 否则选择空闲的
    return this.getAvailableAgents()[0] || null;
  }

  /**
   * 执行单个 Task
   */
  async execute(task) {
    const agent = this.selectAgent(task);
    if (!agent) {
      throw new Error('No available agent');
    }

    // 标记 Agent 忙碌
    agent.status = 'busy';
    agent.currentTask = task.id;

    const executionId = `exec_${uuidv4().slice(0, 8)}`;
    const execution = {
      id: executionId,
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      result: null,
      error: null
    };

    this.executions.set(executionId, execution);

    try {
      // 调用 OpenClaw 执行
      const result = await this.callOpenClaw(task.goal, {
        agentType: agent.type,
        capabilities: agent.capabilities
      });

      execution.status = 'completed';
      execution.result = result;
      
      // 更新 task
      task.status = 'confirming';
      task.result = {
        output: result.output,
        artifacts: result.artifacts || []
      };
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      task.status = 'rejected';
    }

    execution.endTime = new Date().toISOString();
    
    // 释放 Agent
    agent.status = 'idle';
    agent.currentTask = null;

    return { task, execution };
  }

  /**
   * 调用 OpenClaw
   */
  async callOpenClaw(prompt, options = {}) {
    // 实际实现需要根据 OpenClaw 的 API 来调用
    // 这里使用模拟实现
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          output: `Task completed: ${prompt}`,
          artifacts: [],
          agent: options.agentType,
          executedAt: new Date().toISOString()
        });
      }, 100);
    });
  }

  /**
   * 批量执行（支持并行/串行）
   */
  async executeBatch(tasks, options = {}) {
    const { mode = 'parallel' } = options;
    
    const results = [];
    
    if (mode === 'parallel') {
      // 并行执行
      const promises = tasks.map(task => this.execute(task));
      results.push(...await Promise.all(promises));
    } else {
      // 串行执行
      for (const task of tasks) {
        const result = await this.execute(task);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * 获取执行状态
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * 获取 Agent 状态
   */
  getAgentStatus(agentId = null) {
    if (agentId) {
      return this.agents.get(agentId);
    }
    return Array.from(this.agents.values());
  }

  /**
   * 终止执行
   */
  terminate(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) return null;
    
    if (execution.status === 'running') {
      execution.status = 'terminated';
      execution.endTime = new Date().toISOString();
      
      // 释放 Agent
      const agent = this.agents.get(execution.agentId);
      if (agent) {
        agent.status = 'idle';
        agent.currentTask = null;
      }
    }
    
    return execution;
  }
}

module.exports = { Executor };
