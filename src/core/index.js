/**
 * Pclaw Core - 核心入口
 * 整合意图引擎、Agent编排、确认流
 */

const { IntentEngine } = require('./intent');
const { AgentExecutor } = require('./execute');
const { ConfirmationFlow } = require('./confirm');

class PclawCore {
  constructor() {
    this.intent = new IntentEngine();
    this.executor = new AgentExecutor();
    this.confirm = new ConfirmationFlow();
    
    // 注册默认 Agent
    this.registerDefaultAgents();
  }

  /**
   * 注册默认 Agent
   */
  registerDefaultAgents() {
    const defaultAgents = [
      { id: 'agent_design', name: '设计Agent', type: 'design', capabilities: ['design', 'drawing', 'review'] },
      { id: 'agent_construction', name: '施工Agent', type: 'construction', capabilities: ['construction', 'inspection', 'safety'] },
      { id: 'agent_cost', name: '造价Agent', type: 'cost', capabilities: ['cost', 'estimate', 'budget'] },
      { id: 'agent_safety', name: '安全Agent', type: 'safety', capabilities: ['safety', 'inspection', 'report'] },
      { id: 'agent_quality', name: '质量Agent', type: 'quality', capabilities: ['quality', 'inspection', 'test'] }
    ];
    
    for (const agent of defaultAgents) {
      this.executor.registerAgent(agent);
    }
  }

  /**
   * 完整流程：意图 → 执行 → 确认
   */
  async process(input) {
    const { goal, constraints, deadline, humanId, assignAgentId } = input;
    
    // Step 1: 解析意图
    const intent = this.intent.parse({ goal, constraints, deadline, humanId });
    console.log(`[Pclaw] 意图已创建: ${intent.id}`);
    
    // Step 2: 分配任务给 Agent
    const tasks = [];
    for (const task of intent.tasks) {
      const agentId = assignAgentId || this.executor.getAvailableAgents()[0]?.id;
      if (agentId) {
        const execution = await this.executor.execute(intent.id, task.id, agentId, {
          title: task.title,
          description: task.description,
          constraints: task.constraints
        });
        tasks.push({ task, execution });
        console.log(`[Pclaw] 任务已分配给 ${agentId}: ${execution.id}`);
      }
    }
    
    // 返回流程状态
    return {
      intent,
      tasks,
      status: 'processing'
    };
  }

  /**
   * 检查执行状态并创建确认请求
   */
  checkAndConfirm(executionId) {
    const execution = this.executor.getExecution(executionId);
    if (!execution || execution.status !== 'completed') {
      return { status: 'not_ready' };
    }
    
    // 获取 Agent 名称
    const agent = this.executor.agents.get(execution.agentId);
    
    // 执行完成，创建确认请求
    const confirmation = this.confirm.createConfirmation(
      executionId,
      {
        taskId: execution.taskId,
        taskTitle: execution.taskTitle,
        intentId: execution.intentId,
        agentId: execution.agentId,
        agentName: agent?.name || execution.agentId,
        result: execution.result
      }
    );
    
    return {
      status: 'ready_to_confirm',
      confirmation
    };
  }
}

module.exports = { PclawCore };
