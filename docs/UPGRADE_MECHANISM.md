# Pclaw 升级更新机制技术文档

**版本**: v1.0  
**日期**: 2026-03-12  
**任务ID**: JJC-20260312-007

---

## 一、概述

本文档描述 Pclaw 便携版的升级更新机制设计，旨在保持 u-claw 便携、预装运行时、双击即用的设计理念，同时实现软件、用户数据、Pclaw专属数据的三者隔离，并具备单独升级与热插拔的能力。

### 设计目标

1. **保持便携理念** - 预装运行时、双击即用
2. **三层数据隔离** - 软件/用户数据/Pclaw专属数据分离
3. **模块化升级** - 支持核心/运行时/技能包单独升级
4. **自动检查更新** - 启动时检查并询问用户是否升级

---

## 二、目录结构设计

### 2.1 整体目录结构

```
Pclaw/
├── Pclaw.exe / Pclaw.app          # 启动入口（双击即用）
├── Pclaw-Updater.exe              # 升级程序
├── app/                           # 🎯 软件包（可升级）
│   ├── core/                      # OpenClaw 核心
│   │   ├── openclaw.mjs
│   │   ├── package.json
│   │   ├── dist/                  # 编译输出
│   │   └── node_modules/         # 依赖
│   ├── runtime/                   # 运行时（可替换）
│   │   ├── node-mac-arm64/       # Apple Silicon
│   │   ├── node-mac-x64/         # Intel Mac
│   │   └── node-win-x64/         # Windows
│   └── skills/                    # 技能包
│       ├── pclaw-hr/             # HR模块
│       └── pclaw-project/        # 项目管理
├── data/                          # 📂 用户数据（持久化）
│   ├── .openclaw/
│   │   └── openclaw.json         # 配置文件
│   ├── memory/                    # AI 记忆
│   ├── logs/                      # 日志
│   └── backups/                   # 备份
├── system/                        # 🔧 系统脚本
│   ├── update-checker.js         # 更新检查器
│   ├── updater.js                # 升级执行器
│   ├── migrate.js                # 数据迁移
│   └── version.json              # 版本信息
└── README.txt                     # 说明文件
```

### 2.2 目录职责说明

| 目录 | 职责 | 是否可升级 | 是否随软件分发 |
|------|------|-----------|---------------|
| `app/core/` | OpenClaw 核心代码 | ✅ | ✅ |
| `app/runtime/` | Node.js 运行时 | ✅ | ✅ |
| `app/skills/` | Pclaw 技能包 | ✅ | ✅ |
| `data/` | 用户数据 | ❌ | ❌ |
| `system/` | 升级脚本 | ✅ | ✅ |

---

## 三、版本管理机制

### 3.1 版本号规范

采用语义化版本号：`主版本.次版本.修订号`

- **主版本 (Major)** - 重大架构变更，兼容旧数据可能需要迁移
- **次版本 (Minor)** - 新功能添加，向后兼容
- **修订号 (Patch)** - Bug修复，向后兼容

### 3.2 版本信息文件

`system/version.json`:

```json
{
  "app": {
    "name": "Pclaw",
    "version": "1.2.0",
    "build": "20260312",
    "channel": "stable"
  },
  "components": {
    "core": {
      "version": "1.2.0",
      "minVersion": "1.0.0",
      "updateUrl": "https://pclaw.example.com/updates/core/{{arch}}/{{version}}.tar.gz"
    },
    "runtime": {
      "version": "20.10.0",
      "minVersion": "18.0.0",
      "updateUrl": "https://pclaw.example.com/updates/runtime/{{platform}}-{{arch}}/{{version}}.tar.gz"
    },
    "skills": {
      "pclaw-hr": "1.1.0",
      "pclaw-project": "1.0.0"
    }
  },
  "remote": {
    "latestVersion": "1.2.0",
    "releaseDate": "2026-03-10",
    "releaseNotes": "https://pclaw.example.com/releases/v1.2.0",
    "minSystemVersion": "10.15"
  }
}
```

---

## 四、升级检查机制

### 4.1 启动时检查流程

