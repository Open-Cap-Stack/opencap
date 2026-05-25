/**
 * Investment Similarity Routes - V1
 *
 * [Feature] OCAE-024: Investment similarity matching endpoints
 */

const express = require('express');
const router = express.Router();
const investmentSimilarityController = require('../../controllers/investmentSimilarityController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Analytics and cluster endpoints (no specific ID)
router.get('/analytics', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.getAnalytics);
router.get('/clusters', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.getClusters);
router.get('/recommendations', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.getRecommendations);

// Batch operations
router.post('/batch/embed', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.batchEmbedInvestments);

// Investment-specific operations
router.post('/:id/embed', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.createInvestmentEmbedding);
router.get('/:id/similar', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.findSimilarInvestments);
router.delete('/:id/embedding', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investmentSimilarityController.deleteEmbedding);

module.exports = router;
