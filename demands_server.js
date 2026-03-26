/**
 * Pclaw API v6.1 - Demands/Earnings/Expo Microservice
 * Standalone Node.js (built-in modules only)
 * Run: node demands_server.js
 * Port: 3001
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { paymentRoutes, paymentInitTable, CHARGE_PACKAGES, PAYMENT_CONFIG } = require('./src/payment_inline');

const PORT = 3001;
const PG_CONN = 'postgresql://postgres:a1w2d3AWD!!!@db.cgdmbsnfhwrcdbmgcbwt.supabase.co:5432/postgres?sslmode=require';

async function pgQuery(sql, params) {
  const mod = await import('pg');
  const { Pool } = mod;
  const pool = new Pool({ connectionString: PG_CONN, ssl: { rejectUnauthorized: false }, max: 5, connectionTimeoutMillis: 15000 });
  try {
    const r = await pool.query(sql, params || []);
    await pool.end();
    return r;
  } catch(e) { await pool.end(); throw e; }
}

function response(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const endpoint = url.pathname;
  const params = Object.fromEntries(url.searchParams);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }

  let body = '';
  req.on('data', c => body += c);
  await new Promise(r => req.on('end', r));
  let parsed = {};
  try { parsed = JSON.parse(body || '{}'); } catch(e) {}

  try {
    // GET /api/demand/list
    if (endpoint === '/api/demand/list' && req.method === 'GET') {
      const r = await pgQuery('SELECT * FROM demands WHERE status=$1 ORDER BY created_at DESC LIMIT 50', ['open']);
      return response(res, { success: true, demands: r.rows });
    }

    // POST /api/demand/create
    if (endpoint === '/api/demand/create' && req.method === 'POST') {
      const { title, type, category, budget_min, budget_max, deadline, description, tags, user_id, user_email } = parsed;
      if (!title) return response(res, { error: '标题必填' }, 400);
      const id = 'dem_' + crypto.randomUUID().slice(0, 8);
      await pgQuery(
        'INSERT INTO demands(id,title,type,category,budget_min,budget_max,deadline,description,tags,user_id,user_email,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [id, title, type||'skill', category||'', budget_min||0, budget_max||0, deadline||'', description||'', JSON.stringify(tags||[]), user_id||'', user_email||'', 'open']
      );
      return response(res, { success: true, id });
    }

    // GET /api/earnings/list
    if (endpoint === '/api/earnings/list' && req.method === 'GET') {
      const uid = params.user_id;
      if (!uid) return response(res, { error: 'user_id必填' }, 400);
      const r = await pgQuery('SELECT * FROM earnings WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100', [uid]);
      return response(res, { success: true, earnings: r.rows });
    }

    // GET /api/expo/list
    if (endpoint === '/api/expo/list' && req.method === 'GET') {
      const r = await pgQuery('SELECT * FROM expos WHERE status=$1 ORDER BY price ASC', ['active']);
      return response(res, { success: true, expos: r.rows });
    }

    // POST /api/match
    if (endpoint === '/api/match' && req.method === 'POST') {
      const { demand_id, resource_id, amount } = parsed;
      if (!demand_id || !resource_id) return response(res, { error: '参数不全' }, 400);
      const earnId = 'earn_' + crypto.randomUUID().slice(0, 8);
      await pgQuery('INSERT INTO earnings(id,demand_id,skill_id,title,type,amount,role,status,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [earnId, demand_id, resource_id, '资源匹配', 'resource', (amount||0)*0.4, 'resource', 'pending', '']);
      await pgQuery('UPDATE demands SET status=$1 WHERE id=$2', ['matched', demand_id]);
      return response(res, { success: true, earning_id: earnId });
    }

    // Health check
    if (endpoint === '/health') {
      return response(res, { status: 'ok', service: 'demands-api', version: '6.1' });
    }

    // ===== Payment Routes =====
    const pr = paymentRoutes(req, res, endpoint, method, params, parsed, null, null, null, null, CHARGE_PACKAGES, PAYMENT_CONFIG);
    if (pr) return;

    response(res, { error: 'Not found' }, 404);
  } catch(e) {
    console.error('[DemandsAPI]', e.message);
    response(res, { error: e.message }, 500);
  }
}

// Init tables on startup
(async () => {
  console.log('[DemandsAPI] Starting v6.1...');
  try {
    await pgQuery(`CREATE TABLE IF NOT EXISTS demands (id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT DEFAULT 'skill', category TEXT DEFAULT '', budget_min REAL DEFAULT 0, budget_max REAL DEFAULT 0, deadline TEXT DEFAULT '', description TEXT DEFAULT '', tags TEXT DEFAULT '[]', user_id TEXT DEFAULT '', user_email TEXT DEFAULT '', status TEXT DEFAULT 'open', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
    console.log('[DemandsAPI] demands table OK');
    await pgQuery(`CREATE TABLE IF NOT EXISTS earnings (id TEXT PRIMARY KEY, demand_id TEXT DEFAULT '', skill_id TEXT DEFAULT '', title TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, role TEXT NOT NULL, status TEXT DEFAULT 'pending', user_id TEXT DEFAULT '', user_email TEXT DEFAULT '', currency TEXT DEFAULT 'CNY', created_at TIMESTAMP DEFAULT NOW())`);
    console.log('[DemandsAPI] earnings table OK');
    await pgQuery(`CREATE TABLE IF NOT EXISTS expos (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'normal', price REAL DEFAULT 99, status TEXT DEFAULT 'active', created_at TIMESTAMP DEFAULT NOW())`);
    console.log('[DemandsAPI] expos table OK');
    await pgQuery(`CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, package_id TEXT NOT NULL, credits INTEGER NOT NULL, amount REAL NOT NULL, currency TEXT DEFAULT 'CNY', provider TEXT NOT NULL, status TEXT DEFAULT 'pending', transaction_id TEXT DEFAULT '', paid_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);
    console.log('[DemandsAPI] payments table OK');

    const c = await pgQuery('SELECT COUNT(*) as cnt FROM expos');
    if (parseInt(c.rows[0].cnt) === 0) {
      await pgQuery(`INSERT INTO expos (id,name,type,price) VALUES ('expo_1','标准展会','normal',99),('expo_2','黄金展会','gold',699),('expo_3','冠名展会','crown',1999)`);
      console.log('[DemandsAPI] expo seed OK');
    }
    const d = await pgQuery('SELECT COUNT(*) as cnt FROM demands');
    if (parseInt(d.rows[0].cnt) === 0) {
      await pgQuery(`INSERT INTO demands (id,title,type,category,budget_min,budget_max,deadline,description,tags,user_id,status) VALUES ('dem_1','管道等轴测图BOM提取','skill','管道工程',50,200,'2026-04-15','上传管道等轴测图PDF自动提取BOM清单','["BIM","PDF"]','user_demo','open'),('dem_2','法律合同风险评估','service','法律',500,2000,'2026-04-20','建设工程合同风险评估','["法律","合同"]','user_demo','open'),('dem_3','专业工程翻译','service','翻译',100,500,'2026-04-10','中英互译专业术语','["翻译","工程"]','user_demo','open')`);
      console.log('[DemandsAPI] demand seed OK');
    }
    console.log('[DemandsAPI] All init done!');
  } catch(e) {
    console.error('[DemandsAPI] Init error:', e.message);
  }
  http.createServer(handle).listen(PORT, () => {
    console.log(`[DemandsAPI] Listening on port ${PORT}`);
  });
})();