```
┌─────────────────────────────────────────────────────────┐
│                    用户双击启动 Pclaw                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  1. 加载 system/version.json 获取当前版本                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  2. 后台检查更新（网络请求）                              │
│     GET https://pclaw.example.com/api/version            │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │ 有可用更新    │        │ 已是最新版本  │
        └──────────────┘        └──────────────┘
                │                       │
                ▼                       ▼
┌─────────────────────────────────────────────────────────┐
│  3. 显示更新对话框（用户确认）                             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🎉 发现新版本 v1.2.0                             │   │
│  │                                                 │   │
│  │  当前版本: v1.1.0                               │   │
│  │  发布日期: 2026-03-10                           │   │
│  │                                                 │   │
│  │  更新内容:                                       │   │
│  │  • 新增项目管理模块                              │   │
│  │  • 优化启动速度                                   │   │
│  │  • 修复若干Bug                                   │   │
│  │                                                 │   │
│  │  [稍后提醒]  [跳过此版本]  [立即升级]            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.2 更新检查实现

`system/update-checker.js`:

```javascript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取本地版本信息
function getLocalVersion() {
  const versionFile = join(__dirname, 'version.json');
  if (!existsSync(versionFile)) {
    return null;
  }
  return JSON.parse(readFileSync(versionFile, 'utf-8'));
}

// 检查远程版本
async function checkRemoteVersion() {
  try {
    const response = await fetch('https://pclaw.example.com/api/version');
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('检查更新失败:', error);
    return null;
  }
}

// 比较版本
function compareVersions(local, remote) {
  const localParts = local.split('.').map(Number);
  const remoteParts = remote.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    if (remoteParts[i] > localParts[i]) {
      return { available: true, type: 'major' };
    }
    if (remoteParts[i] < localParts[i]) {
      return { available: false };
    }
  }
  return { available: false };
}

// 主函数
export async function checkForUpdates(silent = false) {
  const local = getLocalVersion();
  if (!local) {
    return { error: '无法读取本地版本' };
  }

  const remote = await checkRemoteVersion();
  if (!remote) {
    if (!silent) {
      console.log('已是最新版本');
    }
    return { upToDate: true };
  }

  const comparison = compareVersions(local.app.version, remote.latestVersion);
  
  if (comparison.available) {
    return {
      available: true,
      localVersion: local.app.version,
      remoteVersion: remote.latestVersion,
      releaseDate: remote.releaseDate,
      releaseNotes: remote.releaseNotes,
      components: remote.components
    };
  }

  return { upToDate: true };
}

