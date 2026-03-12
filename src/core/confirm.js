/**
 * Pclaw Core - Confirmation Flow
 * 确认流：人类审核节点 + 责任归属
 */

const { v4: uuidv4 } = require('uuid');

class ConfirmationFlow {
  constructor() {
    this.confirmations = new Map();
  }

  /**
   * 创建确认请求
   */
  createConfirmation(executionId, taskInfo) {
    const confirmationId = `confirm_${uuidv4().slice(0, 8)}`;
    
    const confirmation = {
      id: confirmationId,
      executionId,
      taskId: taskInfo.taskId,
      taskTitle: taskInfo.title,
      intentId: taskInfo.intentId,
      humanId: taskInfo.humanId,    // 审核人
      executorId: taskInfo.agentId, // 执行Agent
      result: taskInfo.result,
      status: 'pending',            // pending/approved/rejected
      confirmedAt: null,
      liability: {
        human: taskInfo.humanId,    // 默认责任归属于审核人
        weight: 1.0,                // 责任比例 100%
        reason: '人类确认后承担全部责任'
      },
      createdAt: new Date().toISOString(),
      comments: []
    };
    
    this.confirmations.set(confirmationId, confirmation);
    return confirmation;
  }

  /**
   * 审核通过
   */
  approve(confirmationId, comments = '') {
    const confirmation = this.confirmations.get(confirmationId);
    if (!confirmation) return null;
    
    confirmation.status = 'approved';
    confirmation.confirmedAt = new Date().toISOString();
    confirmation.comments.push({
      type: 'approve',
      content: comments,
      time: new Date().toISOString()
    });
    
    return confirmation;
  }

  /**
   * 审核拒绝
   */
  reject(confirmationId, reason) {
    const confirmation = this.confirmations.get(confirmationId);
    if (!confirmation) return null;
    
    confirmation.status = 'rejected';
    confirmation.confirmedAt = new Date().toISOString();
    confirmation.comments.push({
      type: 'reject',
      content: reason,
      time: new Date().toISOString()
    });
    
    // 拒绝后责任仍在人类
    confirmation.liability = {
      human: confirmation.humanId,
      weight: 1.0,
      reason: '人类拒绝确认，但仍是最终责任人'
    };
    
    return confirmation;
  }

  /**
   * 获取确认状态
   */
  getConfirmation(confirmationId) {
    return this.confirmations.get(confirmationId);
  }

  /**
   * 获取待审核列表
   */
  getPendingConfirmations(humanId = null) {
    const result = [];
    for (const confirm of this.confirmations.values()) {
      if (confirm.status === 'pending') {
        if (!humanId || confirm.humanId === humanId) {
          result.push(confirm);
        }
      }
    }
    return result;
  }

  /**
   * 获取历史确认记录
   */
  getHistory(humanId = null, limit = 50) {
    const result = [];
    for (const confirm of this.confirmations.values()) {
      if (!humanId || confirm.humanId === humanId) {
        result.push(confirm);
      }
    }
    return result.slice(-limit).reverse();
  }
}

module.exports = { ConfirmationFlow };
