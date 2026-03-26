/**
 * Pclaw API Server - v6.0 完整版
 * 使用Node.js内置模块，无需npm依赖
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

const PORT = 3001;

// 数据持久化
const DATA_FILE = '/tmp/pclaw-data.json';

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {}
    return {};
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
}

let data = loadData();

// 初始化数据
function initData() {
    data.users = data.users || {};
    data.tasks = data.tasks || {};
    data.payments = data.payments || {};
    data.skills = data.skills || {};
    data.sessions = data.sessions || {};
    data.nodes = data.nodes || {};
    data.notifications = data.notifications || {};
    data.invites = data.invites || {};
    data.skillsCall = data.skillsCall || {};
    data.comments = data.comments || {};
    data.messages = data.messages || {};
    data.withdrawals = data.withdrawals || {};
    data.appeals = data.appeals || {};
    data.pageviews = data.pageviews || {};
    
    if (Object.keys(data.skills).length === 0) {
        data.skills = {
            'skill_1': { id: 'skill_1', name: 'Python数据分析', category: 'data', price: 50, sales: 156, provider: '官方', rating: 4.8, description: '专业Python数据分析', enabled: true, tags: ['Python', '数据分析'], status: 'approved' },
            'skill_2': { id: 'skill_2', name: '文案撰写', category: 'writing', price: 30, sales: 289, provider: '官方', rating: 4.9, description: '各类文案写作', enabled: true, tags: ['文案', '写作'], status: 'approved' },
            'skill_3': { id: 'skill_3', name: '代码审查', category: 'code', price: 80, sales: 98, provider: '官方', rating: 4.7, description: '代码审查与优化', enabled: true, tags: ['代码', 'review'], status: 'approved' },
            'skill_4': { id: 'skill_4', name: 'AI绘画', category: 'design', price: 100, sales: 45, provider: '官方', rating: 4.9, description: 'Midjourney/DALL-E绘画', enabled: true, tags: ['AI', '绘画'], status: 'approved' },
            'skill_5': { id: 'skill_5', name: '翻译服务', category: 'translate', price: 20, sales: 312, provider: '官方', rating: 4.8, description: '多语言翻译', enabled: true, tags: ['翻译', '语言'], status: 'approved' }
        };
    }
    
    if (Object.keys(data.nodes).length === 0) {
        data.nodes = {
            'node_1': { id: 'node_1', name: 'US-East-1', location: '美国', locationCode: 'us-east', status: 'online', cpu: 45, memory: 62, tasks: 128, latency: 120, owner: 'system', registeredAt: new Date().toISOString() },
            'node_2': { id: 'node_2', name: 'EU-West-1', location: '欧洲', locationCode: 'eu-west', status: 'online', cpu: 38, memory: 55, tasks: 96, latency: 180, owner: 'system', registeredAt: new Date().toISOString() },
            'node_3': { id: 'node_3', name: 'Asia-East-1', location: '亚太', locationCode: 'asia-east', status: 'online', cpu: 52, memory: 48, tasks: 156, latency: 50, owner: 'system', registeredAt: new Date().toISOString() },
            'node_4': { id: 'node_4', name: 'China-Mainland', location: '中国大陆', locationCode: 'cn', status: 'online', cpu: 41, memory: 59, tasks: 112, latency: 20, owner: 'system', registeredAt: new Date().toISOString() }
        };
    }
    
    saveData(data);
}

initData();

// Token管理
function createToken(user) {
    const token = crypto.randomUUID();
    data.sessions[token] = { userId: user.id, email: user.email, createdAt: Date.now() };
    saveData(data);
    return token;
}

function verifyToken(tokenStr) {
    if (!tokenStr || !data.sessions[tokenStr]) return null;
    const session = data.sessions[tokenStr];
    if (Date.now() - session.createdAt > 24 * 60 * 60 * 1000) {
        delete data.sessions[tokenStr];
        saveData(data);
        return null;
    }
    return session;
}

// 创建通知
function createNotification(userId, title, content, type = 'system') {
    const notifId = 'notif_' + crypto.randomUUID().slice(0, 8);
    data.notifications[notifId] = { id: notifId, userId, title, content, type, read: false, createdAt: new Date().toISOString() };
    saveData(data);
    return data.notifications[notifId];
}

// 路由处理
async function handleRequest(method, path, body, token) {
    const url = new URL(path, `http://localhost:${PORT}`);
    const endpoint = url.pathname;
    const params = Object.fromEntries(url.searchParams);
    
    console.log(`${method} ${endpoint}`);
    
    // ==================== 公开接口 ====================
    
    if (method === 'GET' && endpoint === '/api/health') {
        return { status: 'ok', timestamp: new Date().toISOString(), version: '6.0.0',
            stats: { users: Object.keys(data.users).length, tasks: Object.keys(data.tasks).length, skills: Object.keys(data.skills).length, sessions: Object.keys(data.sessions).length, nodes: Object.keys(data.nodes).length }
        };
    }
    
    if (endpoint === '/api/home/stats') {
        return { success: true, stats: {
            totalUsers: Object.keys(data.users).length,
            totalTasks: Object.keys(data.tasks).length,
            totalSkills: Object.keys(data.skills).length,
            onlineNodes: Object.values(data.nodes).filter(n => n.status === 'online').length,
            systemStatus: 'healthy',
            totalRevenue: Object.values(data.payments || {}).reduce((sum, p) => sum + (p.type === 'recharge' ? p.amount : 0), 0),
            totalSpent: Object.values(data.tasks || {}).reduce((sum, t) => sum + (t.price || 0), 0)
        }};
    }
    
    // 技能列表
    if (endpoint === '/api/skill/list') {
        // Try pg first, fall back to in-memory
        let skills;
        try {
            const pg = require('pg');
            const client = new pg.Client({ connectionString: 'postgresql://postgres:a1w2d3AWD!!!@db.cgdmbsnfhwrcdbmgcbwt.supabase.co:5432/postgres?sslmode=require' });
            await client.connect();
            const result = await client.query('SELECT * FROM skills WHERE enabled=1 ORDER BY sales_count DESC');
            skills = result.rows;
            await client.end();
        } catch(e) {
            skills = Object.values(data.skills).filter(s => s.enabled && s.status === 'approved');
        }
        if (params.category) skills = skills.filter(s => s.category === params.category);
        if (params.search) {
            const keyword = params.search.toLowerCase();
            skills = skills.filter(s => (s.name||'').toLowerCase().includes(keyword) || (s.description||'').toLowerCase().includes(keyword));
        }
        if (skills[0] && typeof skills[0].sales !== 'number') {
            // pg returns sales_count, rename to sales for compatibility
            skills = skills.map(s => ({ ...s, sales: s.sales_count || 0 }));
        }
        skills.sort((a, b) => (b.sales||0) - (a.sales||0));
        return { success: true, skills, total: skills.length };
    }
    
    if (endpoint === '/api/skill/categories') {
        let categories = [];
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                host: 'db.cgdmbsnfhwrcdbmgcbwt.supabase.co',
                port: 5432,
                user: 'postgres',
                password: 'a1w2d3AWD!!!',
                database: 'postgres',
                ssl: { rejectUnauthorized: false },
                max: 5,
                connectionTimeoutMillis: 5000,
            });
            const result = await pool.query('SELECT category, COUNT(*) as cnt FROM skills WHERE enabled=1 GROUP BY category ORDER BY cnt DESC');
            categories = result.rows;
            await pool.end();
        } catch(e) {
            categories = [{category: 'business', cnt: 0}];
        }
        const catMap = { business: { name: '商业', icon: '📊' }, data: { name: '数据分析', icon: '📊' }, writing: { name: '文案写作', icon: '✍️' }, code: { name: '代码开发', icon: '💻' }, design: { name: '设计创意', icon: '🎨' }, translate: { name: '翻译服务', icon: '🌐' }};
        return { success: true, categories: categories.map(c => ({ id: c.category, name: catMap[c.category]?.name || c.category, icon: catMap[c.category]?.icon || '🧬', count: parseInt(c.cnt) })) };
    }
    
    const skillMatch = endpoint.match(/^\/api\/skill\/([^/]+)$/);
    if (skillMatch) {
        const skill = data.skills[skillMatch[1]];
        if (!skill) return { error: '技能不存在' };
        const comments = Object.values(data.comments || {}).filter(c => c.skillId === skill.id).slice(0, 10);
        return { success: true, skill, comments };
    }
    
    const skillCallMatch = endpoint.match(/^\/api\/skill\/([^/]+)\/call$/);
    if (skillCallMatch && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        const skill = data.skills[skillCallMatch[1]];
        if (!skill) return { error: '技能不存在' };
        if (!skill.enabled) return { error: '技能已下架' };
        const user = Object.values(data.users).find(u => u.id === token.userId);
        if (!user || user.balance < skill.price) return { error: '余额不足' };
        user.balance -= skill.price;
        const callId = 'call_' + crypto.randomUUID().slice(0, 8);
        const call = { id: callId, skillId: skill.id, skillName: skill.name, userId: token.userId, input: body.input || '', result: `[${skill.name}] 已处理`, status: 'completed', price: skill.price, createdAt: new Date().toISOString() };
        data.skillsCall[callId] = call;
        skill.sales += 1;
        saveData(data);
        createNotification(user.id, '技能调用完成', `您的技能"${skill.name}"已完成`, 'skill');
        return { success: true, call, remainingBalance: user.balance };
    }
    
    // 创建技能
    if (endpoint === '/api/skill/create' && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        if (!body.name || !body.category || !body.price) return { error: '名称、分类、价格必填' };
        const skillId = 'skill_' + crypto.randomUUID().slice(0, 8);
        const skill = { id: skillId, userId: token.userId, name: body.name, category: body.category, price: parseFloat(body.price), description: body.description || '', tags: body.tags || [], sales: 0, rating: 5.0, provider: token.email, enabled: true, status: 'pending', createdAt: new Date().toISOString() };
        data.skills[skillId] = skill;
        saveData(data);
        return { success: true, skill, message: '技能提交成功，等待审核' };
    }
    
    // 技能评论
    if (endpoint === '/api/skill/comment' && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        const { skillId, rating, content } = body;
        if (!skillId || !rating || !content) return { error: '技能ID、评分、内容必填' };
        const skill = data.skills[skillId];
        if (!skill) return { error: '技能不存在' };
        const commentId = 'comment_' + crypto.randomUUID().slice(0, 8);
        const comment = { id: commentId, skillId, userId: token.userId, rating, content, createdAt: new Date().toISOString() };
        data.comments[commentId] = comment;
        
        const skillComments = Object.values(data.comments).filter(c => c.skillId === skillId);
        skill.rating = skillComments.reduce((sum, c) => sum + c.rating, 0) / skillComments.length;
        
        saveData(data);
        return { success: true, comment };
    }
    
    if (endpoint === '/api/agent/agents') {
        return { success: true, agents: [
            { id: 'openclaw', name: 'OpenClaw', description: '全能AI代理', enabled: true, capabilities: ['task', 'code', 'analysis', 'writing'] },
            { id: 'qclaw', name: 'QClaw', description: '腾讯系AI', enabled: false },
            { id: 'coze', name: 'Coze', description: '字节跳动AI', enabled: false },
            { id: 'manus', name: 'Manus', description: '全自主执行', enabled: false }
        ]};
    }
    
    if (endpoint === '/api/agent/chat' && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        if (!body.message) return { error: '消息不能为空' };
        return { success: true, response: `收到: "${body.message}" - AI处理中...`, agent: 'openclaw', messageId: 'msg_' + crypto.randomUUID().slice(0, 8) };
    }
    
    if (endpoint === '/api/node/list') {
        let nodes = Object.values(data.nodes);
        if (params.status) nodes = nodes.filter(n => n.status === params.status);
        return { success: true, nodes };
    }
    
    const nodeMatch = endpoint.match(/^\/api\/node\/([^/]+)$/);
    if (nodeMatch) {
        const node = data.nodes[nodeMatch[1]];
        if (!node) return { error: '节点不存在' };
        const nodeTasks = Object.values(data.tasks).filter(t => t.nodeId === node.id);
        return { success: true, node, stats: { totalTasks: nodeTasks.length, completed: nodeTasks.filter(t => t.status === 'completed').length }};
    }
    
    // 节点注册
    if (endpoint === '/api/node/register' && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        if (!body.name || !body.location) return { error: '节点名称和位置必填' };
        const nodeId = 'node_' + crypto.randomUUID().slice(0, 8);
        const node = { id: nodeId, name: body.name, location: body.location, locationCode: body.locationCode || '', status: 'online', cpu: 0, memory: 0, tasks: 0, latency: 0, owner: token.userId, registeredAt: new Date().toISOString() };
        data.nodes[nodeId] = node;
        saveData(data);
        return { success: true, node };
    }
    
    // 认证
    if (endpoint === '/api/auth/register' && method === 'POST') {
        const { email, password, username, inviteCode } = body;
        if (!email || !password) return { error: '邮箱和密码必填' };
        if (data.users[email]) return { error: '用户已存在' };
        let bonus = 0;
        if (inviteCode && data.invites && data.invites[inviteCode]) {
            bonus = 100;
        }
        const userId = crypto.randomUUID();
        const user = { id: userId, email, username: username || email.split('@')[0], password, balance: 1000 + bonus, frozenBalance: 0, vipLevel: 0, avatar: '', bio: '', inviteCode: 'INV' + userId.slice(0, 6).toUpperCase(), invitedBy: inviteCode || null, role: 'user', createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() };
        data.users[email] = user;
        if (!data.invites) data.invites = {};
        data.invites[user.inviteCode] = { email, invitedBy: inviteCode, createdAt: new Date().toISOString() };
        saveData(data);
        const token = createToken(user);
        createNotification(user.id, '欢迎加入Pclaw', '恭喜您注册成功，获得1000初始余额！', 'welcome');
        return { success: true, token, user: { id: user.id, email: user.email, username: user.username, balance: user.balance, vipLevel: user.vipLevel, inviteCode: user.inviteCode } };
    }
    
    if (endpoint === '/api/auth/login' && method === 'POST') {
        const { email, password } = body;
        if (!email || !password) return { error: '邮箱和密码必填' };
        const user = data.users[email];
        if (!user || user.password !== password) return { error: '邮箱或密码错误' };
        user.lastLoginAt = new Date().toISOString();
        saveData(data);
        const token = createToken(user);
        return { success: true, token, user: { id: user.id, email: user.email, username: user.username, balance: user.balance, vipLevel: user.vipLevel, role: user.role } };
    }
    
    if (endpoint === '/api/auth/logout' && method === 'POST') {
        if (!token) return { error: '未登录' };
        delete data.sessions[token.userId];
        saveData(data);
        return { success: true, message: '已登出' };
    }
    
    // 页面访问统计（公开接口）
    if ((method === 'POST' || method === 'GET') && endpoint === '/api/track') {
        const page = params.page || body.page || '/'
        const today = new Date().toISOString().slice(0,10);
        const key = page + ':' + today;
        data.pageviews[key] = data.pageviews[key] || { page, date: today, views: 0 };
        data.pageviews[key].views += 1;
        const totalKey = 'total:' + today;
        data.pageviews[totalKey] = data.pageviews[totalKey] || { date: today, views: 0 };
        data.pageviews[totalKey].views += 1;
        saveData(data);
        return { success: true, page, views: data.pageviews[key].views };
    }

    // 需要授权
    if (!token) return { error: '未授权', needAuth: true };
    
    const user = Object.values(data.users).find(u => u.id === token.userId);
    
    if (endpoint === '/api/user/profile') {
        if (!user) return { error: '用户不存在' };
        const userTasks = Object.values(data.tasks).filter(t => t.userId === user.id);
        return { success: true, user: { id: user.id, email: user.email, username: user.username, balance: user.balance, frozenBalance: user.frozenBalance || 0, vipLevel: user.vipLevel, avatar: user.avatar || '', bio: user.bio || '', inviteCode: user.inviteCode, role: user.role, createdAt: user.createdAt, stats: { tasksCreated: userTasks.length, totalSpent: userTasks.reduce((sum, t) => sum + (t.price || 0), 0) }}};
    }
    
    if (endpoint === '/api/user/profile' && method === 'PUT') {
        if (!user) return { error: '用户不存在' };
        if (body.username) user.username = body.username;
        if (body.avatar) user.avatar = body.avatar;
        if (body.bio) user.bio = body.bio;
        saveData(data);
        return { success: true, user: { id: user.id, username: user.username, avatar: user.avatar, bio: user.bio } };
    }
    
    if (endpoint === '/api/user/balance') {
        if (!user) return { error: '用户不存在' };
        return { success: true, balance: user.balance, frozenBalance: user.frozenBalance || 0, total: user.balance + (user.frozenBalance || 0) };
    }
    
    if (endpoint === '/api/payment/recharge' && method === 'POST') {
        const { amount, method: payMethod } = body;
        if (!amount || amount <= 0) return { error: '充值金额必须大于0' };
        user.balance = (user.balance || 0) + parseFloat(amount);
        const paymentId = 'pay_' + crypto.randomUUID().slice(0, 12);
        data.payments[paymentId] = { id: paymentId, userId: user.id, type: 'recharge', amount: parseFloat(amount), method: payMethod || 'alipay', status: 'completed', balanceBefore: user.balance - parseFloat(amount), balanceAfter: user.balance, createdAt: new Date().toISOString() };
        saveData(data);
        createNotification(user.id, '充值成功', `您已成功充值${amount}元，当前余额${user.balance}元`, 'payment');
        return { success: true, newBalance: user.balance, payment: data.payments[paymentId] };
    }
    
    if (endpoint === '/api/payment/history') {
        const userPayments = Object.values(data.payments).filter(p => p.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
        return { success: true, payments: userPayments, total: userPayments.length };
    }
    
    // 提现
    if (endpoint === '/api/payment/withdraw' && method === 'POST') {
        const { amount, method: payMethod, account } = body;
        if (!amount || amount <= 0) return { error: '提现金额必须大于0' };
        if (user.balance < amount) return { error: '余额不足' };
        if (!account) return { error: '提现账户必填' };
        
        user.balance -= amount;
        const withdrawId = 'wd_' + crypto.randomUUID().slice(0, 12);
        data.withdrawals[withdrawId] = { id: withdrawId, userId: user.id, amount: parseFloat(amount), method: payMethod || 'alipay', account, status: 'pending', createdAt: new Date().toISOString() };
        saveData(data);
        createNotification(user.id, '提现申请已提交', `您的提现${amount}元申请已提交，预计1-3个工作日到账`, 'payment');
        return { success: true, withdrawal: data.withdrawals[withdrawId], remainingBalance: user.balance };
    }
    
    // 任务
    if (endpoint === '/api/task/create' && method === 'POST') {
        const { title, description, price, priority, confirmType, nodeId } = body;
        if (!title) return { error: '任务标题必填' };
        const taskPrice = parseFloat(price) || 0;
        if (taskPrice > 0 && user.balance < taskPrice) return { error: '余额不足' };
        
        const taskId = 'task_' + crypto.randomUUID().slice(0, 8);
        const task = { id: taskId, userId: user.id, title, description: description || '', status: 'pending', priority: priority || 'normal', price: taskPrice, confirmType: confirmType || 'auto', nodeId: nodeId || null, result: null, rating: null, comment: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null };
        
        if (taskPrice > 0) { user.balance -= taskPrice; user.frozenBalance = (user.frozenBalance || 0) + taskPrice; }
        data.tasks[taskId] = task;
        saveData(data);
        
        if (nodeId && data.nodes[nodeId]) {
            task.status = 'processing';
            task.nodeId = nodeId;
            task.updatedAt = new Date().toISOString();
            saveData(data);
            createNotification(user.id, '任务已分配', `您的任务"${title}"已开始处理`, 'task');
        }
        
        return { success: true, task, balance: user.balance };
    }
    
    if (endpoint === '/api/task/list') {
        let userTasks = Object.values(data.tasks).filter(t => t.userId === user.id);
        if (params.status) userTasks = userTasks.filter(t => t.status === params.status);
        userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return { success: true, tasks: userTasks, total: userTasks.length };
    }
    
    if (endpoint === '/api/task/stats') {
        const userTasks = Object.values(data.tasks).filter(t => t.userId === user.id);
        return { success: true, stats: { total: userTasks.length, pending: userTasks.filter(t => t.status === 'pending').length, processing: userTasks.filter(t => t.status === 'processing').length, completed: userTasks.filter(t => t.status === 'completed').length, cancelled: userTasks.filter(t => t.status === 'cancelled').length, totalSpent: userTasks.reduce((sum, t) => sum + (t.price || 0), 0) }};
    }
    
    // 可认领的任务
    if (endpoint === '/api/task/available') {
        const availableTasks = Object.values(data.tasks).filter(t => t.status === 'pending' && !t.nodeId && t.userId !== user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return { success: true, tasks: availableTasks, total: availableTasks.length };
    }
    
    // 认领任务
    const taskClaimMatch = endpoint.match(/^\/api\/task\/([^/]+)\/claim$/);
    if (taskClaimMatch && method === 'POST') {
        const task = data.tasks[taskClaimMatch[1]];
        if (!task) return { error: '任务不存在' };
        if (task.status !== 'pending') return { error: '任务不可认领' };
        if (task.userId === user.id) return { error: '不能认领自己的任务' };
        
        task.status = 'processing';
        task.nodeId = user.id;
        task.updatedAt = new Date().toISOString();
        saveData(data);
        createNotification(task.userId, '任务被认领', `您的任务"${task.title}"已被处理`, 'task');
        return { success: true, task };
    }
    
    const taskMatch = endpoint.match(/^\/api\/task\/([^/]+)$/);
    if (taskMatch) {
        const task = data.tasks[taskMatch[1]];
        if (!task) return { error: '任务不存在' };
        if (task.userId !== user.id && user.role !== 'admin') return { error: '无权限' };
        return { success: true, task };
    }
    
    const taskCompleteMatch = endpoint.match(/^\/api\/task\/([^/]+)\/complete$/);
    if (taskCompleteMatch && method === 'POST') {
        const task = data.tasks[taskCompleteMatch[1]];
        if (!task) return { error: '任务不存在' };
        if (task.userId !== user.id && user.role !== 'admin') return { error: '无权限' };
        if (task.status !== 'processing') return { error: '任务不在处理中' };
        
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();
        task.result = body.result || '任务已完成';
        
        if (task.price > 0) {
            user.frozenBalance -= task.price;
            const node = data.users[task.nodeId];
            if (node) node.balance += task.price * 0.93;
        }
        saveData(data);
        createNotification(task.userId, '任务已完成', `您的任务"${task.title}"已完成，请验收`, 'task');
        return { success: true, task };
    }
    
    const taskCancelMatch = endpoint.match(/^\/api\/task\/([^/]+)\/cancel$/);
    if (taskCancelMatch && method === 'POST') {
        const task = data.tasks[taskCancelMatch[1]];
        if (!task) return { error: '任务不存在' };
        if (task.userId !== user.id && user.role !== 'admin') return { error: '无权限' };
        if (task.status !== 'pending') return { error: '只能取消待处理任务' };
        task.status = 'cancelled';
        task.updatedAt = new Date().toISOString();
        if (task.price > 0) { user.frozenBalance -= task.price; user.balance += task.price; }
        saveData(data);
        return { success: true, task, balance: user.balance };
    }
    
    const taskRateMatch = endpoint.match(/^\/api\/task\/([^/]+)\/rate$/);
    if (taskRateMatch && method === 'POST') {
        const task = data.tasks[taskRateMatch[1]];
        if (!task) return { error: '任务不存在' };
        if (task.userId !== user.id) return { error: '无权限' };
        if (task.status !== 'completed') return { error: '只能评价已完成的任务' };
        task.rating = body.rating || 5;
        task.comment = body.comment || '';
        saveData(data);
        return { success: true, task };
    }
    
    // 申诉
    const taskAppealMatch = endpoint.match(/^\/api\/task\/([^/]+)\/appeal$/);
    if (taskAppealMatch && method === 'POST') {
        const task = data.tasks[taskAppealMatch[1]];
        if (!task) return { error: '任务不存在' };
        if (task.userId !== user.id) return { error: '无权限' };
        if (task.status !== 'completed') return { error: '只能申诉已完成的任务' };
        
        const appealId = 'appeal_' + crypto.randomUUID().slice(0, 8);
        data.appeals[appealId] = { id: appealId, taskId: task.id, userId: user.id, reason: body.reason || '', status: 'pending', createdAt: new Date().toISOString() };
        saveData(data);
        return { success: true, appeal: data.appeals[appealId], message: '申诉已提交，等待处理' };
    }
    
    // 通知
    if (endpoint === '/api/notification/list') {
        const userNotifications = Object.values(data.notifications || {}).filter(n => n.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
        return { success: true, notifications: userNotifications, total: userNotifications.length };
    }
    
    if (endpoint === '/api/notification/read' && method === 'POST') {
        const notifications = Object.values(data.notifications || {}).filter(n => n.userId === user.id && !n.read);
        notifications.forEach(n => n.read = true);
        saveData(data);
        return { success: true, readCount: notifications.length };
    }
    
    // 消息
    if (endpoint === '/api/message/list') {
        const userMessages = Object.values(data.messages || {}).filter(m => m.from === user.id || m.to === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
        return { success: true, messages: userMessages, total: userMessages.length };
    }
    
    if (endpoint === '/api/message/send' && method === 'POST') {
        const { to, content } = body;
        if (!to || !content) return { error: '收件人和内容必填' };
        const msgId = 'msg_' + crypto.randomUUID().slice(0, 8);
        const message = { id: msgId, from: user.id, to, content, read: false, createdAt: new Date().toISOString() };
        data.messages[msgId] = message;
        saveData(data);
        createNotification(to, '新消息', `您有来自${user.username}的新消息`, 'message');
        return { success: true, message };
    }
    
    // 邀请
    if (endpoint === '/api/invite/stats') {
        const invitees = Object.values(data.users || {}).filter(u => u.invitedBy === user.inviteCode);
        return { success: true, stats: { totalInvites: invitees.length, activeInvitees: invitees.length, totalEarnings: invitees.length * 50, inviteCode: user.inviteCode }};
    }
    
    // 排行榜
    if (endpoint === '/api/rank/users') {
        const topUsers = Object.values(data.users).sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 10).map(u => ({ id: u.id, username: u.username, balance: u.balance }));
        return { success: true, ranking: topUsers };
    }
    
    if (endpoint === '/api/rank/skills') {
        const topSkills = Object.values(data.skills).sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 10).map(s => ({ id: s.id, name: s.name, sales: s.sales, rating: s.rating }));
        return { success: true, ranking: topSkills };
    }
    
    // 管理员接口
    if (user.role === 'admin') {
        if (endpoint === '/api/admin/users') {
            return { success: true, users: Object.values(data.users).map(u => ({ id: u.id, email: u.email, username: u.username, balance: u.balance, role: u.role, createdAt: u.createdAt })), total: Object.keys(data.users).length };
        }
        
        if (endpoint === '/api/admin/skills/pending') {
            const pendingSkills = Object.values(data.skills).filter(s => s.status === 'pending');
            return { success: true, skills: pendingSkills, total: pendingSkills.length };
        }
        
        const skillApproveMatch = endpoint.match(/^\/api\/admin\/skill\/([^/]+)\/approve$/);
        if (skillApproveMatch && method === 'POST') {
            const skill = data.skills[skillApproveMatch[1]];
            if (!skill) return { error: '技能不存在' };
            skill.status = 'approved';
            skill.enabled = true;
            saveData(data);
            createNotification(skill.userId, '技能审核通过', `您的技能"${skill.name}"已通过审核`, 'skill');
            return { success: true, skill };
        }
        
        const skillRejectMatch = endpoint.match(/^\/api\/admin\/skill\/([^/]+)\/reject$/);
        if (skillRejectMatch && method === 'POST') {
            const skill = data.skills[skillRejectMatch[1]];
            if (!skill) return { error: '技能不存在' };
            skill.status = 'rejected';
            skill.enabled = false;
            saveData(data);
            createNotification(skill.userId, '技能审核拒绝', `您的技能"${skill.name}"未通过审核`, 'skill');
            return { success: true, skill };
        }
        
        if (endpoint === '/api/admin/appeals') {
            const appeals = Object.values(data.appeals).filter(a => a.status === 'pending');
            return { success: true, appeals, total: appeals.length };
        }
        
        const appealResolveMatch = endpoint.match(/^\/api\/admin\/appeal\/([^/]+)\/resolve$/);
        if (appealResolveMatch && method === 'POST') {
            const appeal = data.appeals[appealResolveMatch[1]];
            if (!appeal) return { error: '申诉不存在' };
            appeal.status = body.resolution || 'resolved';
            appeal.resolvedAt = new Date().toISOString();
            saveData(data);
            return { success: true, appeal };
        }
        
        if (endpoint === '/api/admin/stats') {
            return { success: true, stats: {
                users: Object.keys(data.users).length,
                tasks: Object.keys(data.tasks).length,
                skills: Object.keys(data.skills).length,
                nodes: Object.keys(data.nodes).length,
                revenue: Object.values(data.payments || {}).reduce((sum, p) => sum + (p.type === 'recharge' ? p.amount : 0), 0),
                spending: Object.values(data.tasks || {}).reduce((sum, t) => sum + (t.price || 0), 0),
                pendingAppeals: Object.values(data.appeals || {}).filter(a => a.status === 'pending').length,
                pendingSkills: Object.values(data.skills || {}).filter(s => s.status === 'pending').length
            }};
        }
    }

// [P] v6.1 storage helpers (inside handleRequest)
    const DEMAND_FILE='/tmp/pclaw-demands.json';const EARNING_FILE='/tmp/pclaw-earnings.json';const EXPO_FILE='/tmp/pclaw-expos.json';
    function loadJson(f,def){try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){return def||[];}}
    function saveJson(f,d){fs.writeFileSync(f,JSON.stringify(d));}
    function initExpos(){var ex=loadJson(EXPO_FILE,[]);if(ex.length===0){ex=[{id:'expo_1',name:'标准展会',type:'normal',price:99,status:'active'},{id:'expo_2',name:'黄金展会',type:'gold',price:699,status:'active'},{id:'expo_3',name:'冠名展会',type:'crown',price:1999,status:'active'}];saveJson(EXPO_FILE,ex);}return ex;}


// [P] v6.1 demands/earnings/expo routes
    if (endpoint === '/api/demand/list') {
        var dm=loadJson(DEMAND_FILE,[]);
        var open=dm.filter(function(d){return d.status==='open';}).sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);}).slice(0,50);
        return {success:true,demands:open};
    }
    if (endpoint === '/api/demand/create' && method === 'POST') {
        if (!token) return {error:'未授权',needAuth:true};
        if (!body.title) return {error:'标题必填'};
        var dem=loadJson(DEMAND_FILE,[]);
        var nid='dem_'+crypto.randomUUID().slice(0,8);
        dem.push({id:nid,title:body.title,type:body.type||'skill',category:body.category||'',budget_min:body.budget_min||0,budget_max:body.budget_max||0,deadline:body.deadline||'',description:body.description||'',tags:body.tags||[],user_id:token.userId||'',status:'open',created_at:new Date().toISOString()});
        saveJson(DEMAND_FILE,dem);
        return {success:true,id:nid};
    }
    if (endpoint === '/api/earnings/list') {
        var uid=params.user_id||(token?token.userId:null);
        if (!uid) return {error:'未授权',needAuth:true};
        var ea=loadJson(EARNING_FILE,[]).filter(function(e){return e.user_id===uid;}).sort(function(a,b){return new Date(b.created_at||0)-new Date(a.created_at||0);}).slice(0,100);
        return {success:true,earnings:ea};
    }
    if (endpoint === '/api/expo/list') {
        return {success:true,expos:initExpos()};
    }
    if (endpoint === '/api/match' && method === 'POST') {
        if (!token) return {error:'未授权',needAuth:true};
        var j=body;
        if (!j.demand_id||!j.resource_id) return {error:'参数不全'};
        var earnId='earn_'+crypto.randomUUID().slice(0,8);
        var ea=loadJson(EARNING_FILE,[]);
        ea.push({id:earnId,demand_id:j.demand_id,skill_id:j.resource_id,title:'资源匹配',type:'resource',amount:(j.amount||0)*0.4,role:'resource',status:'pending',user_id:token.userId||'',created_at:new Date().toISOString()});
        saveJson(EARNING_FILE,ea);
        var dm=loadJson(DEMAND_FILE,[]);
        dm.forEach(function(d){if(d.id===j.demand_id)d.status='matched';});
        saveJson(DEMAND_FILE,dm);
        return {success:true,earning_id:earnId};
    }
// [P] v6.1 END

    // ===== Payment Routes (inline, no require) =====
    // /api/payment/packages
    if (endpoint === '/api/payment/packages' && method === 'GET') {
        const packages = [
            { id: 'basic', name: '基础包', credits: 100, price: 10, bonus: 0 },
            { id: 'standard', name: '标准包', credits: 550, price: 50, bonus: 10 },
            { id: 'pro', name: '专业包', credits: 1200, price: 100, bonus: 20 },
            { id: 'enterprise', name: '企业包', credits: 7000, price: 500, bonus: 40 }
        ];
        return { success: true, packages };
    }
    // /api/payment/config
    if (endpoint === '/api/payment/config' && method === 'GET') {
        return { success: true, providers: { wechat: false, alipay: false, stripe: false, mock: true }, currency: 'CNY' };
    }
    // /api/payment/create
    if (endpoint === '/api/payment/create' && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        const { packageId, provider } = parsed || {};
        const pkgs = { basic: { credits: 100, price: 10 }, standard: { credits: 550, price: 50 }, pro: { credits: 1200, price: 100 }, enterprise: { credits: 7000, price: 500 } };
        const pkg = pkgs[packageId];
        if (!pkg) return { error: '未知套餐' };
        const orderId = 'PAY_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,6).toUpperCase();
        return { success: true, data: { orderId, provider: provider || 'mock', credits: pkg.credits, amount: pkg.price, mock: true } };
    }
    // /api/payment/mock/success
    if (endpoint === '/api/payment/mock/success' && method === 'POST') {
        return { success: true, message: 'Mock支付成功，Credits已发放', mock: true };
    }
    // /api/payment/mock/charge
    if (endpoint === '/api/payment/mock/charge' && method === 'POST') {
        if (!token) return { error: '未授权', needAuth: true };
        const { packageId } = parsed || {};
        const credits = { basic: 100, standard: 550, pro: 1200, enterprise: 7000 };
        const amounts = { basic: 10, standard: 50, pro: 100, enterprise: 500 };
        return { success: true, data: { orderId: 'PAY_MOCK_' + Date.now(), packageId, credits: credits[packageId]||0, amount: amounts[packageId]||0, status: 'paid', mock: true } };
    }
    const pr = null; // placeholder
    return { error: 'Not Found', path: endpoint };
}

// HTTP服务器
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
    res.setHeader('Content-Type', 'application/json');
    
    try {
        for await (const chunk of req) { body += chunk; }
        let jsonBody = {};
        try { jsonBody = body ? JSON.parse(body) : {}; } catch {}
        
        const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
        Object.keys(parsedUrl.searchParams).forEach(k => { if (!jsonBody[k]) jsonBody[k] = parsedUrl.searchParams.get(k); });
        
        const authHeader = req.headers.authorization;
        const token = authHeader ? verifyToken(authHeader.replace('Bearer ', '').trim()) : null;

        // ===== Public Payment Routes (no auth required) =====
        const endpoint = new URL(req.url, `http://localhost:${PORT}`).pathname;
        if (endpoint === '/api/payment/packages' && req.method === 'GET') {
            res.writeHead(200); res.end(JSON.stringify({ success: true, packages: [
                { id: 'basic', name: '基础包', credits: 100, price: 10, bonus: 0 },
                { id: 'standard', name: '标准包', credits: 550, price: 50, bonus: 10 },
                { id: 'pro', name: '专业包', credits: 1200, price: 100, bonus: 20 },
                { id: 'enterprise', name: '企业包', credits: 7000, price: 500, bonus: 40 }
            ]})); return;
        }
        if (endpoint === '/api/payment/config' && req.method === 'GET') {
            res.writeHead(200); res.end(JSON.stringify({ success: true, providers: { wechat: false, alipay: false, stripe: false, mock: true }, currency: 'CNY' })); return;
        }
        if (endpoint === '/api/payment/mock/charge' && req.method === 'POST') {
            const { userId, packageId } = jsonBody || {};
            const credits = { basic: 100, standard: 550, pro: 1200, enterprise: 7000 };
            const amounts = { basic: 10, standard: 50, pro: 100, enterprise: 500 };
            res.writeHead(200); res.end(JSON.stringify({ success: true, data: { orderId: 'PAY_MOCK_' + Date.now(), userId, packageId, credits: credits[packageId]||0, amount: amounts[packageId]||0, status: 'paid', mock: true } })); return;
        }
        if (endpoint === '/api/payment/mock/success' && req.method === 'POST') {
            res.writeHead(200); res.end(JSON.stringify({ success: true, message: 'Mock支付成功' })); return;
        }

        const result = await handleRequest(req.method, req.url, jsonBody, token);
        res.writeHead(200);
        res.end(JSON.stringify(result));
    } catch (error) {
        console.error('Error:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pclaw API Server v6.0 running on port ${PORT}`);
});
