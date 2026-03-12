/**
 * Pclaw Core - Confirmation Flow
 * 确认流：人类审核节点 + 责任归属
 * 支持多种确认方式：签字文件、邮件、系统确认
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class ConfirmationFlow {
  constructor(options = {}) {
    this.confirmations = new Map();
    this.dataDir = options.dataDir || './data/confirmations';
    
    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
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
      taskTitle: taskInfo.title || taskInfo.taskTitle,
      intentId: taskInfo.intentId,
      
      // 执行信息
      executorId: taskInfo.agentId,
      executorName: taskInfo.agentName,
      result: taskInfo.result,
      
      // 审核人
      humanId: taskInfo.humanId,
      humanName: taskInfo.humanName,
      
      // 确认方式
      confirmType: null,       // 'signature' | 'email' | 'system' | 'blockchain'
      confirmStatus: 'pending', // pending / approved / rejected
      
      // 证据文件
      evidence: {
        fileId: null,
        filePath: null,
        fileHash: null,
        emailId: null,
        emailFrom: null,
        emailSubject: null,
        blockchainTx: null,
        timestamp: null
      },
      
      // 责任归属
      liability: {
        human: taskInfo.humanId,
        weight: 1.0,
        reason: '待确认'
      },
      
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      comments: []
    };
    
    this.confirmations.set(confirmationId, confirmation);
    
    // 保存到文件
    this.saveToFile(confirmation);
    
    return confirmation;
  }

  /**
   * 签字文件确认
   */
  async signConfirmation(confirmationId, options = {}) {
    const confirmation = this.confirmations.get(confirmationId);
    if (!confirmation) return null;
    
    const { signedFilePath, signerName, signatureHash } = options;
    
    confirmation.confirmType = 'signature';
    confirmation.confirmStatus = 'approved';
    confirmation.confirmedAt = new Date().toISOString();
    
    // 证据记录
    confirmation.evidence = {
      fileId: `file_${uuidv4().slice(0, 8)}`,
      filePath: signedFilePath,
      fileHash: signatureHash || this.generateHash(signedFilePath),
      timestamp: confirmation.confirmedAt
    };
    
    confirmation.liability = {
      human: confirmation.humanId,
      humanName: signerName || confirmation.humanName,
      weight: 1.0,
      reason: '签字文件确认，承担全部责任'
    };
    
    confirmation.comments.push({
      type: 'signature',
      content: `已签字确认: ${signerName}`,
      timestamp: confirmation.confirmedAt,
      evidence: confirmation.evidence
    });
    
    this.saveToFile(confirmation);
    return confirmation;
  }

  /**
   * 邮件确认
   */
  async emailConfirmation(confirmationId, options = {}) {
    const confirmation = this.confirmations.get(confirmationId);
    if (!confirmation) return null;
    
    const { emailId, emailFrom, emailSubject, emailBody } = options;
    
    confirmation.confirmType = 'email';
    confirmation.confirmStatus = 'approved';
    confirmation.confirmedAt = new Date().toISOString();
    
    // 证据记录
    confirmation.evidence = {
      emailId,
      emailFrom,
      emailSubject,
      emailBody: emailBody?.substring(0, 500), // 保留部分内容
      timestamp: confirmation.confirmedAt
    };
    
    confirmation.liability = {
      human: confirmation.humanId,
      weight: 1.0,
      reason: '邮件确认，承担全部责任'
    };
    
    confirmation.comments.push({
      type: 'email',
      content: `邮件确认: ${emailSubject}`,
      from: emailFrom,
      timestamp: confirmation.confirmedAt,
      evidence: confirmation.evidence
    });
    
    this.saveToFile(confirmation);
    return confirmation;
  }

  /**
   * 系统确认（点击确认）
   */
  systemConfirm(confirmationId, comments = '') {
    const confirmation = this.confirmations.get(confirmationId);
    if (!confirmation) return null;
    
    confirmation.confirmType = 'system';
    confirmation.confirmStatus = 'approved';
    confirmation.confirmedAt = new Date().toISOString();
    
    confirmation.liability = {
      human: confirmation.humanId,
      weight: 1.0,
      reason: '系统确认，承担全部责任'
    };
    
    confirmation.comments.push({
      type: 'system',
      content: comments || '系统确认通过',
      timestamp: confirmation.confirmedAt
    });
    
    this.saveToFile(confirmation);
    return confirmation;
  }

  /**
   * 审核拒绝
   */
  rejectConfirmation(confirmationId, reason, options = {}) {
    const confirmation = this.confirmations.get(confirmationId);
    if (!confirmation) return null;
    
    confirmation.confirmStatus = 'rejected';
    confirmation.confirmedAt = new Date().toISOString();
    
    // 记录拒绝原因和证据
    confirmation.comments.push({
      type: options.confirmType || 'system',
      content: reason,
      timestamp: confirmation.confirmedAt,
      evidence: options.evidence
    });
    
    // 拒绝后责任仍在人类（因为人类看到了并做出了决定）
    confirmation.liability = {
      human: confirmation.humanId,
      weight: 1.0,
      reason: '审核拒绝，但仍承担监管责任'
    };
    
    this.saveToFile(confirmation);
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
      if (confirm.confirmStatus === 'pending') {
        if (!humanId || confirm.humanId === humanId) {
          result.push(confirm);
        }
      }
    }
    return result;
  }

  /**
   * 获取已确认列表
   */
  getConfirmedList(humanId = null, limit = 50) {
    const result = [];
    for (const confirm of this.confirmations.values()) {
      if (confirm.confirmStatus !== 'pending') {
        if (!humanId || confirm.humanId === humanId) {
          result.push(confirm);
        }
      }
    }
    return result.slice(-limit).reverse();
  }

  /**
   * 获取审计记录
   */
  getAuditLog(taskId = null, startDate = null, endDate = null) {
    const result = [];
    for (const confirm of this.confirmations.values()) {
      // 过滤
      if (taskId && confirm.taskId !== taskId) continue;
      if (startDate && new Date(confirm.createdAt) < new Date(startDate)) continue;
      if (endDate && new Date(confirm.createdAt) > new Date(endDate)) continue;
      
      result.push({
        confirmationId: confirm.id,
        taskId: confirm.taskId,
        taskTitle: confirm.taskTitle,
        confirmType: confirm.confirmType,
        confirmStatus: confirm.confirmStatus,
        humanId: confirm.humanId,
        humanName: confirm.humanName,
        liability: confirm.liability,
        evidence: confirm.evidence,
        createdAt: confirm.createdAt,
        confirmedAt: confirm.confirmedAt,
        comments: confirm.comments
      });
    }
    return result;
  }

  /**
   * 生成文件哈希
   */
  generateHash(filePath) {
    // 简单实现：使用文件名+时间戳作为哈希
    // 实际应使用 crypto 模块计算真实哈希
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${filePath}_${Date.now()}`)
      .digest('hex');
    return hash;
  }

  /**
   * 保存到文件（审计用）
   */
  saveToFile(confirmation) {
    const filePath = path.join(this.dataDir, `${confirmation.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(confirmation, null, 2));
  }

  /**
   * 从文件加载
   */
  loadFromFile(confirmationId) {
    const filePath = path.join(this.dataDir, `${confirmationId}.json}`);
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.confirmations.set(confirmationId, data);
      return data;
    }
    return null;
  }
}

module.exports = { ConfirmationFlow };