// CLI 入口
if (import.meta.argv.includes('--check')) {
  checkForUpdates().then(result => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  });
}
```

---

## 五、升级执行机制

### 5.1 升级类型

| 类型 | 说明 | 风险 | 停机时间 |
|------|------|------|----------|
| **热更新** | 技能包、配置 | 低 | 无 |
| **平滑升级** | 运行时、小版本 | 中 | 短暂 |
| **完全升级** | 核心、架构变更 | 高 | 需要重启 |

### 5.2 升级流程

```
┌─────────────────────────────────────────────────────────┐
│                  用户点击"立即升级"                       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  1. 创建数据备份                                         │
│     backup/backup-{timestamp}/                          │
│     - data/.openclaw/config.json                        │
│     - data/memory/                                      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  2. 下载更新包                                           │
│     - 显示下载进度                                       │
│     - 验证 SHA256 校验和                                  │
│     - 临时保存到 system/temp/                            │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  3. 执行升级                                             │
│     - 停止当前运行的服务                                 │
│     - 备份旧版本到 backup/                               │
│     - 解压新版本到 app/                                  │
│     - 运行迁移脚本（如有）                               │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  4. 验证与启动                                           │
│     - 检查核心文件完整性                                 │
│     - 启动 Pclaw                                         │
│     - 显示升级成功提示                                   │
└─────────────────────────────────────────────────────────┘
```

### 5.3 升级执行器实现

`system/updater.js`:

```javascript
import { createWriteStream, createReadStream, existsSync, mkdirSync, 
         readFileSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..', 'app');
const SYSTEM_DIR = __dirname;
const BACKUP_DIR = join(__dirname, '..', 'data', 'backups');

class Updater {
  constructor() {
    this.currentVersion = null;
    this.updateInfo = null;
  }

  // 创建备份
  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(BACKUP_DIR, `backup-${timestamp}`);
    mkdirSync(backupPath, { recursive: true });
    
    // 备份关键文件
    const filesToBackup = [
      'version.json',
      '../data/.openclaw/openclaw.json'
    ];
    
    for (const file of filesToBackup) {
      const src = join(SYSTEM_DIR, file);
      const dst = join(backupPath, file.replace(/\.\.\//g, ''));
      if (existsSync(src)) {
        // 复制文件
      }
    }
    
    return backupPath;
  }

  // 下载文件
  async downloadFile(url, destPath) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }
    
    await pipeline(
      response.body,
      createWriteStream(destPath)
    );
  }

  // 验证 SHA256
  async verifyChecksum(filePath, expectedChecksum) {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', data => hash.update(data));
      stream.on('end', () => {
        const calculated = hash.digest('hex');
        resolve(calculated === expectedChecksum);
      });
      stream.on('error', reject);
    });
  }

  // 执行组件升级
  async updateComponent(component, version, url, checksum) {
    const tempPath = join(SYSTEM_DIR, 'temp', `${component}.tar.gz`);
    const targetPath = join(APP_DIR, component);
    
    console.log(`下载 ${component}...`);
    await this.downloadFile(url, tempPath);
    
    console.log(`验证 checksum...`);
    const valid = await this.verifyChecksum(tempPath, checksum);
    if (!valid) {
      throw new Error('校验失败，更新包可能被篡改');
    }
    
    console.log(`备份旧版本...`);
    if (existsSync(targetPath)) {
      const backupPath = join(BACKUP_DIR, `${component}-old`);
      rmSync(backupPath, { recursive: true, force: true });
      // 重命名旧版本
    }
    
    console.log(`安装新版本...`);
    // 解压并安装
    
    console.log(`更新版本信息...`);
    // 更新 version.json
  }

  // 主升级流程
  async performUpdate(updateInfo) {
    this.updateInfo = updateInfo;
    
    try {
      // 1. 创建备份
      const backupPath = await this.createBackup();
      console.log(`备份已创建: ${backupPath}`);
      
      // 2. 升级各组件
      if (updateInfo.components.core) {
        await this.updateComponent('core', ...);
      }
      
      if (updateInfo.components.runtime) {
        await this.updateComponent('runtime', ...);
      }
      
      // 3. 运行迁移脚本
      await this.runMigrations();
      
      // 4. 更新版本文件
      this.updateVersionFile(updateInfo.remoteVersion);
      
      console.log('✅ 升级完成！');
      return { success: true };
      
    } catch (error) {
      console.error('升级失败:', error);
      // 可以实现自动回滚
      return { success: false, error: error.message };
    }
  }

  // 回滚
  async rollback(backupPath) {
    console.log(`从 ${backupPath} 回滚...`);
    // 恢复备份文件
  }
}

export default new Updater();
```

---

## 六、数据迁移机制

### 6.1 迁移策略

| 场景 | 策略 |
|------|------|
| 配置文件新增字段 | 合并默认配置，保留用户配置 |
| 数据结构变更 | 自动迁移，失败则提示用户 |
| 大版本升级 | 提供迁移脚本，可选执行 |

### 6.2 迁移脚本

`system/migrate.js`:

```javascript
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = {
  '1.0.0': migrateFrom100,
  '1.1.0': migrateFrom110,
  '1.2.0': migrateFrom120
};

export async function runMigrations(currentVersion, targetVersion) {
  const versions = Object.keys(MIGRATIONS).sort();
  
  for (const version of versions) {
    if (versionCompare(version, currentVersion) > 0 && 
        versionCompare(version, targetVersion) <= 0) {
      console.log(`执行迁移: ${version}...`);
      await MIGRATIONS[version]();
    }
  }
}

function migrateFrom110() {
  // v1.1.0 迁移逻辑
  const configPath = join(__dirname, '..', 'data', '.openclaw', 'openclaw.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    // 新增默认配置项
    config.pclaw = config.pclaw || {};
    config.pclaw.project = config.pclaw.project || {
      defaultTemplate: 'engineering'
    };
    
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }
}
```

---

## 七、热插拔机制

### 7.1 技能包热插拔

技能包目录 `app/skills/` 支持运行时热加载：

```
app/skills/
├── _builtin/              # 内置技能（不可删除）
│   └── qqbot/
├── pclaw-hr/             # 可插拔 HR 模块
│   ├── skill.json        # 技能元信息
│   ├── index.ts
│   └── README.md
└── pclaw-project/        # 可插拔项目管理
    ├── skill.json
    ├── index.ts
    └── README.md
