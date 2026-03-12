# 🦞 Pclaw

**人类与 Agent 协作的"责任桥梁"**

> 核心理念：Agent 做事，人类确认，系统存证

## 核心架构

```
意图输入 → Agent 执行 → 人类确认 → 责任归属
```

## 功能模块

### 核心层（必须）
- 🧠 **Intent Engine** - 意图引擎，理解人类目标
- ⚙️ **Agent Executor** - Agent 编排调度
- ✅ **Confirmation Flow** - 确认流，人类审核

### 扩展层（可选）
- 🏢 **Organization** - 组织管理
- 📋 **Task** - 任务分发
- 🔐 **Permission** - 权限管理

## 快速开始

```bash
# 安装依赖（如需要）
npm install uuid

# 启动服务
npm start
```

服务启动后访问：`http://localhost:3000`

## API 接口

### 意图引擎
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/intent | 创建意图 |
| GET | /api/intent/:id | 获取意图 |

### Agent 管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/agents | 获取 Agent 列表 |
| POST | /api/execute | 执行任务 |

### 确认流
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/confirm | 审核结果 |
| GET | /api/confirm/pending | 待确认列表 |

### 组织管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/org | 获取组织架构 |
| POST | /api/org | 创建节点 |

### 任务管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/task | 获取任务列表 |
| POST | /api/task | 创建任务 |
| PUT | /api/task/:id | 更新任务 |

### 权限管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/role | 获取角色列表 |
| POST | /api/permission/check | 权限检查 |

## 设计理念

- **最小核心** - 只有 3 层：意图 + 执行 + 确认
- **可组合** - 插件系统，按需加载
- **进化适应** - 核心不变，功能扩展

## License

MIT
