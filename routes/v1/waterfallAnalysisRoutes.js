/**
 * Waterfall Analysis Routes
 * Issue #56: Create waterfall analysis engine
 *
 * API routes for waterfall analysis management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const waterfallAnalysisController = require('../../controllers/waterfallAnalysisController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD operations
router.post('/waterfall-analyses', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.createAnalysis);
router.get('/waterfall-analyses', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.getAnalyses);
router.get('/waterfall-analyses/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.getAnalysis);
router.put('/waterfall-analyses/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.updateAnalysis);
router.delete('/waterfall-analyses/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.deleteAnalysis);

// Calculation and analysis
router.post('/waterfall-analyses/:id/run', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.runAnalysis);
router.post('/waterfall-analyses/compare', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.compareScenarios);

// Visualization and export
router.get('/waterfall-analyses/:id/visualization', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.getVisualizationData);
router.get('/waterfall-analyses/:id/export', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.exportResults);

// Clone and status management
router.post('/waterfall-analyses/:id/clone', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.cloneAnalysis);
router.post('/waterfall-analyses/:id/finalize', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.finalizeAnalysis);
router.post('/waterfall-analyses/:id/archive', hasRole(['super_admin', 'admin', 'founder', 'manager']), waterfallAnalysisController.archiveAnalysis);

module.exports = router;
