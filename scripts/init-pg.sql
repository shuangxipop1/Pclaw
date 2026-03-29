-- ============================================================
-- Pclaw Full Database Schema
-- All tables created automatically on first PG init
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    vip_level INTEGER DEFAULT 0,
    avatar TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    invite_code VARCHAR(20) UNIQUE,
    invited_by VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    balance DECIMAL(15,2) DEFAULT 1000,
    frozen_balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Balances
CREATE TABLE IF NOT EXISTS balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 1000,
    frozen_balance DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    credits INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites
CREATE TABLE IF NOT EXISTS invites (
    code VARCHAR(20) PRIMARY KEY,
    used BOOLEAN DEFAULT FALSE,
    used_by VARCHAR(255),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    price DECIMAL(15,2) DEFAULT 0,
    icon VARCHAR(50),
    prompt TEXT,
    model VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks/Demands
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title VARCHAR(500),
    description TEXT,
    type VARCHAR(50) DEFAULT 'demand',
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    budget_min DECIMAL(15,2) DEFAULT 0,
    budget_max DECIMAL(15,2) DEFAULT 0,
    matched_skill_id UUID,
    matched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    content TEXT,
    role VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    content TEXT,
    rating INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Earnings
CREATE TABLE IF NOT EXISTS earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    skill_id UUID,
    amount DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    amount DECIMAL(15,2) NOT NULL,
    address VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending',
    tx_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appeals
CREATE TABLE IF NOT EXISTS appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID,
    user_id UUID,
    reason TEXT,
    resolution TEXT,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Skills call log
CREATE TABLE IF NOT EXISTS skills_call_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id UUID,
    user_id UUID,
    input TEXT,
    output TEXT,
    model VARCHAR(100),
    cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nodes
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'online',
    cpu DECIMAL(5,2) DEFAULT 0,
    memory DECIMAL(5,2) DEFAULT 0,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pageviews
CREATE TABLE IF NOT EXISTS pageviews (
    id SERIAL PRIMARY KEY,
    path VARCHAR(500),
    ip VARCHAR(50),
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_earnings_user_id ON earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_task_id ON appeals(task_id);


-- Seed 10 engineering skills
INSERT INTO skills (id, name, category, description, price, enabled, status, sales_count, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '管道BOM智能提取', 'skill', '上传管道等轴测图，AI自动提取BOM清单，输出Excel格式', 200.00, true, 'approved', 0, NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '施工图合规性审查', 'skill', '上传施工图，AI自动核查消防/抗震/节能规范符合性', 300.00, true, 'approved', 0, NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '工程量清单自动统计', 'skill', '上传图纸或表格，AI自动统计工程量', 150.00, true, 'approved', 0, NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '造价文件智能比对', 'skill', '上传两份造价文件，AI自动比对差异项', 250.00, true, 'approved', 0, NOW(), NOW()),
('55555555-5555-5555-5555-555555555555', 'CAD图纸批量转PDF', 'digital', '批量上传DWG格式CAD图纸，自动转为PDF', 50.00, true, 'approved', 0, NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', '专业工程英文翻译', 'service', '工程类文档专业翻译（合同/规范/说明书）', 80.00, true, 'approved', 0, NOW(), NOW()),
('77777777-7777-7777-7777-777777777777', '法律合同风险评估', 'service', '建设工程合同AI风险评估，识别条款漏洞', 500.00, true, 'approved', 0, NOW(), NOW()),
('88888888-8888-8888-8888-888888888888', '工程结算书编制', 'service', 'AI辅助编制工程结算书', 800.00, true, 'approved', 0, NOW(), NOW()),
('99999999-9999-9999-9999-999999999999', '设备采购技术参数生成', 'digital', '输入设备名称和工况，AI生成技术规格书', 120.00, true, 'approved', 0, NOW(), NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '施工组织设计摘要', 'service', '上传施工组织设计文档，AI提取关键路径/工期/资源配置', 350.00, true, 'approved', 0, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- Seller applications
CREATE TABLE IF NOT EXISTS seller_applications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    real_name VARCHAR NOT NULL,
    id_card VARCHAR,
    bank_card VARCHAR,
    bank_name VARCHAR,
    alipay VARCHAR,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method VARCHAR DEFAULT 'bank',
    status VARCHAR DEFAULT 'pending',
    transaction_id VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills: ensure file_url column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='file_url') THEN
        ALTER TABLE skills ADD COLUMN file_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='seller_id') THEN
        ALTER TABLE skills ADD COLUMN seller_id VARCHAR;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='avg_rating') THEN
        ALTER TABLE skills ADD COLUMN avg_rating DECIMAL(3,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='skills' AND column_name='review_count') THEN
        ALTER TABLE skills ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END$$;
