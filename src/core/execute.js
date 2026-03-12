/**
 * Pclaw Core - Agent Executor
 * Agent编排：任务调度、执行、进度追踪
 * 
 * OpenClaw 集成说明：
 * - 当前版本：模拟执行
 * - 集成方式：HTTP API / WebSocket / CLI
 * - 配置文件：OPENCLAW_URL 环境变量
 */

const { v4: uuidv4 } = require('uuid');

class AgentExecutor {
  constructor() {
    this.executions = new Map();
    this.agents = new Map();
    this.openclawUrl = process.env.OPENCLAW_URL || 'http://localhost:18789';
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
   * 调用 OpenClaw 执行任务
   * 
   * TODO: 完善 OpenClaw API 集成
   * 可选方式：
   * 1. HTTP API - 需要 OpenClaw 暴露 REST API
   * 2. WebSocket - Gateway WS 实时消息
   * 3. CLI - openclaw agent 命令
   * 4. 消息队列 - 跨服务通信
   */
  async callOpenClaw(prompt, options = {}) {
    // 当前实现：模拟执行
    // 后续需要根据实际情况对接 OpenClaw
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          mock: true,
          message: 'OpenClaw 集成待完善，当前使用模拟结果',
          prompt,
          suggestedIntegration: 'HTTP/WebSocket/CLI',
          timestamp: new Date().toISOString()
        });
      }, 100);
    });
  }

  /**
   * 执行任务
   */
  async execute(intentId, taskId, agentId, taskInfo = {}) {
    const executionId = `exec_${uuidv4().slice(0, 8)}`;
    
    const execution = {
      id: executionId,
      intentId,
      taskId,
      agentId,
      taskTitle: taskInfo.title || '任务',
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
    
    // 添加日志
    execution.logs.push({
      time: new Date().toISOString(),
      message: `开始执行任务: ${taskInfo.title || taskId}`
    });
    
    execution.logs.push({
      time: new Date().toISOString(),
      message: `调用 OpenClaw...`
    });
    
    // 真实调用 OpenClaw
    try {
      const ocResult = await this.callOpenClaw(taskInfo.title || taskInfo.description || '执行任务');
      
      execution.progress = 100;
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      execution.result = ocResult;
      
      execution.logs.push({
        time: new Date().toISOString(),
        message: ocResult.mock ? '使用模拟结果' : 'OpenClaw 执行完成'
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.logs.push({
        time: new Date().toISOString(),
        message: `执行失败: ${error.message}`
      });
    }
    
    // 释放 Agent
    if (agent) {
      agent.status = 'idle';
      agent.currentTask = null;
    }
    
    return execution;
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
