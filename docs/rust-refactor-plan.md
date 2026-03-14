# Pclaw Rust 可重构模块评估

## 一、模块分级

### 🔴 高优先级 (核心安全相关)

| 模块 | 文件 | 重构难度 | 理由 |
|------|------|----------|------|
| **Security** | security.js | ⭐⭐⭐ | 加密/签名是核心竞争力 |
| **Blockchain** | blockchain.js | ⭐⭐⭐ | 链上交互性能关键 |

### 🟡 中优先级 (高频计算)

| 模块 | 文件 | 重构难度 | 理由 |
|------|------|----------|------|
| **Token** | token.js | ⭐⭐ | 代币运算频繁 |
| **Ledger** | ledger.js | ⭐⭐ | 存证哈希计算 |
| **Staking** | staking.js | ⭐⭐⭐ | 质押逻辑复杂 |

### 🟢 低优先级 (业务逻辑)

| 模块 | 文件 | 重构难度 | 理由 |
|------|------|----------|------|
| **Reputation** | reputation.js | ⭐⭐ | 逻辑简单 |
| **Settlement** | settlement.js | ⭐⭐ | 逻辑简单 |
| **TaskGraph** | taskgraph.js | ⭐⭐⭐ | 图算法复杂 |
| **DAO** | dao.js | ⭐⭐ | 逻辑简单 |
| **Gateway** | gateway.js | ⭐⭐⭐ | 网络层 |

---

## 二、重构优先级排序

```
第1阶段: Security + Blockchain (核心)
        ↓
第2阶段: Token + Ledger (基础设施)
        ↓
第3阶段: Staking (可选)
        ↓
第4阶段: 其他 (不建议)
```

---

## 三、各模块重构工作量

| 模块 | Rust 代码量 | 预计工时 | 性能提升 |
|------|-------------|----------|----------|
| Security | ~800行 | 5天 | 10x |
| Blockchain | ~600行 | 4天 | 50x |
| Token | ~300行 | 2天 | 5x |
| Ledger | ~350行 | 2天 | 20x |
| Staking | ~500行 | 3天 | 5x |

**总计: ~16天**

---

## 四、推荐策略

### 方案: 渐进式 Rust 化

```
v1 (当前): 全部 Node.js
    ↓
v1.5: Security → Rust (via WASM)
    ↓
v2.0: Blockchain → Rust (via WASM)
    ↓
v2.5: Token/Ledger → Rust (可选)
```

### WASM 集成架构

```javascript
// Node.js 调用 Rust WASM
const rustCore = require('./rust_core/pkg');

// 加密运算 (Rust)
const signature = rustCore.sign(message, privateKey);

// 链上交互 (Rust)
const txHash = await rustCore.sendTransaction(tx);
```

---

## 五、结论

**可以重构的模块 (按优先级):**

1. **Security** - 加密/签名核心，必须 Rust
2. **Blockchain** - 链交互性能关键，建议 Rust
3. **Token** - 代币运算频繁，可选 Rust
4. **Ledger** - 哈希计算频繁，可选 Rust
5. **Staking** - 逻辑复杂，可选 Rust

**不建议重构:**
- Reputation (简单)
- Settlement (简单)
- DAO (简单)
- TaskGraph (改造成本高)
- Gateway (网络层，Node.js 更合适)

---

*评估：中书省*
*日期：2026-03-13*
