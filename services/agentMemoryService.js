/**
 * Agent Memory Service
 *
 * [Feature] Issue #27: Implement agent memory for AI features
 * Provides memory storage for AI-powered features and agent context
 * using ZeroDB for persistence and semantic search capabilities
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');
const { v4: uuidv4 } = require('uuid');

/**
 * Memory type constants
 */
const MEMORY_TYPES = {
  USER_PREFERENCE: 'user_preference',
  INTERACTION_HISTORY: 'interaction_history',
  AI_INSIGHT: 'ai_insight',
  CACHED_RESULT: 'cached_result',
  CONTEXT: 'context',
  GENERAL: 'general'
};

/**
 * Configuration constants
 */
const CONFIG = {
  DEFAULT_NAMESPACE: 'agent_memory',
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SEARCH_LIMIT: 10,
  EMBEDDING_DIMENSION: 768
};

/**
 * AgentMemoryService class provides methods for agent memory management
 */
class AgentMemoryService {
  constructor() {
    this.memoryTypes = MEMORY_TYPES;
  }

  /**
   * Build namespace for memory based on context
   * @param {Object} options - Options containing agentId, companyId, userId
   * @returns {string} - Namespace string
   */
  buildNamespace(options = {}) {
    const { agentId, companyId, userId } = options;
    let namespace = CONFIG.DEFAULT_NAMESPACE;

    if (companyId) {
      namespace = `${CONFIG.DEFAULT_NAMESPACE}_${companyId}`;
    } else if (userId) {
      namespace = `${CONFIG.DEFAULT_NAMESPACE}_user_${userId}`;
    } else if (agentId) {
      namespace = `${CONFIG.DEFAULT_NAMESPACE}_${agentId}`;
    }

    return namespace;
  }

  /**
   * Store a memory item
   * @param {Object} memoryData - Memory data to store
   * @returns {Promise<Object>} - Stored memory details
   */
  async storeMemory(memoryData) {
    const {
      agentId,
      content,
      userId,
      companyId,
      type = MEMORY_TYPES.GENERAL,
      category,
      tags = [],
      ttl,
      sessionId
    } = memoryData;

    if (!agentId) {
      throw new Error('Agent ID is required');
    }

    if (!content) {
      throw new Error('Content is required');
    }

    try {
      const memoryId = uuidv4();
      const namespace = this.buildNamespace({ agentId, companyId, userId });
      const now = new Date();

      const embedding = await vectorService.generateEmbedding(content);

      const metadata = {
        memory_id: memoryId,
        agent_id: agentId,
        type,
        tags,
        pinned: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      };

      if (userId) metadata.user_id = userId;
      if (companyId) metadata.company_id = companyId;
      if (category) metadata.category = category;
      if (sessionId) metadata.session_id = sessionId;
      if (ttl) metadata.expires_at = new Date(now.getTime() + ttl).toISOString();

      await zerodbService.upsertVector(
        embedding,
        namespace,
        metadata,
        content,
        `memory:${memoryId}`
      );

      const memoryContent = JSON.stringify({ content, type, tags, category, sessionId });

      await zerodbService.storeMemory(
        `agent:${agentId}`,
        sessionId || memoryId,
        'system',
        memoryContent,
        metadata
      );

      return {
        id: memoryId,
        content,
        type,
        tags,
        created_at: now.toISOString()
      };
    } catch (error) {
      console.error('Error storing memory:', error);
      throw new Error('Failed to store memory: ' + error.message);
    }
  }

