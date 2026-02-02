/**
 * Agent Memory Controller
 *
 * [Feature] Issue #27: Implement agent memory for AI features
 * Handles HTTP requests for agent memory operations
 */

const mongoose = require('mongoose');
const agentMemoryService = require('../services/agentMemoryService');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const storeMemory = async (req, res) => {
  try {
    const { agentId, content, type, tags, companyId, ttl, sessionId, category } = req.body;
    if (!agentId) return res.status(400).json({ error: 'Agent ID is required' });
    if (!content) return res.status(400).json({ error: 'Content is required' });

    const memoryData = { agentId, content, type, tags, companyId, ttl, sessionId, category, userId: req.user?.id };
    const result = await agentMemoryService.storeMemory(memoryData);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Store memory error:', error);
    return res.status(500).json({ error: 'Failed to store memory: ' + error.message });
  }
};

const getMemories = async (req, res) => {
  try {
    const { agentId, userId, companyId, type, tags, page, pageSize, pinnedFirst } = req.query;
    if (!agentId) return res.status(400).json({ error: 'Agent ID is required' });

    const options = {
      agentId, userId, companyId, type,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      pinnedFirst: pinnedFirst === 'true'
    };
    if (tags) options.tags = tags.split(',').map(t => t.trim());

    const result = await agentMemoryService.getMemories(options);
    res.set('X-Total-Count', String(result.totalCount || 0));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get memories error:', error);
    return res.status(500).json({ error: 'Failed to retrieve memories: ' + error.message });
  }
};

const searchMemories = async (req, res) => {
  try {
    const { query, agentId, type, limit, minRelevance } = req.body;
    if (!query || query.trim().length === 0) return res.status(400).json({ error: 'Query is required' });
    if (!agentId) return res.status(400).json({ error: 'Agent ID is required' });

    const options = { agentId, type, limit: limit ? parseInt(limit, 10) : 10, minRelevance: minRelevance || 0 };
    const result = await agentMemoryService.searchMemories(query, options);
    res.set('X-Search-Time-Ms', String(result.searchTimeMs || 0));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Search memories error:', error);
    return res.status(500).json({ error: 'Failed to search memories: ' + error.message });
  }
};

const pinMemory = async (req, res) => {
  try {
    const { memoryId } = req.params;
    if (!memoryId) return res.status(400).json({ error: 'Memory ID is required' });
    const result = await agentMemoryService.pinMemory(memoryId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Pin memory error:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Memory not found' });
    return res.status(500).json({ error: 'Failed to pin memory: ' + error.message });
  }
};

const unpinMemory = async (req, res) => {
  try {
    const { memoryId } = req.params;
    if (!memoryId) return res.status(400).json({ error: 'Memory ID is required' });
    const result = await agentMemoryService.unpinMemory(memoryId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Unpin memory error:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Memory not found' });
    return res.status(500).json({ error: 'Failed to unpin memory: ' + error.message });
  }
};

const addTags = async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { tags } = req.body;
    if (!memoryId) return res.status(400).json({ error: 'Memory ID is required' });
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'Tags must be an array' });
    if (tags.length === 0) return res.status(400).json({ error: 'At least one tag is required' });
    const result = await agentMemoryService.addTags(memoryId, tags);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Add tags error:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Memory not found' });
    return res.status(500).json({ error: 'Failed to add tags: ' + error.message });
  }
};

const removeTags = async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { tags } = req.body;
    if (!memoryId) return res.status(400).json({ error: 'Memory ID is required' });
    if (!Array.isArray(tags) || tags.length === 0) return res.status(400).json({ error: 'Tags array is required' });
    const result = await agentMemoryService.removeTags(memoryId, tags);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Remove tags error:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Memory not found' });
    return res.status(500).json({ error: 'Failed to remove tags: ' + error.message });
  }
};

const getMemoryAnalytics = async (req, res) => {
  try {
    const { agentId, startDate, endDate } = req.query;
    const options = { agentId };
    if (startDate && endDate) options.dateRange = { start: new Date(startDate), end: new Date(endDate) };
    const result = await agentMemoryService.getMemoryAnalytics(options);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get memory analytics error:', error);
    return res.status(500).json({ error: 'Failed to get memory analytics: ' + error.message });
  }
};

const getCorpusMemories = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!isValidObjectId(companyId)) return res.status(400).json({ error: 'Invalid company ID format' });
    const result = await agentMemoryService.getCorpusMemories(companyId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get corpus memories error:', error);
    return res.status(500).json({ error: 'Failed to get corpus memories: ' + error.message });
  }
};

const getCorpusStats = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (!isValidObjectId(companyId)) return res.status(400).json({ error: 'Invalid company ID format' });
    const result = await agentMemoryService.getCorpusStats(companyId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get corpus stats error:', error);
    return res.status(500).json({ error: 'Failed to get corpus stats: ' + error.message });
  }
};

const getPinnedMemories = async (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) return res.status(400).json({ error: 'Agent ID is required' });
    const result = await agentMemoryService.getPinnedMemories(agentId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Get pinned memories error:', error);
    return res.status(500).json({ error: 'Failed to get pinned memories: ' + error.message });
  }
};

const updateMemory = async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { content, metadata } = req.body;
    if (!memoryId) return res.status(400).json({ error: 'Memory ID is required' });
    if (!content && !metadata) return res.status(400).json({ error: 'At least content or metadata must be provided' });
    const updates = {};
    if (content) updates.content = content;
    if (metadata) updates.metadata = metadata;
    const result = await agentMemoryService.updateMemory(memoryId, updates);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Update memory error:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: 'Memory not found' });
    return res.status(500).json({ error: 'Failed to update memory: ' + error.message });
  }
};

const storeMemoriesBatch = async (req, res) => {
  try {
    const { memories } = req.body;
    if (!Array.isArray(memories)) return res.status(400).json({ error: 'Memories must be an array' });
    if (memories.length === 0) return res.status(400).json({ error: 'At least one memory is required' });
    const memoriesWithUser = memories.map(m => ({ ...m, userId: req.user?.id }));
    const results = await agentMemoryService.storeMemoriesBatch(memoriesWithUser);
    return res.status(201).json(results);
  } catch (error) {
    console.error('Store memories batch error:', error);
    return res.status(500).json({ error: 'Failed to store memories: ' + error.message });
  }
};

const deleteMemories = async (req, res) => {
  try {
    const { agentId, type } = req.body;
    if (!agentId && !type) return res.status(400).json({ error: 'At least agentId or type filter is required' });
    const filter = {};
    if (agentId) filter.agentId = agentId;
    if (type) filter.type = type;
    const result = await agentMemoryService.deleteMemories(filter);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Delete memories error:', error);
    return res.status(500).json({ error: 'Failed to delete memories: ' + error.message });
  }
};

module.exports = {
  storeMemory, getMemories, searchMemories, pinMemory, unpinMemory,
  addTags, removeTags, getMemoryAnalytics, getCorpusMemories, getCorpusStats,
  getPinnedMemories, updateMemory, storeMemoriesBatch, deleteMemories
};
