/**
 * Agent Memory Routes
 *
 * [Feature] Issue #27: Implement agent memory for AI features
 * API routes for agent memory operations
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const agentMemoryController = require('../../controllers/agentMemoryController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.post('/', hasRole(['super_admin', 'admin']), agentMemoryController.storeMemory);
router.get('/', hasRole(['super_admin', 'admin']), agentMemoryController.getMemories);
router.post('/search', hasRole(['super_admin', 'admin']), agentMemoryController.searchMemories);
router.post('/batch', hasRole(['super_admin', 'admin']), agentMemoryController.storeMemoriesBatch);
router.get('/analytics', hasRole(['super_admin', 'admin']), agentMemoryController.getMemoryAnalytics);
router.get('/pinned', hasRole(['super_admin', 'admin']), agentMemoryController.getPinnedMemories);
router.get('/corpus/:companyId', hasRole(['super_admin', 'admin']), agentMemoryController.getCorpusMemories);
router.get('/corpus/:companyId/stats', hasRole(['super_admin', 'admin']), agentMemoryController.getCorpusStats);
router.put('/:memoryId', hasRole(['super_admin', 'admin']), agentMemoryController.updateMemory);
router.put('/:memoryId/pin', hasRole(['super_admin', 'admin']), agentMemoryController.pinMemory);
router.delete('/:memoryId/pin', hasRole(['super_admin', 'admin']), agentMemoryController.unpinMemory);
router.post('/:memoryId/tags', hasRole(['super_admin', 'admin']), agentMemoryController.addTags);
router.delete('/:memoryId/tags', hasRole(['super_admin', 'admin']), agentMemoryController.removeTags);
router.delete('/', hasRole(['super_admin', 'admin']), agentMemoryController.deleteMemories);

module.exports = router;
