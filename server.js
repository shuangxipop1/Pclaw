const path = require('path');

/**
 * Pclaw API Server V2
 * 基于 Task Engine - 一切皆 Task
 */

const http = require('http');
const { Pclaw } = require('./src/pclaw');

const PORT = process.env.PORT || 3000;
const pclaw = new Pclaw({ dataDir: path.join(__dirname, 'data') });

/**
 * 统一响应
 */
function response(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

/**
 * 解析请求体
 */
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
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
    // === Task CRUD ===
    
    // 创建任务（支持嵌套）
    if (path === '/api/task' && method === 'POST') {
      const body = await parseBody(req);
      const task = pclaw.create(body);
      return response(res, { success: true, data: task });
    }
    
    // 获取任务列表
    if (path === '/api/task' && method === 'GET') {
      const status = url.searchParams.get('status');
      const executorType = url.searchParams.get('executorType');
      const tasks = pclaw.query({ status, executorType });
      return response(res, { success: true, data: tasks });
    }
    
    // 获取单个任务
    if (path.match(/^\/api\/task\/[\w_]+$/) && method === 'GET') {
      const taskId = path.split('/')[3];
      const task = pclaw.get(taskId);
      if (!task) {
        return response(res, { error: 'Task not found' }, 404);
      }
      return response(res, { success: true, data: task });
    }
    
    // === 执行 ===
    
    // 执行任务
    if (path.match(/^\/api\/task\/[\w_]+\/execute$/) && method === 'POST') {
      const taskId = path.split('/')[3];
      try {
        const result = await pclaw.execute(taskId);
        return response(res, { success: true, data: result });
      } catch (e) {
        return response(res, { error: e.message }, 400);
      }
    }
    
    // 执行任务（含子任务）
    if (path.match(/^\/api\/task\/[\w_]+\/execute-all$/) && method === 'POST') {
      const taskId = path.split('/')[3];
      try {
        const results = await pclaw.executeAll(taskId);
        return response(res, { success: true, data: results });
      } catch (e) {
        return response(res, { error: e.message }, 400);
      }
    }
    
    // === 确认 ===
    
    // 确认任务
    if (path.match(/^\/api\/task\/[\w_]+\/confirm$/) && method === 'POST') {
      const taskId = path.split('/')[3];
      const body = await parseBody(req);
      try {
        const task = pclaw.confirm(taskId, body);
        return response(res, { success: true, data: task });
      } catch (e) {
        return response(res, { error: e.message }, 400);
      }
    }
    
    // 签字确认
    if (path.match(/^\/api\/task\/[\w_]+\/confirm\/signature$/) && method === 'POST') {
      const taskId = path.split('/')[3];
      const body = await parseBody(req);
      const task = pclaw.confirm(taskId, {
        type: 'signature',
        signer: body.signer,
        evidence: { filePath: body.filePath, fileHash: body.fileHash }
      });
      return response(res, { success: true, data: task });
    }
    
    // 邮件确认
    if (path.match(/^\/api\/task\/[\w_]+\/confirm\/email$/) && method === 'POST') {
      const taskId = path.split('/')[3];
      const body = await parseBody(req);
      const task = pclaw.confirm(taskId, {
        type: 'email',
        signer: body.signer,
        evidence: { emailId: body.emailId, emailSubject: body.emailSubject }
      });
      return response(res, { success: true, data: task });
    }
    
    // 驳回
    if (path.match(/^\/api\/task\/[\w_]+\/reject$/) && method === 'POST') {
      const taskId = path.split('/')[3];
      const body = await parseBody(req);
      const task = pclaw.reject(taskId, body.reason);
      return response(res, { success: true, data: task });
    }
    
    // === 历史 & 审计 ===
    
    // 获取任务历史
    if (path.match(/^\/api\/task\/[\w_]+\/history$/) && method === 'GET') {
      const taskId = path.split('/')[3];
      const history = pclaw.getHistory(taskId);
      return response(res, { success: true, data: history });
    }
    
    // 审计日志
    if (path === '/api/audit' && method === 'GET') {
      const taskId = url.searchParams.get('taskId');
      const audit = pclaw.getAudit({ taskId });
      return response(res, { success: true, data: audit });
    }
    
    // 待确认列表
    if (path === '/api/confirm/pending' && method === 'GET') {
      const pending = pclaw.getPendingConfirmations();
      return response(res, { success: true, data: pending });
    }
    
    // === Agent ===
    
    // 获取 Agent 列表
    if (path === '/api/agent' && method === 'GET') {
      const agents = pclaw.getAgents();
      return response(res, { success: true, data: agents });
    }
    
    // === 快照 ===
    
    // 创建快照
    if (path === '/api/snapshot' && method === 'POST') {
      const body = await parseBody(req);
      const snapshot = pclaw.createSnapshot(body.name || 'default');
      return response(res, { success: true, data: snapshot });
    }
    
    // 恢复快照
    if (path.match(/^\/api\/snapshot\/[\w_]+\/restore$/) && method === 'POST') {
      const snapshotId = path.split('/')[3];
      const snapshot = pclaw.restoreSnapshot(snapshotId);
      return response(res, { success: true, data: snapshot });
    }
    
    // === 根路径 ===
    if (path === '/' || path === '/api') {
      return response(res, {
        name: 'Pclaw API',
        version: '2.0.0',
        design: '一切皆 Task - 基于 Lisp 思想',
        modules: ['Parser', 'Executor', 'Storage'],
        endpoints: {
          task: [
            'POST /api/task - 创建任务',
            'GET /api/task - 任务列表',
            'GET /api/task/:id - 获取任务',
            'POST /api/task/:id/execute - 执行任务',
            'POST /api/task/:id/execute-all - 执行(含子任务)',
            'POST /api/task/:id/confirm - 确认',
            'POST /api/task/:id/confirm/signature - 签字',
            'POST /api/task/:id/confirm/email - 邮件',
            'POST /api/task/:id/reject - 驳回',
            'GET /api/task/:id/history - 历史'
          ],
          audit: [
            'GET /api/audit - 审计日志',
            'GET /api/confirm/pending - 待确认'
          ],
          agent: [
            'GET /api/agent - Agent列表'
          ],
          snapshot: [
            'POST /api/snapshot - 创建快照',
            'POST /api/snapshot/:id/restore - 恢复快照'
          ]
        }
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
║     🦞 Pclaw API Server V2              ║
║     Design: 一切皆 Task                 ║
║     Port: ${PORT}                           ║
╚═══════════════════════════════════════════╝
  `);
});

module.exports = { server };
