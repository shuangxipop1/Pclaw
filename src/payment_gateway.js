/**
 * Pclaw Payment Gateway - 统一支付网关
 * 
 * 支持：微信支付、支付宝、Stripe（国内外支付全覆盖）
 * 
 * 支付流程：
 *   1. 用户选择套餐 → POST /api/payment/create
 *   2. 后端创建订单 → 调用对应支付网关
 *   3. 返回支付链接/二维码 → 用户扫码支付
 *   4. 支付成功 → 回调通知 → 发放Credits
 */

const https = require('https');
const crypto = require('crypto');

// ============================================================
// 配置
// ============================================================

const CONFIG = {
  wechat: {
    enabled: false,
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
    appId: process.env.WECHAT_APP_ID || '',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://www.pclawai.com/api/payment/notify/wechat',
  },
  alipay: {
    enabled: false,
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'https://www.pclawai.com/api/payment/notify/alipay',
  },
  stripe: {
    enabled: false,
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    currency: 'cny', // Stripe人民币收款
  },
  // 本地开发模式（无商户号时）
  mock: {
    enabled: true,
  },
};

// 充值套餐
const CHARGE_PACKAGES = [
  { id: 'basic',   name: '基础包',   credits: 100,  price: 10,  bonus: 0,   label: '¥10/100 Credits' },
  { id: 'standard',name: '标准包',   credits: 550,  price: 50,  bonus: 10,  label: '¥50/550 Credits (+10%)' },
  { id: 'pro',     name: '专业包',   credits: 1200, price: 100, bonus: 20,  label: '¥100/1200 Credits (+20%)' },
  { id: 'enterprise',name:'企业包', credits: 7000, price: 500, bonus: 40,  label: '¥500/7000 Credits (+40%)' },
];

// ============================================================
// 基础工具
// ============================================================

function generateOrderId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString('hex');
  return `PAY_${ts}_${rand}`.toUpperCase();
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sha256(str, key) {
  return crypto.createHmac('sha256', key).update(str).digest('hex');
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.connection?.remoteAddress
    || '';
}

// ============================================================
// 统一订单存储（内存 + 持久化）
// ============================================================

const orders = new Map();
// 字段：orderId, userId, packageId, credits, amount, currency,
//       provider, status, createdAt, paidAt, metadata

// ============================================================
// 支付网关基类
// ============================================================

class PaymentProvider {
  constructor(name) {
    this.name = name;
  }

  async createPayment(order) {
    throw new Error('子类必须实现 createPayment()');
  }

  async verifyCallback(data, headers) {
    throw new Error('子类必须实现 verifyCallback()');
  }

  parseCallbackOrder(data) {
    throw new Error('子类必须实现 parseCallbackOrder()');
  }
}

// ============================================================
// Stripe Provider（支持全球信用卡）
// ============================================================

class StripeProvider extends PaymentProvider {
  constructor() {
    super('stripe');
  }

  getConfig() {
    return CONFIG.stripe;
  }

  async createPayment(order) {
    const cfg = this.getConfig();
    if (!cfg.enabled || !cfg.secretKey) {
      // Mock 模式
      return {
        type: 'mock',
        orderId: order.orderId,
        amount: order.amount,
        mock: true,
        instruction: 'Stripe未配置，模拟支付成功（开发模式）',
      };
    }

    // Stripe Create PaymentIntent
    const payload = JSON.stringify({
      amount: Math.round(order.amount * 100), // cents
      currency: cfg.currency || 'cny',
      metadata: {
        orderId: order.orderId,
        userId: order.userId,
        packageId: order.packageId,
      },
    });

    const options = {
      hostname: 'api.stripe.com',
      path: '/v1/payment_intents',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    const result = await this._httpsRequest(options, payload);
    
    if (result.error) {
      return { type: 'error', error: result.error.message };
    }

    return {
      type: 'stripe',
      orderId: order.orderId,
      clientSecret: result.client_secret,
      paymentIntentId: result.id,
      amount: order.amount,
    };
  }

  async verifyCallback(rawBody, headers) {
    const cfg = this.getConfig();
    if (!cfg.webhookSecret) return { valid: false, error: 'no webhook secret' };

    const sig = headers['stripe-signature'];
    try {
      const event = JSON.parse(rawBody);
      // 真实环境：用stripe.webhooks.constructEvent验签
      return { valid: true, event };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  parseCallbackOrder(event) {
    if (event.type !== 'payment_intent.succeeded') return null;
    const meta = event.data?.object?.metadata || {};
    return {
      orderId: meta.orderId,
      status: 'paid',
      transactionId: event.data?.object?.id,
    };
  }

  async _httpsRequest(options, payload) {
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve({ error: { message: 'parse error' } }); }
        });
      });
      req.on('error', () => resolve({ error: { message: 'network error' } }));
      req.write(payload);
      req.end();
    });
  }
}

// ============================================================
// 微信支付 Provider
// ============================================================

