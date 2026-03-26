// Pclaw billing.js - 完整计费模块
const { Pool } = require('pg');
const crypto = require('crypto');
const pg = new Pool({
  host: process.env.PG_HOST || 'db.cgdmbsnfhwrcdbmgcbwt.supabase.co',
  port: process.env.PG_PORT || 6543,
  database: 'postgres',
  user: 'postgres',
  password: process.env.PG_PASSWORD || 'a1w2d3AWD!!!',
  max: 10,
  idleTimeoutMillis: 30000,
});

const JWT_SECRET = process.env.JWT_SECRET || 'claw-jwt-secret-change-in-production';
const TOKEN_EXPIRY = 86400 * 30; // 30天

function respond(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function signJWT(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY })).toString('base64url');
  const s = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}

function verifyJWT(token) {
  if (!token) return null;
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return null;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
    if (s !== expected) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

function requireAuth(req) {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  return verifyJWT(token);
}

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

async function getBalance(userId) {
  try {
    const { rows } = await pg.query(
      `SELECT COALESCE(SUM(
        CASE WHEN type = 'charge' THEN amount
        WHEN type IN ('spend','withdraw') THEN -amount
        ELSE 0 END), 0) AS balance
       FROM transactions WHERE user_id = $1`,
      [userId]
    );
    return Number(rows[0]?.balance) || 0;
  } catch { return 0; }
}

async function handleBilling(req, res, method, pathname, body) {
  const user = requireAuth(req);

  // POST /api/auth/register
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { email, password } = body || {};
    if (!email || !password) return respond(res, { error: 'Email and password required' }, 400);
    if (password.length < 6) return respond(res, { error: 'Password must be 6+ chars' }, 400);
    const userId = genId('usr');
    try {
      await pg.query(
        `INSERT INTO transactions (id, user_id, type, description)
         VALUES ($1, $2, 'register', $3)`,
        [genId('TXN'), userId, `注册: ${email}`]
      );
    } catch (e) {
      if (e.code === '23505') return respond(res, { error: 'Email already registered' }, 409);
    }
    const token = signJWT({ sub: userId, email });
    return respond(res, { token, user: { id: userId, email } });
  }

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email } = body || {};
    if (!email) return respond(res, { error: 'Email required' }, 400);
    // 简单登录：生成token（生产环境应验证密码）
    const userId = genId('usr');
    const token = signJWT({ sub: userId, email });
    return respond(res, { token, user: { id: userId, email } });
  }

  // 余额查询（需登录）
  if (pathname === '/api/balance' && method === 'GET') {
    if (!user) return respond(res, { error: 'Unauthorized' }, 401);
    const balance = await getBalance(user.sub);
    return respond(res, { success: true, balance });
  }

  // 交易记录（需登录）
  if (pathname === '/api/transactions' && method === 'GET') {
    if (!user) return respond(res, { error: 'Unauthorized' }, 401);
    const { rows } = await pg.query(
      `SELECT id, type, amount, description, created_at
       FROM transactions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [user.sub]
    ).catch(() => ({ rows: [] }));
    return respond(res, { success: true, transactions: rows || [] });
  }

  // 消费扣款（需登录）
  if (pathname === '/api/spend' && method === 'POST') {
    if (!user) return respond(res, { error: 'Unauthorized' }, 401);
    const { amount, description } = body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) return respond(res, { error: 'Invalid amount' }, 400);
    const balance = await getBalance(user.sub);
    if (balance < amt) return respond(res, { error: 'Insufficient balance', balance }, 400);
    const txId = genId('TXN');
    await pg.query(
      `INSERT INTO transactions (id, user_id, type, amount, description)
       VALUES ($1, $2, 'spend', $3, $4)`,
      [txId, user.sub, amt, description || '消费']
    ).catch(() => {});
    const newBalance = await getBalance(user.sub);
    return respond(res, { success: true, txId, spent: amt, balance: newBalance });
  }

  // 提现（需登录）
  if (pathname === '/api/withdraw' && method === 'POST') {
    if (!user) return respond(res, { error: 'Unauthorized' }, 401);
    const { amount, bank_account } = body || {};
    const amt = Number(amount);
    if (!amt || amt <= 0) return respond(res, { error: 'Invalid amount' }, 400);
    if (!bank_account) return respond(res, { error: 'Bank account required' }, 400);
    const balance = await getBalance(user.sub);
    if (balance < amt) return respond(res, { error: 'Insufficient balance', balance }, 400);
    const wid = genId('WDR');
    // 写 earnings 表
    await pg.query(
      `INSERT INTO earnings (id, user_id, amount, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())`,
      [wid, user.sub, amt]
    ).catch(() => {});
    // 写 transactions 表
    const txId = genId('TXN');
    await pg.query(
      `INSERT INTO transactions (id, user_id, type, amount, description, created_at)
       VALUES ($1, $2, 'withdraw', $3, $4, NOW())`,
      [txId, user.sub, amt, `提现至${bank_account}`]
    ).catch(() => {});
    const newBalance = await getBalance(user.sub);
    return respond(res, { success: true, withdrawId: wid, amount: amt, status: 'pending', balance: newBalance });
  }

  // 未匹配
  return undefined;
}

module.exports = { handleBilling, signJWT, verifyJWT };
