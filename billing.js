const { Pool } = require("pg");
const crypto = require("crypto");
const pg = new Pool({
  host: process.env.PG_HOST || "db.cgdmbsnfhwrcdbmgcbwt.supabase.co",
  port: 6543,
  database: "postgres",
  user: "postgres",
  password: process.env.PG_PASSWORD || "a1w2d3AWD!!!",
  max: 10,
  idleTimeoutMillis: 30000,
});
const JWT_SECRET = process.env.JWT_SECRET || "claw-jwt-secret";

function respond(res, data, status) {
  res.writeHead(status || 200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function signJWT(payload) {
  const h = Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");
  const p = Buffer.from(JSON.stringify({...payload, exp: Math.floor(Date.now()/1000) + 86400*30})).toString("base64url");
  const s = crypto.createHmac("sha256", JWT_SECRET).update(h+"."+p).digest("base64url");
  return h+"."+p+"."+s;
}

function verifyJWT(token) {
  if (!token) return null;
  try {
    const [hh, pp, ss] = token.split(".");
    if (!hh || !pp || !ss) return null;
    const expected = crypto.createHmac("sha256", JWT_SECRET).update(hh+"."+pp).digest("base64url");
    if (ss !== expected) return null;
    const payload = JSON.parse(Buffer.from(pp, "base64url").toString());
    if (payload.exp && Date.now()/1000 > payload.exp) return null;
    return payload;
  } catch(e) { return null; }
}

function requireAuth(req) {
  const token = (req.headers.authorization||"").replace(/^Bearer\s+/i,"").trim();
  return verifyJWT(token);
}

function genId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + crypto.randomBytes(4).toString("hex");
}

async function getBalance(uid) {
  try {
    const {rows} = await pg.query(
      "SELECT COALESCE(SUM(CASE WHEN type='charge' THEN amount WHEN type IN ('spend','withdraw') THEN -amount ELSE 0 END), 0) as bal FROM transactions WHERE user_id=$1",
      [uid]
    );
    return Number(rows[0]?.bal || 0);
  } catch(e) { return 0; }
}

async function handleBilling(req, res, method, pathname, body) {
  const user = requireAuth(req);

  // GET /api/balance
  if (pathname === "/api/balance" && method === "GET") {
    if (!user?.sub) { respond(res, {error:"Unauthorized"}, 401); return; }
    const bal = await getBalance(user.sub);
    respond(res, {success:true, balance:bal});
    return;
  }

  // GET /api/transactions
  if (pathname === "/api/transactions" && method === "GET") {
    if (!user?.sub) { respond(res, {error:"Unauthorized"}, 401); return; }
    try {
      const {rows} = await pg.query(
        "SELECT id, type, amount, description, created_at FROM transactions WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
        [user.sub]
      );
      respond(res, {success:true, transactions:rows});
    } catch(e) { respond(res, {error:e.message}, 500); }
    return;
  }

  // POST /api/spend
  if (pathname === "/api/spend" && method === "POST") {
    if (!user?.sub) { respond(res, {error:"Unauthorized"}, 401); return; }
    const {amount, description} = body || {};
    if (!amount || isNaN(Number(amount))) { respond(res, {error:"Invalid amount"}, 400); return; }
    const amt = Number(amount);
    if (amt <= 0) { respond(res, {error:"Amount must be positive"}, 400); return; }
    const bal = await getBalance(user.sub);
    if (bal < amt) { respond(res, {error:"Insufficient balance", balance:bal}, 400); return; }
    const txId = genId("TX");
    try {
      await pg.query(
        "INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1,$2,$3,$4,$5)",
        [txId, user.sub, "spend", amt, description||"消费"]
      );
      const newBal = await getBalance(user.sub);
      respond(res, {success:true, txId, spent:amt, balance:newBal});
    } catch(e) { respond(res, {error:e.message}, 500); }
    return;
  }

  // POST /api/withdraw
  if (pathname === "/api/withdraw" && method === "POST") {
    if (!user?.sub) { respond(res, {error:"Unauthorized"}, 401); return; }
    const {amount, bank_account} = body || {};
    if (!amount || isNaN(Number(amount))) { respond(res, {error:"Invalid amount"}, 400); return; }
    if (!bank_account) { respond(res, {error:"Bank account required"}, 400); return; }
    const amt = Number(amount);
    if (amt <= 0) { respond(res, {error:"Amount must be positive"}, 400); return; }
    const bal = await getBalance(user.sub);
    if (bal < amt) { respond(res, {error:"Insufficient balance", balance:bal}, 400); return; }
    const wid = genId("WD");
    try {
      await pg.query(
        "INSERT INTO earnings (id, user_id, amount, status) VALUES ($1,$2,$3,$4)",
        [wid, user.sub, amt, "pending"]
      );
      await pg.query(
        "INSERT INTO transactions (id, user_id, type, amount, description) VALUES ($1,$2,$3,$4,$5)",
        [genId("TX"), user.sub, "withdraw", amt, "提现至" + (bank_account||"")]
      );
      const newBal = await getBalance(user.sub);
      respond(res, {success:true, withdrawId:wid, amount:amt, status:"pending", balance:newBal});
    } catch(e) { respond(res, {error:e.message}, 500); }
    return;
  }
}

module.exports = { handleBilling, signJWT };
