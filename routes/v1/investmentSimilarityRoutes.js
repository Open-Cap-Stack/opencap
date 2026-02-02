/**
 * Investment Similarity Routes - V1
 *
 * [Feature] OCAE-024: Investment similarity matching endpoints
 */

const express = require('express');
const router = express.Router();
const investmentSimilarityController = require('../../controllers/investmentSimilarityController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Analytics and cluster endpoints (no specific ID)
router.get('/analytics', authenticateToken, investmentSimilarityController.getAnalytics);
router.get('/clusters', authenticateToken, investmentSimilarityController.getClusters);
router.get('/recommendations', authenticateToken, investmentSimilarityController.getRecommendations);

// Batch operations
router.post('/batch/embed', authenticateToken, investmentSimilarityController.batchEmbedInvestments);

// Investment-specific operations
router.post('/:id/embed', authenticateToken, investmentSimilarityController.createInvestmentEmbedding);
router.get('/:id/similar', authenticateToken, investmentSimilarityController.findSimilarInvestments);
router.delete('/:id/embedding', authenticateToken, investmentSimilarityController.deleteEmbedding);

module.exports = router;
