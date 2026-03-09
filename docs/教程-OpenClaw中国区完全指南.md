# OpenClaw 中国区完全指南

> 综合参考 [hello-claw](https://github.com/datawhalechina/hello-claw)、[openclaw-docs](https://github.com/yeuxuan/openclaw-docs)、[awesome-openclaw-skills-zh](https://github.com/clawdbot-ai/awesome-openclaw-skills-zh) 等优秀社区教程

---

## 目录

1. [什么是 OpenClaw？](#1-什么是-openclaw)
2. [安装（使用 U-Claw 一键安装）](#2-安装使用-u-claw-一键安装)
3. [首次配置](#3-首次配置)
4. [选择 AI 模型](#4-选择-ai-模型)
5. [接入聊天平台](#5-接入聊天平台)
6. [日常使用场景](#6-日常使用场景)
7. [技能系统](#7-技能系统)
8. [定时任务与自动化](#8-定时任务与自动化)
9. [多模型配置与成本优化](#9-多模型配置与成本优化)
10. [常见问题与故障排除](#10-常见问题与故障排除)
11. [进阶：VPS 部署](#11-进阶vps-部署)
12. [社区资源](#12-社区资源)

---

## 1. 什么是 OpenClaw？

OpenClaw 是一个**开源 AI 助手框架**，你可以把它理解为：

- 一个能接入 QQ、飞书、Telegram、Discord 等 20+ 聊天平台的 AI 机器人
- 一个能调用 DeepSeek、Kimi、Claude、GPT 等 50+ AI 模型的智能网关
- 一个支持 52+ 技能（发邮件、管理日程、操作笔记、控制智能家居）的全能助手
- 一个可以设定定时任务、自动执行工作流的 AI Agent

**一句话总结：你的私人 AI 助手，跑在你自己的设备上，连接你所有的聊天工具。**

### 核心架构

```
你的聊天平台 ←→ OpenClaw Gateway ←→ AI 模型
  (QQ/飞书/TG)      (你的电脑)        (DeepSeek/Kimi/Claude)
                         ↕
                    技能 & 工具
              (邮件/笔记/日程/搜索...)
```

---

## 2. 安装（使用 U-Claw 一键安装）

### 方式一：U-Claw U 盘安装（推荐，免翻墙）

```
1. 插入 U-Claw U 盘
2. Mac: 双击「启动菜单.command」
   Win: 双击「启动菜单.bat」
3. 选择 [1] 一键安装到电脑
4. 等待完成（约 2-3 分钟）
```

安装后在终端输入 `openclaw` 或 `uclaw` 即可启动。

### 方式二：手动安装（需要翻墙）

```bash
# 安装 Node.js 22+
# 方法1: 官网下载 https://nodejs.org
# 方法2: 使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22

# 安装 OpenClaw（使用淘宝镜像）
npm install -g openclaw@latest --registry=https://registry.npmmirror.com

# 启动引导
openclaw onboard --install-daemon
```

---

## 3. 首次配置

安装完成后，运行 `openclaw`，会进入引导向导：

### 3.1 选择 AI 模型提供商

```
? Select your AI provider:
  > DeepSeek        ← 国内推荐
    Moonshot (Kimi)
    Qwen
    Anthropic (Claude)
    OpenAI (GPT)
    ...
```

### 3.2 输入 API Key

每个模型都需要一个 API Key，去对应平台注册获取（下一章详细说明）。

### 3.3 选择聊天平台

```
? Which channels do you want to connect?
  > Telegram
    Discord
    Feishu (飞书)
    ...
```

### 3.4 安装守护进程

```
? Install as background service? (Y/n)
```

选 Y，OpenClaw 会在后台持续运行。

---

## 4. 选择 AI 模型

### 国产模型推荐（国内直接可用，无需翻墙）

#### 🏆 DeepSeek（推荐首选）

- **价格**：极便宜（约 1 元 / 百万 tokens）
- **特长**：编程、逻辑推理
- **注册**：https://platform.deepseek.com/
- **配置**：
  ```
  # .env 文件
  OPENAI_API_KEY=sk-xxxxxxxx
  OPENAI_BASE_URL=https://api.deepseek.com/v1
  ```

#### 📚 Kimi / 月之暗面

- **价格**：中等
- **特长**：256K 超长上下文，适合长文档分析
- **注册**：https://platform.moonshot.cn/
- **配置**：
  ```
  OPENAI_API_KEY=sk-xxxxxxxx
  OPENAI_BASE_URL=https://api.moonshot.cn/v1
  ```

#### 🆓 通义千问 Qwen（免费额度最大）

- **价格**：有大量免费额度
- **特长**：中文理解好，多模态
- **注册**：https://dashscope.console.aliyun.com/
- **配置**：启动菜单 [5] 选择 Qwen

#### 🎓 智谱 GLM

- **特长**：学术场景，中文 NLP
- **注册**：https://open.bigmodel.cn/

#### 🎙️ MiniMax

- **特长**：语音合成，多模态
- **注册**：https://platform.minimaxi.com/

#### 🔥 豆包 Doubao（字节跳动）

- **特长**：火山引擎生态整合
- **注册**：https://console.volcengine.com/ark

### 国际模型（需要翻墙或用 OpenRouter）

| 模型 | 特长 | 注册 |
|------|------|------|
| Claude 4 | 最强综合，编程最好 | anthropic.com |
| GPT-4.1 | 广泛兼容 | platform.openai.com |
| Gemini 3 | 免费额度 | ai.google.dev |

### 💡 省钱技巧

1. **日常用 DeepSeek**，复杂任务切 Claude
2. **用 OpenRouter 统一管理多个模型**：https://openrouter.ai
3. 在 OpenClaw 中可以为不同聊天平台配置不同模型

---

## 5. 接入聊天平台

### 5.1 QQ（腾讯官方接入，推荐！）

腾讯官方已为 OpenClaw 开放 QQ 机器人能力。**全程 1 分钟，完全免费，无需翻墙。**

这可能是国内 AI 助手最强入口——Telegram 要翻墙，Discord 要翻墙，**QQ 不用。**

```
步骤（仅需 3 条命令）：

1. 扫码注册 QQ 机器人：
   http://q.qq.com/qqbot/openclaw/login.html

2. 点击「创建机器人」，获取 AppID 和 AppSecret

3. 终端执行：
   openclaw plugins install @sliverp/qqbot@latest
   openclaw channels add --channel qqbot --token "你的AppID:你的AppSecret"
   openclaw gateway restart
```

⚠️ **安全提醒**：默认 `allowFrom` 是 `*`，任何人都能访问你的机器人。接入后务必改成自己的 QQ 号或限定白名单：

```bash
openclaw config set channels.qqbot.allowFrom "你的QQ号"
```

效果：在 QQ 中 @机器人 或私聊，AI 就会回复。

### 5.1b QQ（备选方案：NapCatQQ）

如果官方接入有问题，可以用 NapCatQQ (OneBot v11 协议) 作为备选：

```
1. 下载 NapCatQQ: https://github.com/NapNeko/NapCatQQ/releases
2. 安装并启动，用 QQ 扫码登录
3. 在 NapCat 中启用 HTTP 服务，端口 3000
4. 在 OpenClaw .env 中添加：
   ONEBOT_HTTP_URL=http://localhost:3000
```

### 5.2 飞书 Feishu

飞书是 OpenClaw 内置支持最全的中国平台：

```
步骤：
1. 访问 https://open.feishu.cn/app
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 在「事件订阅」中配置 Webhook URL
5. 在「权限管理」中开启消息相关权限
6. 运行: openclaw onboard → 选择 Feishu
```

支持：文字/图片/文件/群组/@提及/飞书文档/多维表格

### 5.3 微信

```
# 安装社区插件
openclaw plugins install @icesword760/openclaw-wechat

# 支持：文字/图片/文件/关键词触发
# 基于 iPad 协议
```

### 5.4 Telegram

```
步骤：
1. 在 Telegram 找 @BotFather
2. 发送 /newbot，按提示创建机器人
3. 获取 Bot Token
4. 运行: openclaw onboard → 选择 Telegram
5. 输入 Token
```

### 5.5 Discord

```
步骤：
1. 访问 https://discord.com/developers/applications
2. 创建 Application → Bot
3. 获取 Bot Token
4. 在 OAuth2 中生成邀请链接，邀请到服务器
5. 运行: openclaw onboard → 选择 Discord
```

---

## 6. 日常使用场景

### 编程助手

```
你: 帮我写一个 Python 爬虫，抓取豆瓣电影 Top250
AI: [生成完整代码 + 使用说明]

你: 这段代码有 bug，帮我看看 [粘贴代码]
AI: [分析 bug + 修复方案]
```

### 内容创作

```
你: 帮我写一篇关于 AI 发展趋势的文章，1000 字
AI: [生成文章]

你: 帮我总结这个链接的内容: https://...
AI: [总结要点]
```

### 日常办公

```
你: 帮我发邮件给 zhang@example.com，主题是项目进度，内容是...
AI: [通过 himalaya 技能发送邮件]

你: 提醒我明天下午 3 点开会
AI: [通过 apple-reminders 技能设置提醒]

你: 帮我在 Notion 创建一个新页面，标题是...
AI: [通过 notion 技能创建页面]
```

### 信息查询

```
你: 今天深圳天气怎么样？
AI: [通过 weather 技能查询]

你: 搜索 GitHub 上最新的 AI 开源项目
AI: [通过 github 技能搜索]
```

---

## 7. 技能系统

### 已预装的 52 个技能

U-Claw 已预装所有官方技能，无需联网下载。在启动菜单选 [13] 可以浏览完整列表。

### 常用技能速查

| 技能 | 用途 | 使用示例 |
|------|------|----------|
| github | GitHub 操作 | "帮我看 #123 这个 Issue" |
| summarize | 内容总结 | "总结这个网页" |
| weather | 天气 | "今天北京天气" |
| himalaya | 邮件 | "帮我发邮件" |
| apple-notes | 备忘录 | "帮我记一下..." |
| obsidian | Obsidian 笔记 | "在 Obsidian 创建笔记" |
| notion | Notion | "在 Notion 创建页面" |
| coding-agent | 编程委派 | "帮我重构这个函数" |
| nano-pdf | PDF 编辑 | "修改这个 PDF" |
| openai-image-gen | AI 绘图 | "画一只猫" |
| peekaboo | 屏幕截图 | "截个屏" |
| tmux | 远程终端 | "看一下服务器状态" |

### 安装更多技能

```bash
# 搜索社区技能
openclaw skills search 翻译

# 安装技能
openclaw skills install @xxx/skill-name

# 通过 ClawHub
openclaw clawhub search
```

---

## 8. 定时任务与自动化

OpenClaw 支持 Cron 定时任务：

```bash
# 每天早上 8 点发送天气预报
openclaw cron add "0 8 * * *" "查看今天深圳天气并发送到飞书"

# 每小时检查邮件
openclaw cron add "0 * * * *" "检查新邮件，有重要的通知我"

# 每天下午 6 点总结今日工作
openclaw cron add "0 18 * * *" "总结今天的工作进度"
```

---

## 9. 多模型配置与成本优化

### 为不同场景配置不同模型

在 `openclaw.json` 中：

```json
{
  "models": {
    "default": "deepseek-v3",
    "coding": "deepseek-coder",
    "creative": "kimi-k2.5",
    "complex": "claude-opus-4"
  }
}
```

### 成本控制建议

1. **日常对话**：DeepSeek V3（约 1元/百万 tokens）
2. **长文档**：Kimi K2.5（256K 上下文）
3. **复杂推理**：Claude（按需切换）
4. **图片生成**：用 MiniMax 或 OpenAI DALL-E
5. **语音**：Sherpa-ONNX（本地免费）或 ElevenLabs

---

## 10. 常见问题与故障排除

### Q: 启动报错 "Node.js v22+ is required"

```bash
# 使用 U-Claw 自带的 Node.js
# Mac: 运行 "启动菜单.command" 而不是直接运行 openclaw
# 或安装到电脑后重新打开终端
```

### Q: npm install 超时

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com
# 或使用启动菜单 [7] 一键设置
```

### Q: AI 不回复消息

```bash
# 1. 检查 API Key 是否正确
# 2. 检查网络是否能访问 AI 服务
# 3. 运行诊断
openclaw doctor --repair
# 或使用启动菜单 [8]
```

### Q: 飞书机器人收不到消息

```
1. 检查事件订阅 URL 是否正确
2. 检查应用权限是否开启
3. 检查是否在飞书管理后台审核通过
4. 查看 OpenClaw 日志: tail -f ~/.openclaw/logs/gateway.log
```

### Q: QQ 机器人掉线

```
1. 检查 NapCatQQ 是否在运行
2. 重新扫码登录
3. 检查 NapCat 的 HTTP 端口配置
```

### Q: 如何完全重置？

```bash
# 方式1: 使用启动菜单 [11]
# 方式2: 命令行
openclaw reset --scope full
```

---

## 11. 进阶：VPS 部署

如果你想让 AI 助手 24/7 在线运行：

### 推荐配置

- **最低**：1核 2GB 内存（轻量云服务器即可）
- **推荐**：2核 4GB 内存
- **存储**：20GB+

### 国内云服务商推荐

- 腾讯云轻量：最低 50元/月
- 阿里云 ECS：学生价更便宜
- 华为云：同上

### Docker 部署

```bash
# 使用 Docker 一键部署
git clone https://github.com/openclaw/openclaw.git
cd openclaw
cp .env.example .env
# 编辑 .env，填入你的 API Key 和 Bot Token

docker compose up -d
```

---

## 12. 社区资源

### 教程

| 项目 | Stars | 说明 |
|------|-------|------|
| [hello-claw](https://github.com/datawhalechina/hello-claw) | 90+ | Datawhale 体系化教程 |
| [openclaw-docs](https://github.com/yeuxuan/openclaw-docs) | 500+ | 276篇源码级文档 |
| [awesome-openclaw-skills-zh](https://github.com/clawdbot-ai/awesome-openclaw-skills-zh) | 2500+ | 中文技能库 |

### 工具

| 项目 | 说明 |
|------|------|
| [NapCatQQ](https://github.com/NapNeko/NapCatQQ) | QQ 机器人框架 |
| [openclaw-wechat](https://github.com/icesword0760/openclaw-wechat) | 微信接入插件 |
| [U-Claw](https://github.com/dongsheng123132/u-claw) | 本项目，离线安装盘 |

### 社区

- U-Claw 官网: [u-claw.org](https://u-claw.org)
- OpenClaw 官方: [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)

---

*本教程由 U-Claw 社区维护，欢迎 PR 完善内容。*
