/**
 * Pclaw Payment Routes - 支付相关路由
 * 
 * 集成到 server.js 的路由：
 * 
 * 在 server.js 顶部添加（已有 const path 之后）：
 *   const { createPayment, getOrder, getUserOrders, handleCallback, listPackages } = require('./src/payment_routes');
 * 
 * 在 server.js handle() 函数的 try {} 块开头添加：
 *   await handlePaymentRoute(req, res, url, path, method);
 * 
 */

const {
  createPayment,
  getOrder,
  getUserOrders,
  handleCallback,
  listPackages,
} = require('./src/payment_gateway');

// ============================================================
// 路由入口
// ============================================================

async function handlePaymentRoute(req, res, url, path, method) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (method === 'OPTIONS') return { handled: false };

  // --- 支付相关路由 ---

  // GET /api/payment/packages - 列出充值套餐
  if (path === '/api/payment/packages' && method === 'GET') {
    return { handled: true, data: listPackages() };
  }

  // POST /api/payment/create - 创建支付订单
  if (path === '/api/payment/create' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const { userId, packageId, provider } = body;
      if (!userId || !packageId) {
        return { handled: true, status: 400, data: { error: '缺少 userId 或 packageId' } };
      }
      const result = await createPayment({ userId, packageId, provider: provider || 'mock', req });
      return { handled: true, data: result };
    } catch (e) {
      return { handled: true, status: 400, data: { error: e.message } };
    }
  }

  // GET /api/payment/order/:orderId - 查询订单
  if (path.match(/^\/api\/payment\/order\/[\w_]+$/) && method === 'GET') {
    const orderId = path.split('/')[3];
    const order = getOrder(orderId);
    if (!order) return { handled: true, status: 404, data: { error: '订单不存在' } };
    return { handled: true, data: { success: true, order } };
  }

  // GET /api/payment/orders/:userId - 用户充值历史
  if (path.match(/^\/api\/payment\/orders\/[\w_-]+$/) && method === 'GET') {
    const userId = path.split('/')[3];
    const orders = getUserOrders(userId);
    return { handled: true, data: { success: true, orders } };
  }

  // POST /api/payment/notify/wechat - 微信支付回调
  if (path === '/api/payment/notify/wechat' && method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => rawBody += chunk);
    await new Promise(r => req.on('end', r));
    const result = await handleCallback('wechat', rawBody, req.headers, rawBody);
    const xml = result.success
      ? '<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>'
      : '<xml><return_code><![CDATA[FAIL]]></return_code></xml>';
    res.setHeader('Content-Type', 'text/xml');
    res.end(xml);
    return { handled: true, raw: true };
  }

  // POST /api/payment/notify/alipay - 支付宝回调
  if (path === '/api/payment/notify/alipay' && method === 'POST') {
    const body = await parseBody(req);
    const result = await handleCallback('alipay', body, req.headers, '');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.success ? 'success' : 'fail'));
    return { handled: true, raw: true };
  }

  // POST /api/payment/notify/stripe - Stripe回调
  if (path === '/api/payment/notify/stripe' && method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => rawBody += chunk);
    await new Promise(r => req.on('end', r));
    const sig = req.headers['stripe-signature'];
    const result = await handleCallback('stripe', rawBody, { 'stripe-signature': sig }, rawBody);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result.success ? { received: true } : { error: result.error }));
    return { handled: true, raw: true };
  }

  // GET /api/payment/config - 查询支付通道状态（不暴露密钥）
  if (path === '/api/payment/config' && method === 'GET') {
    return {
      handled: true,
      data: {
        providers: {
          wechat: CONFIG.wechat.enabled,
          alipay: CONFIG.alipay.enabled,
          stripe: CONFIG.stripe.enabled,
          mock: CONFIG.mock.enabled,
        },
        currency: 'CNY',
        region: 'both', // 国内+海外
      }
    };
  }

  // POST /api/payment/mock/success - Mock模式模拟支付成功（开发测试用）
  if (path === '/api/payment/mock/success' && method === 'POST') {
    const { orderId } = await parseBody(req).catch(() => ({})) || {};
    if (!orderId) return { handled: true, status: 400, data: { error: '缺少 orderId' } };
    const order = getOrder(orderId);
    if (!order) return { handled: true, status: 404, data: { error: '订单不存在' } };
    if (order.status === 'paid') return { handled: true, data: { success: true, message: '已支付' } };
    const { markOrderPaid } = require('./src/payment_gateway');
    markOrderPaid(orderId, `mock_${Date.now()}`, new Date().toISOString());
    return { handled: true, data: { success: true, message: 'Mock支付成功，Credits已发放' } };
  }

  return { handled: false };
}

// ============================================================
// 工具
// ============================================================

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { try { resolve(new URLSearchParams(body)); } catch(e2) { reject(e2); } }
    });
    req.on('error', reject);
  });
}

// ============================================================
// 导出路由处理函数
// ============================================================

module.exports = {
  handlePaymentRoute,
  listPackages,
  getOrder,
  getUserOrders,
  handleCallback,
};
