/**
 * Waterfall Analysis Routes
 * Issue #56: Create waterfall analysis engine
 *
 * API routes for waterfall analysis management
 */
const express = require('express');
const router = express.Router();
const waterfallAnalysisController = require('../../controllers/waterfallAnalysisController');

// CRUD operations
router.post('/waterfall-analyses', waterfallAnalysisController.createAnalysis);
router.get('/waterfall-analyses', waterfallAnalysisController.getAnalyses);
router.get('/waterfall-analyses/:id', waterfallAnalysisController.getAnalysis);
router.put('/waterfall-analyses/:id', waterfallAnalysisController.updateAnalysis);
router.delete('/waterfall-analyses/:id', waterfallAnalysisController.deleteAnalysis);

// Calculation and analysis
router.post('/waterfall-analyses/:id/run', waterfallAnalysisController.runAnalysis);
router.post('/waterfall-analyses/compare', waterfallAnalysisController.compareScenarios);

// Visualization and export
router.get('/waterfall-analyses/:id/visualization', waterfallAnalysisController.getVisualizationData);
router.get('/waterfall-analyses/:id/export', waterfallAnalysisController.exportResults);

// Clone and status management
router.post('/waterfall-analyses/:id/clone', waterfallAnalysisController.cloneAnalysis);
router.post('/waterfall-analyses/:id/finalize', waterfallAnalysisController.finalizeAnalysis);
router.post('/waterfall-analyses/:id/archive', waterfallAnalysisController.archiveAnalysis);

module.exports = router;