```

### 7.2 技能元信息

`app/skills/pclaw-hr/skill.json`:

```json
{
  "id": "pclaw-hr",
  "name": "Pclaw HR Module",
  "version": "1.1.0",
  "description": "工程行业组织架构与人力资源管理",
  "author": "Pclaw Team",
  "dependencies": {
    "openclaw": ">=1.0.0"
  },
  "entry": "index.js",
  "hotReload": true,
  "settings": {
    "enabled": true,
    "autoUpdate": false
  }
}
```

---

## 八、自动更新配置

### 8.1 用户配置项

用户可在 `data/.openclaw/openclaw.json` 中配置更新行为：

```json
{
  "pclaw": {
    "update": {
      "autoCheck": true,           // 启动时自动检查
      "checkInterval": "daily",    // daily / weekly / manual
      "autoDownload": false,       // 自动下载（后台）
      "autoInstall": false,        // 自动安装（需确认）
      "skipVersion": "",           // 跳过指定版本
      "channel": "stable"          // stable / beta / dev
    }
  }
}
```

### 8.2 更新提示策略

| 配置 | 行为 |
|------|------|
| `autoCheck: true` | 启动时检查更新 |
| `autoDownload: true` | 发现更新后自动下载 |
| `autoInstall: true` | 下载完成后自动安装（仍需用户确认重启） |

---

## 九、离线升级

### 9.1 手动升级包

对于无法联网的环境，支持手动升级：

1. 从官网下载离线升级包：`Pclaw-Update-{version}.zip`
2. 解压到 Pclaw 根目录
3. 双击运行 `Pclaw-Updater.exe`
4. 自动检测并提示升级

### 9.2 升级包结构

```
Pclaw-Update-1.2.0/
├── update.json           # 升级包元信息
├── core.tar.gz          # 核心更新
├── runtime.tar.gz       # 运行时更新（可选）
├── skills/              # 技能包更新
│   └── ...
├── migrate/             # 迁移脚本
│   └── migrate-120.js
└── installer.sh        # 安装脚本
```

---

## 十、安全机制

### 10. 签名验证

所有更新包必须经过 Pclaw 官方签名，升级时验证：

```javascript
import { createVerify } from 'crypto';

function verifySignature(data, signature, publicKey) {
  const verifier = createVerify('RSA-SHA256');
  verifier.update(data);
  return verifier.verify(publicKey, signature, 'base64');
}
```

### 10.2 HTTPS 传输

所有更新请求必须使用 HTTPS，防止中间人攻击。

---

## 十一、文件路径汇总

| 文件 | 路径 | 说明 |
|------|------|------|
| 版本信息 | `system/version.json` | 当前版本与远程版本 |
| 更新检查器 | `system/update-checker.js` | 检查更新逻辑 |
| 升级执行器 | `system/updater.js` | 执行升级逻辑 |
| 迁移脚本 | `system/migrate.js` | 数据迁移 |
| 用户配置 | `data/.openclaw/openclaw.json` | 用户配置与更新设置 |
| 备份目录 | `data/backups/` | 升级前备份 |
| 启动器 | `Mac-Start.command` / `Windows-Start.bat` | 主启动入口 |
| 升级器 | `Pclaw-Updater.exe` | 独立升级程序 |

---

## 十二、附录

### 12.1 启动流程完整图

```
用户双击
    │
    ▼
┌─────────────────┐
│ 加载 version.json │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 检查更新(后台)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
有更新    无更新
    │         │
    ▼         ▼
显示对话框    │
    │      ┌──┴────────────────┐
    │      ▼                   ▼
    │  立即升级    稍后提醒     │
    │      │         │         │
    │      ▼         │         │
    │  执行升级     │         │
    │      │         │         │
    │      ▼         │         │
    │  启动 Pclaw  ◄─┘         │
    │      │                   │
    └──────┴───────────────────┘
              │
              ▼
        启动 Gateway
```

### 12.2 版本兼容性矩阵

| Pclaw 版本 | OpenClaw 最低版本 | Node.js 最低版本 |
|------------|-------------------|------------------|
| 1.0.x | 1.0.0 | 18.x |
| 1.1.x | 1.1.0 | 18.x |
| 1.2.x | 1.2.0 | 20.x |

---

**文档结束**
