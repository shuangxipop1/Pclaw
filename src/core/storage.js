/**
 * Pclaw Storage - 持久化层
 * 支持多种存储后端
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Storage {
  constructor(options = {}) {
    // 支持绝对路径和相对路径
    this.baseDir = options.baseDir 
      ? (path.isAbsolute(options.baseDir) ? options.baseDir : path.join(process.cwd(), options.baseDir))
      : path.join(process.cwd(), './data');
    this.engine = options.engine || 'file'; // file | memory
    
    if (this.engine === 'file') {
      this.initFileStorage();
    }
    
    this.cache = new Map();
  }

  initFileStorage() {
    const dirs = ['tasks', 'artifacts', 'audit', 'snapshots'];
    for (const dir of dirs) {
      const fullPath = path.join(this.baseDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
  }

  /**
   * 保存 Task
   */
  saveTask(task) {
    const filePath = path.join(this.baseDir, 'tasks', `${task.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(task, null, 2));
    this.cache.set(task.id, task);
    return task;
  }

  /**
   * 加载 Task
   */
  loadTask(taskId) {
    if (this.cache.has(taskId)) {
      return this.cache.get(taskId);
    }
    
    const filePath = path.join(this.baseDir, 'tasks', `${taskId}.json`);
    if (fs.existsSync(filePath)) {
      const task = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.cache.set(taskId, task);
      return task;
    }
    return null;
  }

  /**
   * 删除 Task
   */
  deleteTask(taskId) {
    const filePath = path.join(this.baseDir, 'tasks', `${taskId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    this.cache.delete(taskId);
  }

  /**
   * 查询 Tasks
   */
  queryTasks(filter = {}) {
    const tasksDir = path.join(this.baseDir, 'tasks');
    const files = fs.readdirSync(tasksDir);
    
    const results = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const task = this.loadTask(file.replace('.json', ''));
      if (!task) continue;
      
      // 应用过滤
      if (filter.status && task.status !== filter.status) continue;
      if (filter.executorType && task.executor?.type !== filter.executorType) continue;
      if (filter.parent !== undefined && task.parent !== filter.parent) continue;
      
      results.push(task);
    }
    
    return results;
  }

  /**
   * 保存 Artifact
   */
  saveArtifact(taskId, artifact) {
    const artifactId = `artifact_${Date.now()}`;
    const fileName = `${taskId}_${artifactId}_${artifact.name}`;
    const filePath = path.join(this.baseDir, 'artifacts', fileName);
    
    // 计算哈希
    const hash = crypto.createHash('sha256');
    
    if (artifact.type === 'file') {
      // 保存文件
      fs.writeFileSync(filePath, artifact.content);
      hash.update(artifact.content);
    } else {
      // 保存数据
      const content = JSON.stringify(artifact.content);
      fs.writeFileSync(filePath, content);
      hash.update(content);
    }
    
    const saved = {
      id: artifactId,
      taskId,
      name: artifact.name,
      type: artifact.type,
      path: filePath,
      hash: hash.digest('hex'),
      size: fs.statSync(filePath).size,
      createdAt: new Date().toISOString()
    };
    
    return saved;
  }

  /**
   * 保存审计日志
   */
  saveAudit(event) {
    const auditEntry = {
      id: `audit_${Date.now()}`,
      ...event,
      timestamp: new Date().toISOString()
    };
    
    const filePath = path.join(this.baseDir, 'audit', `${auditEntry.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(auditEntry, null, 2));
    
    return auditEntry;
  }

  /**
   * 查询审计日志
   */
  queryAudit(filter = {}) {
    const auditDir = path.join(this.baseDir, 'audit');
    if (!fs.existsSync(auditDir)) return [];
    
    const files = fs.readdirSync(auditDir);
    const results = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const entry = JSON.parse(fs.readFileSync(path.join(auditDir, file), 'utf8'));
      
      if (filter.taskId && entry.taskId !== filter.taskId) continue;
      if (filter.event && entry.event !== filter.event) continue;
      if (filter.actor && entry.actor !== filter.actor) continue;
      
      results.push(entry);
    }
    
    return results.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  /**
   * 创建快照
   */
  createSnapshot(name) {
    const snapshotId = `snapshot_${Date.now()}`;
    const snapshot = {
      id: snapshotId,
      name,
      tasks: this.queryTasks(),
      createdAt: new Date().toISOString()
    };
    
    const filePath = path.join(this.baseDir, 'snapshots', `${snapshotId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    
    return snapshot;
  }

  /**
   * 恢复快照
   */
  restoreSnapshot(snapshotId) {
    const filePath = path.join(this.baseDir, 'snapshots', `${snapshotId}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error('Snapshot not found');
    }
    
    const snapshot = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 恢复所有 tasks
    for (const task of snapshot.tasks) {
      this.saveTask(task);
    }
    
    return snapshot;
  }

  /**
   * 清理旧数据
   */
  cleanup(days = 30) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    
    // 清理旧的审计日志
    const auditDir = path.join(this.baseDir, 'audit');
    if (fs.existsSync(auditDir)) {
      for (const file of fs.readdirSync(auditDir)) {
        const filePath = path.join(auditDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}

module.exports = { Storage };
