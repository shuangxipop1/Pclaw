/**
 * Pclaw Payment Inline - 内嵌到 demands_server.js 的支付模块
 * 纯 Node.js built-in，无第三方依赖
 * 
 * 添加路由：
 *   GET  /api/payment/packages
 *   POST /api/payment/create
 *   GET  /api/payment/order/:id
 *   GET  /api/payment/orders/:userId
 *   POST /api/payment/mock/success
 *   GET  /api/payment/config
 * 
 * 添加表：payments (id, user_id, package_id, credits, amount, provider, status, transaction_id, created_at)
 */

const https = require('https');
const crypto = require('crypto');

// ============ 充值套餐 ============
const CHARGE_PACKAGES = [
  { id: 'basic',      name: '基础包',   credits: 100,  price: 10,  bonus: 0,  label: '¥10/100 Credits' },
  { id: 'standard',   name: '标准包',   credits: 550,  price: 50,  bonus: 10, label: '¥50/550 Credits (+10%)' },
  { id: 'pro',        name: '专业包',   credits: 1200, price: 100, bonus: 20, label: '¥100/1200 Credits (+20%)' },
  { id: 'enterprise', name: '企业包',   credits: 7000, price: 500, bonus: 40, label: '¥500/7000 Credits (+40%)' },
];

// ============ 支付配置 ============
const PAYMENT_CONFIG = {
  wechat:  { enabled: false, mchId: '', appId: '', apiKey: '' },
  alipay:  { enabled: false, appId: '', privateKey: '', alipayPublicKey: '' },
  stripe:  { enabled: false, secretKey: '', webhookSecret: '' },
  mock:    { enabled: true },
};

// ============ 内存订单存储 ============
const paymentOrders = new Map(); // orderId -> order

function genOrderId() {
  return 'PAY_' + Date.now().toString(36).toUpperCase() + '_' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ============ 微信签名 ============
function wechatSign(params, key) {
  const str = Object.keys(params).sort()
    .map(k => `${k}=${params[k]}`)
    .join('&') + `&key=${key}`;
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

function toXml(params) {
  return '<xml>' + Object.entries(params)
    .map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`)
    .join('') + '</xml>';
}

function fromXml(xml) {
  const result = {};
  const re = /<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>/g;
  let m;
  while ((m = re.exec(xml)) !== null) result[m[1]] = m[2];
  return result;
}

// ============ 微信创建订单 ============
async function wechatCreateOrder(order) {
  const cfg = PAYMENT_CONFIG.wechat;
  if (!cfg.enabled || !cfg.mchId) {
    return { type: 'mock', orderId: order.orderId, provider: 'wechat', mock: true };
  }

  const nonceStr = crypto.randomBytes(16).toString('hex');
  const params = {
    appid: cfg.appId,
    mch_id: cfg.mchId,
    nonce_str: nonceStr,
    body: `Pclaw充值-${order.packageId}`,
    out_trade_no: order.orderId,
    total_fee: Math.round(order.amount * 100),
    spbill_create_ip: order.clientIp || '127.0.0.1',
    notify_url: 'https://www.pclawai.com/api/payment/notify/wechat',
    trade_type: 'NATIVE',
  };
  params.sign = wechatSign(params, cfg.apiKey);
  const xml = toXml(params);

  const result = await new Promise((resolve) => {
    const urlObj = new URL('https://api.mch.weixin.qq.com/pay/unifiedorder');
    const req = https.request({
      hostname: urlObj.hostname, path: urlObj.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(xml) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(fromXml(data)));
    });
    req.on('error', () => resolve({}));
    req.write(xml);
    req.end();
  });

  if (result.result_code !== 'SUCCESS') {
    return { type: 'error', error: result.err_code_des || '微信支付错误' };
  }

  return {
    type: 'wechat',
    orderId: order.orderId,
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.code_url)}`,
    codeUrl: result.code_url,
    amount: order.amount,
    instruction: '请使用微信扫码支付',
  };
}

// ============ Stripe创建订单 ============
async function stripeCreateOrder(order) {
  const cfg = PAYMENT_CONFIG.stripe;
  if (!cfg.enabled || !cfg.secretKey) {
    return { type: 'mock', orderId: order.orderId, provider: 'stripe', mock: true };
  }

  const payload = JSON.stringify({
    amount: Math.round(order.amount * 100),
    currency: 'cny',
    metadata: { orderId: order.orderId, userId: order.userId },
  });

  const result = await new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.stripe.com', path: '/v1/payment_intents',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ error: { message: 'parse error' } }); }
      });
    });
    req.on('error', () => resolve({ error: { message: 'network error' } }));
    req.write(payload);
    req.end();
  });

  if (result.error) return { type: 'error', error: result.error.message };

  return {
    type: 'stripe',
    orderId: order.orderId,
    clientSecret: result.client_secret,
    paymentIntentId: result.id,
    amount: order.amount,
  };
}

// ============ 创建支付 ============
async function paymentCreate(opts) {
  const { userId, packageId, provider, req } = opts;
  const pkg = CHARGE_PACKAGES.find(p => p.id === packageId);
  if (!pkg) throw new Error(`未知套餐: ${packageId}`);

  const orderId = genOrderId();
  const order = {
    orderId,
    userId,
    packageId,
    credits: pkg.credits + pkg.bonus,
    creditsBase: pkg.credits,
    bonus: pkg.bonus,
    amount: pkg.price,
    currency: 'CNY',
    provider: provider || 'mock',
    status: 'pending',
    createdAt: new Date().toISOString(),
    clientIp: (req && req.headers) ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || '' : '',
    transactionId: '',
  };
  paymentOrders.set(orderId, order);

  let result;
  if (order.provider === 'wechat') {
    result = await wechatCreateOrder(order);
  } else if (order.provider === 'stripe') {
    result = await stripeCreateOrder(order);
  } else {
    result = { type: 'mock', orderId, provider: 'mock', mock: true, instruction: '开发模式：调用 /api/payment/mock/success 模拟支付成功' };
  }

  if (result.type === 'error') throw new Error(result.error);
  return { orderId, provider: order.provider, credits: order.credits, amount: order.amount, currency: order.currency, ...result };
}

