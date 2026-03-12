/**
 * Pclaw API Server
 * REST API 接口
 */

const http = require('http');
const { Pclaw } = require('./src');

const pclaw = new Pclaw();

const PORT = process.env.PORT || 3000;

/**
 * 统一响应格式
 */
function response(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * 解析请求体
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * 路由处理
 */
async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method;
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (method === 'OPTIONS') {
    return response(res, { ok: true });
  }
  
  try {
    // === 意图引擎 API ===
    if (path === '/api/intent' && method === 'POST') {
      const body = await parseBody(req);
      const result = pclaw.core.intent.parse(body);
      return response(res, { success: true, data: result });
    }
    
    if (path.startsWith('/api/intent/') && method === 'GET') {
      const intentId = path.split('/')[3];
      const intent = pclaw.core.intent.getIntent(intentId);
      return response(res, { success: true, data: intent });
    }
    
    // === Agent API ===
    if (path === '/api/agents' && method === 'GET') {
      const agents = Array.from(pclaw.core.executor.agents.values());
      return response(res, { success: true, data: agents });
    }
    
    if (path === '/api/execute' && method === 'POST') {
      const body = await parseBody(req);
      const result = await pclaw.core.process(body);
      return response(res, { success: true, data: result });
    }
    
    if (path.startsWith('/api/execution/') && method === 'GET') {
      const executionId = path.split('/')[3];
      const execution = pclaw.core.executor.getExecution(executionId);
      return response(res, { success: true, data: execution });
    }
    
    // === 确认流 API ===
    if (path === '/api/confirm' && method === 'POST') {
      const body = await parseBody(req);
      const { executionId, action, comments, reason } = body;
      
      const check = pclaw.core.checkAndConfirm(executionId);
      if (check.status === 'not_ready') {
        return response(res, { success: false, message: '执行未完成' }, 400);
      }
      
      if (action === 'approve') {
        pclaw.core.confirm.systemConfirm(check.confirmation.id, comments);
      } else if (action === 'reject') {
        pclaw.core.confirm.rejectConfirmation(check.confirmation.id, reason, { confirmType: 'system' });
      }
      
      return response(res, { success: true, data: check.confirmation });
    }
    
    // 签字文件确认
    if (path === '/api/confirm/sign' && method === 'POST') {
      const body = await parseBody(req);
      const { confirmationId, signedFilePath, signerName, signatureHash } = body;
      
      const confirmation = await pclaw.core.confirm.signConfirmation(confirmationId, {
        signedFilePath,
        signerName,
        signatureHash
      });
      
      return response(res, { success: true, data: confirmation });
    }
    
    // 邮件确认
    if (path === '/api/confirm/email' && method === 'POST') {
      const body = await parseBody(req);
      const { confirmationId, emailId, emailFrom, emailSubject, emailBody } = body;
      
      const confirmation = await pclaw.core.confirm.emailConfirmation(confirmationId, {
        emailId,
        emailFrom,
        emailSubject,
        emailBody
      });
      
      return response(res, { success: true, data: confirmation });
    }
    
    // 审计日志
    if (path === '/api/confirm/audit' && method === 'GET') {
      const urlParams = url.searchParams;
      const taskId = urlParams.get('taskId');
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');
      
      const logs = pclaw.core.confirm.getAuditLog(taskId, startDate, endDate);
      return response(res, { success: true, data: logs });
    }
    
    if (path === '/api/confirm/pending' && method === 'GET') {
      const pending = pclaw.core.confirm.getPendingConfirmations();
      return response(res, { success: true, data: pending });
    }
    
    if (path === '/api/confirm/confirmed' && method === 'GET') {
      const confirmed = pclaw.core.confirm.getConfirmedList();
      return response(res, { success: true, data: confirmed });
    }
    
    // === 组织管理 API ===
    if (path === '/api/org' && method === 'GET') {
      const tree = pclaw.org.getOrgTree();
      return response(res, { success: true, data: tree });
    }
    
    if (path === '/api/org' && method === 'POST') {
      const body = await parseBody(req);
      const node = pclaw.org.createNode(body);
      return response(res, { success: true, data: node });
    }
    
    if (path.startsWith('/api/org/') && method === 'GET') {
      const nodeId = path.split('/')[3];
      const node = pclaw.org.getNode(nodeId);
      return response(res, { success: true, data: node });
    }
    
    // === 任务管理 API ===
    if (path === '/api/task' && method === 'GET') {
      const urlParams = url.searchParams;
      const filter = {};
      if (urlParams.get('status')) filter.status = urlParams.get('status');
      if (urlParams.get('type')) filter.type = urlParams.get('type');
      if (urlParams.get('assigneeId')) filter.assigneeId = urlParams.get('assigneeId');
      
      const tasks = filter.status || filter.type || filter.assigneeId 
        ? pclaw.task.getAllTasks(filter)
        : Array.from(pclaw.task.tasks.values());
      
      return response(res, { success: true, data: tasks });
    }
    
    if (path === '/api/task' && method === 'POST') {
      const body = await parseBody(req);
      const task = pclaw.task.create(body);
      return response(res, { success: true, data: task });
    }
    
    if (path.startsWith('/api/task/') && method === 'PUT') {
      const taskId = path.split('/')[3];
      const body = await parseBody(req);
      
      let task;
      if (body.status) {
        task = pclaw.task.updateStatus(taskId, body.status);
      } else if (body.assigneeId) {
        task = pclaw.task.assign(taskId, body.assigneeId);
      }
      
      return response(res, { success: true, data: task });
    }
    
    // === 权限 API ===
    if (path === '/api/role' && method === 'GET') {
      const roles = pclaw.permission.getAllRoles();
      return response(res, { success: true, data: roles });
    }
    
    if (path === '/api/permission/check' && method === 'POST') {
      const body = await parseBody(req);
      const { userId, permission } = body;
      const hasPermission = pclaw.permission.checkPermission(userId, permission);
      return response(res, { success: true, data: { hasPermission } });
    }
    
    // === 根路径 ===
    if (path === '/' || path === '/api') {
      return response(res, {
        name: 'Pclaw API',
        version: '1.0.0',
        status: 'running',
        endpoints: [
          'POST /api/intent - 创建意图',
          'GET /api/intent/:id - 获取意图',
          'GET /api/agents - 获取Agent列表',
          'POST /api/execute - 执行任务',
          'POST /api/confirm - 确认结果',
          'GET /api/confirm/pending - 待确认列表',
          'GET/POST /api/org - 组织管理',
          'GET/POST /api/task - 任务管理',
          'GET /api/role - 角色列表',
          'POST /api/permission/check - 权限检查'
        ]
      });
    }
    
    // 404
    response(res, { error: 'Not Found' }, 404);
    
  } catch (error) {
    console.error('[Error]', error);
    response(res, { error: error.message }, 500);
  }
}

// 启动服务器
const server = http.createServer(handle);
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     🦞 Pclaw API Server                   ║
║     Version: 1.0.0                         ║
║     Port: ${PORT}                            ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = { server };
