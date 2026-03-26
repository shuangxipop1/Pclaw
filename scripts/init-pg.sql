-- ============================================================
-- Pclaw Database Initialization
-- Run automatically on first PG startup via docker-entrypoint
-- ============================================================

-- Users table
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

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Balances table
CREATE TABLE IF NOT EXISTS balances (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 1000,
    frozen_balance DECIMAL(15,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    credits INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    code VARCHAR(20) PRIMARY KEY,
    used BOOLEAN DEFAULT FALSE,
    used_by VARCHAR(255),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================
-- Seed initial data (skills, etc.)
-- ============================================================

-- Skills seed data (if not exists)
INSERT INTO users (id, email, username, password_hash, vip_level, balance, invite_code, role)
SELECT 
    '00000000-0000-0000-0000-000000000001'::UUID,
    'admin@pclaw.com',
    'admin',
    '$2b$10$ placeholder (set via first login)',
    99,
    1000000,
    'ADMIN001',
    'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@pclaw.com');
