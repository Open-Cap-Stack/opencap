/**
 * Agent Memory Routes
 *
 * [Feature] Issue #27: Implement agent memory for AI features
 * API routes for agent memory operations
 */

const express = require('express');
const router = express.Router();
const agentMemoryController = require('../../controllers/agentMemoryController');

router.post('/', agentMemoryController.storeMemory);
router.get('/', agentMemoryController.getMemories);
router.post('/search', agentMemoryController.searchMemories);
router.post('/batch', agentMemoryController.storeMemoriesBatch);
router.get('/analytics', agentMemoryController.getMemoryAnalytics);
router.get('/pinned', agentMemoryController.getPinnedMemories);
router.get('/corpus/:companyId', agentMemoryController.getCorpusMemories);
router.get('/corpus/:companyId/stats', agentMemoryController.getCorpusStats);
router.put('/:memoryId', agentMemoryController.updateMemory);
router.put('/:memoryId/pin', agentMemoryController.pinMemory);
router.delete('/:memoryId/pin', agentMemoryController.unpinMemory);
router.post('/:memoryId/tags', agentMemoryController.addTags);
router.delete('/:memoryId/tags', agentMemoryController.removeTags);
router.delete('/', agentMemoryController.deleteMemories);

module.exports = router;