// ============ 查询 ============
function paymentGetOrder(orderId) {
  return paymentOrders.get(orderId) || null;
}

function paymentGetUserOrders(userId) {
  return Array.from(paymentOrders.values())
    .filter(o => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function paymentMarkPaid(orderId, transactionId) {
  const order = paymentOrders.get(orderId);
  if (!order) return false;
  order.status = 'paid';
  order.transactionId = transactionId || `mock_${Date.now()}`;
  order.paidAt = new Date().toISOString();
  paymentOrders.set(orderId, order);
  return true;
}

// ============ SQL: 初始化 payments 表 ============
async function paymentInitTable(pgQuery) {
  await pgQuery(`CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    package_id TEXT NOT NULL,
    credits INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'CNY',
    provider TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    transaction_id TEXT DEFAULT '',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  console.log('[DemandsAPI] payments table OK');
}

// ============ 路由处理（添加到 demands_server handle 函数中）============
// 在 demands_server.js 的 handle() 函数开头附近添加：
// const paymentRoutes = require('./payment_inline')(response);
/*
在 try 块中添加 payment 路由检查：
  const pr = paymentRoutes(req, res, endpoint, method, params, parsed, paymentCreate, paymentGetOrder, paymentGetUserOrders, paymentMarkPaid, CHARGE_PACKAGES, PAYMENT_CONFIG);
  if (pr !== null) return; // 已处理
*/
// JSON response helper
function response(res, data, statusCode) {
  if (typeof res === "undefined") return;
  const sc = statusCode || 200;
  res.writeHead(sc, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function paymentRoutes(req, res, endpoint, method, params, parsed, paymentCreate, paymentGetOrder, paymentGetUserOrders, paymentMarkPaid, CHARGE_PACKAGES, PAYMENT_CONFIG) {
  // GET /api/payment/packages
  if (endpoint === '/api/payment/packages' && method === 'GET') {
    response(res, { success: true, packages: CHARGE_PACKAGES });
    return true;
  }

  // GET /api/payment/config
  if (endpoint === '/api/payment/config' && method === 'GET') {
    response(res, {
      success: true,
      providers: {
        wechat: PAYMENT_CONFIG.wechat.enabled,
        alipay: PAYMENT_CONFIG.alipay.enabled,
        stripe: PAYMENT_CONFIG.stripe.enabled,
        mock: PAYMENT_CONFIG.mock.enabled,
      },
      currency: 'CNY',
    });
    return true;
  }

  // POST /api/payment/create
  if (endpoint === '/api/payment/create' && method === 'POST') {
    const { userId, packageId, provider } = parsed;
    if (!userId || !packageId) { response(res, { error: '缺少 userId 或 packageId' }, 400); return true; }
    paymentCreate({ userId, packageId, provider: provider || 'mock', req })
      .then(data => response(res, { success: true, data }))
      .catch(e => response(res, { error: e.message }, 400));
    return true;
  }

  // GET /api/payment/order/:id
  const orderMatch = endpoint.match(/^\/api\/payment\/order\/([\w_]+)$/);
  if (orderMatch && method === 'GET') {
    const order = paymentGetOrder(orderMatch[1]);
    if (!order) { response(res, { error: '订单不存在' }, 404); return true; }
    response(res, { success: true, order });
    return true;
  }

  // GET /api/payment/orders/:userId
  const ordersMatch = endpoint.match(/^\/api\/payment\/orders\/([\w_-]+)$/);
  if (ordersMatch && method === 'GET') {
    const orders = paymentGetUserOrders(ordersMatch[1]);
    response(res, { success: true, orders });
    return true;
  }

  // POST /api/payment/mock/success
  if (endpoint === '/api/payment/mock/success' && method === 'POST') {
    const { orderId } = parsed || {};
    if (!orderId) { response(res, { error: '缺少 orderId' }, 400); return true; }
    const order = paymentGetOrder(orderId);
    if (!order) { response(res, { error: '订单不存在' }, 404); return true; }
    if (order.status === 'paid') { response(res, { success: true, message: '已支付' }); return true; }
    const ok = paymentMarkPaid(orderId, `mock_${Date.now()}`);
    response(res, { success: ok, message: ok ? 'Mock支付成功' : '失败' });
    return true;
  }

  // POST /api/payment/mock/charge（Mock充值：直接发放Credits）
  if (endpoint === '/api/payment/mock/charge' && method === 'POST') {
    const { userId, packageId } = parsed || {};
    if (!userId || !packageId) { response(res, { error: '缺少参数' }, 400); return true; }
    const pkg = CHARGE_PACKAGES.find(p => p.id === packageId);
    if (!pkg) { response(res, { error: '未知套餐' }, 400); return true; }
    const orderId = genOrderId();
    paymentMarkPaid(orderId, `mock_${Date.now()}`);
    response(res, {
      success: true,
      data: {
        orderId,
        userId,
        packageId,
        credits: pkg.credits + pkg.bonus,
        amount: pkg.price,
        status: 'paid',
        mock: true,
      }
    });
    return true;
  }

  return null; // 未匹配
}

module.exports = { paymentRoutes, paymentCreate, paymentGetOrder, paymentGetUserOrders, paymentMarkPaid, paymentInitTable, CHARGE_PACKAGES, PAYMENT_CONFIG };
