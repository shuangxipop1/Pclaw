// Pclaw Billing Module
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

const JWT_SECRET = process.env.JWT_SECRET || 'pclaw-jwt-secret';
const TOKEN_EXPIRY = 86400 * 30;

function respond(res, data, status) {
    res.writeHead(status || 200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

function signJWT(payload) {
    const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const p = Buffer.from(JSON.stringify({...payload, exp: Math.floor(Date.now()/1000) + TOKEN_EXPIRY})).toString('base64url');
    const s = crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+p).digest('base64url');
    return h+'.'+p+'.'+s;
}

function verifyJWT(token) {
    if (!token) return null;
    try {
        const [h, p, s] = token.split('.');
        if (!h || !p || !s) return null;
        const expected = crypto.createHmac('sha256', JWT_SECRET).update(h+'.'+p).digest('base64url');
        if (s !== expected) return null;
        const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
        if (payload.exp && Date.now()/1000 > payload.exp) return null;
        return payload;
    } catch(e) { return null; }
}

function requireAuth(req, res) {
    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
    const user = verifyJWT(token);
    if (!user?.sub) {
        respond(res, {error: 'Unauthorized'}, 401);
        return null;
    }
    return user;
}

function genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

async function getBalance(userId) {
    try {
        const {rows} = await pg.query(
            'SELECT COALESCE(SUM(CASE WHEN type=\'charge\' THEN amount WHEN type IN (\'spend\',\'withdraw\') THEN -amount ELSE 0 END), 0) as balance FROM transactions WHERE user_id=$1',
            [userId]
        );
        return Number(rows[0]?.balance) || 0;
    } catch(e) { return 0; }
}

async function handleBilling(req, res, method, pathname, body, token) {
    const user = token ? verifyJWT(token) : null;
    
    // GET /api/balance
    if (pathname === '/api/balance' && method === 'GET') {
        if (!user?.sub) return respond(res, {error: 'Unauthorized'}, 401);
        const balance = await getBalance(user.sub);
        return respond(res, {success: true, balance});
    }
    
    // GET /api/transactions
    if (pathname === '/api/transactions' && method === 'GET') {
        if (!user?.sub) return respond(res, {error: 'Unauthorized'}, 401);
        try {
            const {rows} = await pg.query(
                'SELECT id, type, amount, description, created_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
                [user.sub]
            );
            return respond(res, {success: true, transactions: rows || []});
        } catch(e) {
            return respond(res, {error: e.message}, 500);
        }
    }
    
    // POST /api/spend
    if (pathname === '/api/spend' && method === 'POST') {
        if (!user?.sub) return respond(res, {error: 'Unauthorized'}, 401);
        const {amount, description} = body || {};
        const amt = Number(amount);
        if (!amt || amt <= 0) return respond(res, {error: 'Invalid amount'}, 400);
        const balance = await getBalance(user.sub);
        if (balance < amt) return respond(res, {error: 'Insufficient balance', balance}, 400);
        const txId = genId('TX');
        try {
            await pg.query(
                'INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1,$2,$3,$4,$5)',
                [txId, user.sub, 'spend', amt, description || '消费']
            );
            const newBalance = await getBalance(user.sub);
            return respond(res, {success: true, txId, spent: amt, balance: newBalance});
        } catch(e) {
            return respond(res, {error: e.message}, 500);
        }
    }
    
    // POST /api/withdraw
    if (pathname === '/api/withdraw' && method === 'POST') {
        if (!user?.sub) return respond(res, {error: 'Unauthorized'}, 401);
        const {amount, bank_account} = body || {};
        const amt = Number(amount);
        if (!amt || amt <= 0) return respond(res, {error: 'Invalid amount'}, 400);
        if (!bank_account) return respond(res, {error: 'Bank account required'}, 400);
        const balance = await getBalance(user.sub);
        if (balance < amt) return respond(res, {error: 'Insufficient balance', balance}, 400);
        const wid = genId('WD');
        try {
            await pg.query(
                'INSERT INTO earnings (id, user_id, amount, status) VALUES ($1,$2,$3,$4)',
                [wid, user.sub, amt, 'pending']
            );
            const txId = genId('TX');
            await pg.query(
                'INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1,$2,$3,$4,$5)',
                [txId, user.sub, 'withdraw', amt, '提现至' + (bank_account || '')]
            );
            const newBalance = await getBalance(user.sub);
            return respond(res, {success: true, withdrawId: wid, amount: amt, status: 'pending', balance: newBalance});
        } catch(e) {
            return respond(res, {error: e.message}, 500);
        }
    }
    
    return undefined; // not handled
}

module.exports = { handleBilling, signJWT, verifyJWT };