  /**
   * Get memories with filtering and pagination
   */
  async getMemories(options = {}) {
    const {
      agentId,
      userId,
      companyId,
      type,
      tags,
      page = 1,
      pageSize = CONFIG.DEFAULT_PAGE_SIZE,
      pinnedFirst = false
    } = options;

    try {
      const memories = await zerodbService.listMemory(
        agentId ? `agent:${agentId}` : null,
        null,
        'system',
        0,
        1000
      );

      let filteredMemories = memories.map(m => {
        let parsed = {};
        try {
          parsed = JSON.parse(m.content);
        } catch (e) {
          parsed = { content: m.content };
        }

        return {
          id: m.memory_metadata?.memory_id || m.id,
          content: parsed.content,
          type: m.memory_metadata?.type || parsed.type,
          tags: m.memory_metadata?.tags || parsed.tags || [],
          category: m.memory_metadata?.category || parsed.category,
          pinned: m.memory_metadata?.pinned || false,
          userId: m.memory_metadata?.user_id,
          companyId: m.memory_metadata?.company_id,
          expiresAt: m.memory_metadata?.expires_at,
          createdAt: m.memory_metadata?.created_at || m.created_at
        };
      });

      filteredMemories = filteredMemories.filter(m => {
        if (m.expiresAt && new Date(m.expiresAt) < new Date()) return false;
        return true;
      });

      if (userId) filteredMemories = filteredMemories.filter(m => m.userId === userId);
      if (companyId) filteredMemories = filteredMemories.filter(m => m.companyId === companyId);
      if (type) filteredMemories = filteredMemories.filter(m => m.type === type);
      if (tags && tags.length > 0) {
        filteredMemories = filteredMemories.filter(m =>
          m.tags && tags.some(t => m.tags.includes(t))
        );
      }

      if (pinnedFirst) {
        filteredMemories.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      } else {
        filteredMemories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      const totalCount = filteredMemories.length;
      const effectivePageSize = Math.min(pageSize, CONFIG.MAX_PAGE_SIZE);
      const startIndex = (page - 1) * effectivePageSize;
      const paginatedMemories = filteredMemories.slice(startIndex, startIndex + effectivePageSize);

      return {
        memories: paginatedMemories,
        page,
        pageSize: effectivePageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / effectivePageSize)
      };
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw new Error('Failed to retrieve memories: ' + error.message);
    }
  }

  /**
   * Search memories using semantic similarity
   */
  async searchMemories(query, options = {}) {
    const { agentId, type, limit = CONFIG.DEFAULT_SEARCH_LIMIT, minRelevance = 0 } = options;

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    try {
      const namespace = this.buildNamespace({ agentId });
      const queryEmbedding = await vectorService.generateEmbedding(query);
      const searchResults = await zerodbService.searchVectors(queryEmbedding, limit, namespace);

      let memories = (searchResults.vectors || []).map(vector => ({
        id: vector.vector_metadata?.memory_id,
        content: vector.document,
        type: vector.vector_metadata?.type,
        tags: vector.vector_metadata?.tags || [],
        relevanceScore: this.normalizeScore(vector.similarity_score || 0),
        agentId: vector.vector_metadata?.agent_id,
        userId: vector.vector_metadata?.user_id,
        companyId: vector.vector_metadata?.company_id,
        createdAt: vector.vector_metadata?.created_at
      }));

      if (type) memories = memories.filter(m => m.type === type);
      if (minRelevance > 0) memories = memories.filter(m => m.relevanceScore >= minRelevance);
      memories.sort((a, b) => b.relevanceScore - a.relevanceScore);

      return {
        memories,
        searchTimeMs: searchResults.search_time_ms || 0,
        totalCount: memories.length
      };
    } catch (error) {
      console.error('Error searching memories:', error);
      throw new Error('Failed to search memories: ' + error.message);
    }
  }

  normalizeScore(score) {
    if (score < 0) return 0;
    if (score > 1) return 1;
    return score;
  }

  async getMemoryById(memoryId) {
    const memories = await zerodbService.listMemory(null, null, 'system', 0, 1000);
    const found = memories.find(m => m.memory_metadata?.memory_id === memoryId || m.id === memoryId);
    if (!found) return null;

    let parsed = {};
    try { parsed = JSON.parse(found.content); } catch (e) { parsed = { content: found.content }; }

    return {
      id: found.memory_metadata?.memory_id || found.id,
      content: parsed.content,
      type: found.memory_metadata?.type || parsed.type,
      tags: found.memory_metadata?.tags || parsed.tags || [],
      pinned: found.memory_metadata?.pinned || false,
      agentId: found.memory_metadata?.agent_id,
      userId: found.memory_metadata?.user_id,
      companyId: found.memory_metadata?.company_id,
      metadata: found.memory_metadata
    };
  }

  async updateMemoryMetadata(memoryId, memory, updates) {
    const metadata = { ...memory.metadata, ...updates, memory_id: memoryId, updated_at: new Date().toISOString() };
    const memoryContent = JSON.stringify({ content: memory.content, type: memory.type, tags: updates.tags || memory.tags });
    await zerodbService.storeMemory(`agent:${memory.agentId}`, memoryId, 'system', memoryContent, metadata);
    return { ...memory, ...updates };
  }

  async addTags(memoryId, newTags) {
    const memory = await this.getMemoryById(memoryId);
    if (!memory) throw new Error('Memory not found');
    const updatedTags = [...new Set([...(memory.tags || []), ...newTags])];
    return this.updateMemoryMetadata(memoryId, memory, { tags: updatedTags });
  }

  async removeTags(memoryId, tagsToRemove) {
    const memory = await this.getMemoryById(memoryId);
    if (!memory) throw new Error('Memory not found');
    const updatedTags = (memory.tags || []).filter(t => !tagsToRemove.includes(t));
    return this.updateMemoryMetadata(memoryId, memory, { tags: updatedTags });
  }

