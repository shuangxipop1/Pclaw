/**
 * Pclaw Modules - Organization Management
 * 组织管理：动态组织架构 + 汇报关系
 */

const { v4: uuidv4 } = require('uuid');

class OrganizationManager {
  constructor() {
    this.nodes = new Map();      // 组织节点
    this.relationships = new Map(); // 汇报关系
  }

  /**
   * 创建组织节点（人或Agent）
   */
  createNode(data) {
    const { name, type, role, parentId, metadata = {} } = data;
    const nodeId = `node_${uuidv4().slice(0, 8)}`;
    
    const node = {
      id: nodeId,
      name,
      type,           // 'human' | 'agent' | 'mixed'
      role,
      parentId,
      children: [],
      metadata,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    this.nodes.set(nodeId, node);
    
    // 更新父节点
    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.children.push(nodeId);
      }
    }
    
    return node;
  }

  /**
   * 创建汇报关系
   */
  createRelationship(fromNodeId, toNodeId, type = 'report') {
    const relId = `rel_${uuidv4().slice(0, 8)}`;
    
    const relationship = {
      id: relId,
      from: fromNodeId,
      to: toNodeId,
      type,           // 'report' | 'collaborate' | 'delegate'
      createdAt: new Date().toISOString()
    };
    
    this.relationships.set(relId, relationship);
    return relationship;
  }

  /**
   * 获取节点信息
   */
  getNode(nodeId) {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取下属节点
   */
  getSubordinates(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return [];
    
    const subordinates = [];
    for (const childId of node.children) {
      subordinates.push(this.nodes.get(childId));
    }
    return subordinates;
  }

  /**
   * 获取汇报链
   */
  getReportingChain(nodeId) {
    const chain = [];
    let currentId = nodeId;
    
    while (currentId) {
      const node = this.nodes.get(currentId);
      if (!node) break;
      
      chain.push(node);
      currentId = node.parentId;
    }
    
    return chain;
  }

  /**
   * 获取组织树
   */
  getOrgTree(rootId = null) {
    const buildTree = (nodeId) => {
      const node = this.nodes.get(nodeId);
      if (!node) return null;
      
      return {
        ...node,
        children: node.children.map(buildTree).filter(Boolean)
      };
    };
    
    if (rootId) {
      return buildTree(rootId);
    }
    
    // 返回所有顶级节点
    const roots = [];
    for (const [id, node] of this.nodes) {
      if (!node.parentId) {
        roots.push(buildTree(id));
      }
    }
    return roots;
  }

  /**
   * 更新节点
   */
  updateNode(nodeId, updates) {
    const node = this.nodes.get(nodeId);
    if (!node) return null;
    
    Object.assign(node, updates);
    node.updatedAt = new Date().toISOString();
    
    return node;
  }

  /**
   * 获取所有节点
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }
}

module.exports = { OrganizationManager };