class WechatPayProvider extends PaymentProvider {
  constructor() {
    super('wechat');
  }

  getConfig() {
    return CONFIG.wechat;
  }

  async createPayment(order) {
    const cfg = this.getConfig();
    if (!cfg.enabled || !cfg.mchId || !cfg.apiKey) {
      return {
        type: 'mock',
        orderId: order.orderId,
        provider: 'wechat',
        mock: true,
        instruction: '微信支付未配置，模拟支付成功（开发模式）',
      };
    }

    // 微信统单下单API
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    
    const signParams = {
      appid: cfg.appId,
      mch_id: cfg.mchId,
      nonce_str: nonceStr,
      body: `Pclaw充值-${order.packageId}`,
      out_trade_no: order.orderId,
      total_fee: Math.round(order.amount * 100), // 分
      spbill_create_ip: order.clientIp,
      notify_url: cfg.notifyUrl,
      trade_type: 'NATIVE',
    };

    // 构建签名
    const sign = this._buildSign(signParams, cfg.apiKey);
    signParams.sign = sign;

    const xml = this._toXml(signParams);
    const result = await this._postXml('https://api.mch.weixin.qq.com/pay/unifiedorder', xml);

    if (result.result_code !== 'SUCCESS') {
      return { type: 'error', error: result.err_code_des || '微信支付错误' };
    }

    return {
      type: 'wechat',
      orderId: order.orderId,
      codeUrl: result.code_url,    // NATIVE二维码链接
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200×200&data=${encodeURIComponent(result.code_url)}`,
      amount: order.amount,
      instruction: '请使用微信扫码支付',
    };
  }

  async verifyCallback(query) {
    const cfg = this.getConfig();
    if (!cfg.apiKey) return { valid: false };
    const { sign, ...params } = query;
    const expected = this._buildSign(params, cfg.apiKey);
    return { valid: sign === expected };
  }

  parseCallbackOrder(xmlData) {
    const params = this._fromXml(xmlData);
    if (params.result_code !== 'SUCCESS' || params.return_code !== 'SUCCESS') return null;
    return {
      orderId: params.out_trade_no,
      status: params.trade_state === 'SUCCESS' ? 'paid' : 'pending',
      transactionId: params.transaction_id,
      paidAt: params.time_end,
    };
  }

  _buildSign(params, key) {
    const str = Object.keys(params).sort()
      .map(k => `${k}=${params[k]}`)
      .join('&') + `&key=${key}`;
    return md5(str).toUpperCase();
  }

  _toXml(params) {
    return '<xml>' + Object.entries(params)
      .map(([k, v]) => `<${k}><![CDATA[${v}]]></${k}>`)
      .join('') + '</xml>';
  }

  _fromXml(xml) {
    const result = {};
    const matches = xml.matchAll(/<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>/g);
    for (const m of matches) result[m[1]] = m[2];
    return result;
  }

  async _postXml(url, xml) {
    const urlObj = new URL(url);
    return new Promise((resolve) => {
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'text/xml', 'Content-Length': Buffer.byteLength(xml) },
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          const result = {};
          const matches = data.matchAll(/<(\w+)><!\[CDATA\[([^\]]*)\]\]><\/\1>/g);
          for (const m of matches) result[m[1]] = m[2];
          resolve(result);
        });
      });
      req.on('error', () => resolve({}));
      req.write(xml);
      req.end();
    });
  }
}

// ============================================================
// 支付宝 Provider
// ============================================================

class AlipayProvider extends PaymentProvider {
  constructor() {
    super('alipay');
  }

  getConfig() {
    return CONFIG.alipay;
  }

  async createPayment(order) {
    const cfg = this.getConfig();
    if (!cfg.enabled || !cfg.appId || !cfg.privateKey) {
      return {
        type: 'mock',
        orderId: order.orderId,
        provider: 'alipay',
        mock: true,
        instruction: '支付宝未配置，模拟支付成功（开发模式）',
      };
    }

    // 支付宝电脑网站支付
    const bizContent = {
      outTradeNo: order.orderId,
      productCode: 'FAST_INSTANT_TRADE_PAY',
      totalAmount: order.amount.toString(),
      subject: `Pclaw充值-${order.packageId}`,
      quitUrl: 'https://www.pclawai.com',
    };

    const params = {
      app_id: cfg.appId,
      method: 'alipay.trade.page.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace(/[:\-T]/g, '').slice(0, 14) + 'Z',
      version: '1.0',
      biz_content: JSON.stringify(bizContent),
      notify_url: cfg.notifyUrl,
      return_url: 'https://www.pclawai.com/payment/success',
    };

    params.sign = this._signParams(params, cfg.privateKey);
    const payUrl = 'https://openapi.alipay.com/gateway.do?' + 
      Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');

    return {
      type: 'alipay',
      orderId: order.orderId,
      payUrl,
      amount: order.amount,
      instruction: '请点击链接使用支付宝支付',
    };
  }

  async verifyCallback(params) {
    const cfg = this.getConfig();
    if (!cfg.alipayPublicKey) return { valid: false };
    const { sign, ...data } = params;
    const signStr = Object.keys(data).sort()
      .map(k => `${k}=${data[k]}`)
      .join('&');
    const expected = crypto.createVerify('RSA-SHA256')
      .update(signStr)
      .verify(cfg.alipayPublicKey, sign, 'base64');
    return { valid: expected };
  }

  parseCallbackOrder(params) {
    if (params.trade_status !== 'TRADE_SUCCESS') return null;
    return {
      orderId: params.out_trade_no,
      status: 'paid',
      transactionId: params.trade_no,
      paidAt: params.gmt_payment,
    };
  }

  _signParams(params, privateKey) {
    const signStr = Object.keys(params).sort()
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return crypto.createSign('RSA-SHA256')
      .update(signStr)
      .sign(privateKey, 'base64');
  }
}

// ============================================================
// Mock Provider（开发/测试模式）
// ============================================================

class MockProvider extends PaymentProvider {
  constructor() {
    super('mock');
  }

  async createPayment(order) {
    return {
      type: 'mock',
      orderId: order.orderId,
      provider: 'mock',
      mock: true,
      amount: order.amount,
      instruction: '开发模式：5秒后自动变为已支付',
      autoPaid: true,
    };
  }

  async verifyCallback() {
    return { valid: true };
  }

  parseCallbackOrder() {
    return null;
  }
}

// ============================================================
// 支付网关工厂
// ============================================================

const providers = {
  wechat: new WechatPayProvider(),
  alipay: new AlipayProvider(),
  stripe: new StripeProvider(),
  mock: new MockProvider(),
};

function getProvider(name) {
  return providers[name] || providers.mock;
}

// ============================================================
// 统一支付接口
// ============================================================

/**
 * 创建支付订单
 * @param {object} opts - { userId, packageId, provider, req }
 * @returns {object} - { orderId, payUrl/qrCode, amount, credits }
 */
async function createPayment(opts) {
  const { userId, packageId, provider = 'mock', req } = opts;
  
  // 查找套餐
  const pkg = CHARGE_PACKAGES.find(p => p.id === packageId);
  if (!pkg) {
    throw new Error(`未知套餐: ${packageId}`);
  }

  const orderId = generateOrderId();
  const order = {
    orderId,
    userId,
    packageId,
    credits: pkg.credits + pkg.bonus,
    creditsBase: pkg.credits,
    bonus: pkg.bonus,
    amount: pkg.price,
    currency: provider === 'stripe' ? 'cny' : 'CNY',
    provider,
    status: 'pending',
    createdAt: new Date().toISOString(),
    clientIp: getClientIp(req || {}),
    metadata: {},
  };

  orders.set(orderId, order);

  // 调用对应支付网关
  const prov = getProvider(provider);
  const result = await prov.createPayment(order);

  if (result.type === 'error') {
    throw new Error(result.error);
  }

  return {
    orderId,
    provider,
    credits: order.credits,
    amount: order.amount,
    currency: order.currency,
    ...result,
  };
}

/**
 * 查询订单状态
 */
function getOrder(orderId) {
  return orders.get(orderId) || null;
}

/**
 * 更新订单状态（回调成功时调用）
 */
function markOrderPaid(orderId, transactionId, paidAt) {
  const order = orders.get(orderId);
  if (!order) return false;
  order.status = 'paid';
  order.transactionId = transactionId;
  order.paidAt = paidAt || new Date().toISOString();
  orders.set(orderId, order);
  return true;
}

/**
 * 获取用户充值历史
 */
function getUserOrders(userId) {
  return Array.from(orders.values())
    .filter(o => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 处理支付回调（根据不同provider）
 */
async function handleCallback(providerName, data, headers, rawBody) {
  const prov = getProvider(providerName);
  
  // 验证签名
  const verifyResult = await prov.verifyCallback(data, headers);
  if (!verifyResult.valid) {
    return { success: false, error: '验签失败' };
  }

  // 解析订单
  const orderInfo = prov.parseCallbackOrder
    ? prov.parseCallbackOrder(data, rawBody)
    : prov.parseCallbackOrder(data);

  if (!orderInfo || !orderInfo.orderId) {
    return { success: false, error: '解析订单失败' };
  }

  if (orderInfo.status === 'paid') {
    markOrderPaid(orderInfo.orderId, orderInfo.transactionId, orderInfo.paidAt);
    
    // TODO: 触发 Credits 发放
    // await creditService.creditUser(orderInfo.orderId);
  }

  return { success: true, orderId: orderInfo.orderId };
}

/**
 * 列出所有套餐
 */
function listPackages() {
  return CHARGE_PACKAGES;
}

// ============================================================
// 导出
// ============================================================

module.exports = {
  CONFIG,
  createPayment,
  getOrder,
  markOrderPaid,
  getUserOrders,
  handleCallback,
  listPackages,
  getProvider,
  providers,
  CHARGE_PACKAGES,
};