  async pinMemory(memoryId) {
    const memory = await this.getMemoryById(memoryId);
    if (!memory) throw new Error('Memory not found');
    return this.updateMemoryMetadata(memoryId, memory, { pinned: true });
  }

  async unpinMemory(memoryId) {
    const memory = await this.getMemoryById(memoryId);
    if (!memory) throw new Error('Memory not found');
    return this.updateMemoryMetadata(memoryId, memory, { pinned: false });
  }

  async getPinnedMemories(agentId) {
    const result = await this.getMemories({ agentId, pinnedFirst: true });
    return { memories: result.memories.filter(m => m.pinned === true) };
  }

  async getCorpusMemories(companyId) {
    const result = await this.getMemories({ companyId });
    return { companyId, memories: result.memories, totalCount: result.totalCount };
  }

  async getCorpusStats(companyId) {
    const memories = await zerodbService.listMemory(null, null, 'system', 0, 1000);
    const corpusMemories = memories.filter(m => m.memory_metadata?.company_id === companyId);
    const memoriesByType = {};
    corpusMemories.forEach(m => {
      const type = m.memory_metadata?.type || 'general';
      memoriesByType[type] = (memoriesByType[type] || 0) + 1;
    });
    return { companyId, totalMemories: corpusMemories.length, memoriesByType };
  }

  async getMemoryAnalytics(options = {}) {
    const { agentId, dateRange } = options;
    const memories = await zerodbService.listMemory(agentId ? `agent:${agentId}` : null, null, 'system', 0, 1000);

    let filteredMemories = memories;
    if (dateRange) {
      const { start, end } = dateRange;
      filteredMemories = memories.filter(m => {
        const createdAt = new Date(m.memory_metadata?.created_at || m.created_at);
        return createdAt >= start && createdAt <= end;
      });
    }

    const memoriesByType = {};
    const tagCounts = {};
    const memoriesOverTime = {};
    let totalBytes = 0;

    filteredMemories.forEach(m => {
      const type = m.memory_metadata?.type || 'general';
      memoriesByType[type] = (memoriesByType[type] || 0) + 1;
      const tags = m.memory_metadata?.tags || [];
      tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
      const dateValue = m.memory_metadata?.created_at || m.created_at;
      if (dateValue) {
        const dateObj = new Date(dateValue);
        if (!isNaN(dateObj.getTime())) {
          const date = dateObj.toISOString().split('T')[0];
          memoriesOverTime[date] = (memoriesOverTime[date] || 0) + 1;
        }
      }
      totalBytes += m.content ? m.content.length : 0;
    });

    const topTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { totalMemories: filteredMemories.length, memoriesByType, memoryUsageBytes: totalBytes, memoriesOverTime, topTags };
  }

  async updateMemory(memoryId, updates) {
    const memory = await this.getMemoryById(memoryId);
    if (!memory) throw new Error('Memory not found');
    const { content, metadata } = updates;
    if (content) {
      const embedding = await vectorService.generateEmbedding(content);
      const namespace = this.buildNamespace({ agentId: memory.agentId, companyId: memory.companyId });
      await zerodbService.upsertVector(embedding, namespace, { ...memory.metadata, memory_id: memoryId }, content, `memory:${memoryId}`);
      memory.content = content;
    }
    const updatedMetadata = { ...(metadata || {}), updated_at: new Date().toISOString() };
    return this.updateMemoryMetadata(memoryId, memory, updatedMetadata);
  }

  async storeMemoriesBatch(memories) {
    const results = [];
    for (const memoryData of memories) {
      try {
        const result = await this.storeMemory(memoryData);
        results.push(result);
      } catch (error) {
        console.error('Error storing memory in batch:', error);
        results.push({ error: error.message });
      }
    }
    return results;
  }

  async deleteMemories(filter) {
    const { agentId, type } = filter;
    const memories = await zerodbService.listMemory(agentId ? `agent:${agentId}` : null, null, 'system', 0, 1000);
    let toDelete = memories;
    if (type) toDelete = memories.filter(m => m.memory_metadata?.type === type);
    let deletedCount = 0;
    for (const memory of toDelete) {
      try {
        await zerodbService.storeMemory(agentId ? `agent:${agentId}` : 'deleted', memory.id, 'system', '', { ...memory.memory_metadata, deleted: true, deleted_at: new Date().toISOString() });
        deletedCount++;
      } catch (error) { console.error('Error deleting memory:', error); }
    }
    return { deletedCount };
  }
}

module.exports = new AgentMemoryService();
