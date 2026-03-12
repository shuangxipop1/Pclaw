/**
 * Pclaw Core - Agent Executor
 * Agent编排：任务调度、执行、进度追踪
 */

const { v4: uuidv4 } = require('uuid');

class AgentExecutor {
  constructor() {
    this.executions = new Map();
    this.agents = new Map();
  }

  /**
   * 注册 Agent
   */
  registerAgent(agent) {
    const { id, name, capabilities = [], type = 'general' } = agent;
    this.agents.set(id, {
      id,
      name,
      type,
      capabilities,
      status: 'idle',
      currentTask: null,
      registeredAt: new Date().toISOString()
    });
    return this.agents.get(id);
  }

  /**
   * 获取可用 Agent
   */
  getAvailableAgents(capability = null) {
    const available = [];
    for (const [id, agent] of this.agents) {
      if (agent.status === 'idle') {
        if (!capability || agent.capabilities.includes(capability)) {
          available.push(agent);
        }
      }
    }
    return available;
  }

  /**
   * 执行任务
   */
  async execute(intentId, taskId, agentId) {
    const executionId = `exec_${uuidv4().slice(0, 8)}`;
    
    const execution = {
      id: executionId,
      intentId,
      taskId,
      agentId,
      status: 'running',
      progress: 0,
      logs: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null
    };
    
    // 更新 Agent 状态
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'busy';
      agent.currentTask = taskId;
    }
    
    this.executions.set(executionId, execution);
    
    // 模拟执行（实际会调用 Agent 执行）
    this.simulateExecution(executionId);
    
    return execution;
  }

  /**
   * 模拟执行（简化版）
   */
  simulateExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) return;
    
    // 模拟进度更新
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      execution.progress = progress;
      execution.logs.push({
        time: new Date().toISOString(),
        message: `执行中... ${progress}%`
      });
      
      if (progress >= 100) {
        clearInterval(interval);
        execution.status = 'completed';
        execution.completedAt = new Date().toISOString();
        execution.result = { output: '任务完成' };
        
        // 释放 Agent
        const agent = this.agents.get(execution.agentId);
        if (agent) {
          agent.status = 'idle';
          agent.currentTask = null;
        }
      }
    }, 500);
  }

  /**
   * 获取执行状态
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  /**
   * 获取任务的所有执行记录
   */
  getTaskExecutions(taskId) {
    const result = [];
    for (const exec of this.executions.values()) {
      if (exec.taskId === taskId) {
        result.push(exec);
      }
    }
    return result;
  }

  /**
   * 终止执行
   */
  terminate(executionId) {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === 'running') {
      execution.status = 'terminated';
      execution.completedAt = new Date().toISOString();
      
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

module.exports = { AgentExecutor };
