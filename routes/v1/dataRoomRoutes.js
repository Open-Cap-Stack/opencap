/**
 * DataRoom Routes - v1
 * Issue #194: Build Data Room Backend Infrastructure
 * Issue #655: Data room diff
 * Issue #657: Data room sharing — access audit log + password protection
 * Issue #659: AI deal room Q&A
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const dataRoomController = require('../../controllers/dataRoomController');
const { analyzeDataRoom } = require('../../controllers/dataRoomAnalyzeController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get('/stats', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.getDataRoomStats);
router.get('/:id/external', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.validateExternalAccess);
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.createDataRoom);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.getDataRooms);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.getDataRoomById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.updateDataRoom);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.deleteDataRoom);
router.post('/:id/documents', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.addDocument);
router.delete('/:id/documents/:docId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.removeDocument);
router.post('/:id/permissions', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.managePermissions);
router.get('/:id/activity', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.getActivityLog);
router.post('/:id/export', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.exportAsZip);
router.post('/:id/external-link', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.generateExternalLink);

// Issue #655: Data room diff — document-level changes between two timestamps
router.get('/:id/diff', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.getDiff);

// Issue #657: Access audit log and link access tracking
router.get('/:id/access-log', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.getAccessLog);
router.post('/:id/log-access', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), dataRoomController.logLinkAccess);

// Issue #615: AI gap analysis on data room documents
router.post('/:id/analyze', hasRole(['super_admin', 'admin', 'founder', 'manager']), analyzeDataRoom);

// Issue #616: Structured extraction from data room PDFs into draft OpenCap records
const dataRoomExtractController = require('../../controllers/dataRoomExtractController');
router.post('/:id/extract', hasRole(['super_admin', 'admin', 'founder', 'manager']), dataRoomExtractController.extractRecords);
router.get('/:id/extract', hasRole(['super_admin', 'admin', 'founder', 'manager']), dataRoomExtractController.listExtractions);
router.post('/:id/extract/:extractionId/approve', hasRole(['super_admin', 'admin', 'founder', 'manager']), dataRoomExtractController.approveExtraction);
router.post('/:id/extract/:extractionId/reject', hasRole(['super_admin', 'admin', 'founder', 'manager']), dataRoomExtractController.rejectExtraction);

// Issue #659: AI deal room Q&A
const dealRoomChatService = require('../../services/dealRoomChatService');
router.post('/:id/chat', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), async (req, res) => {
  try {
    const { question, topK } = req.body;
    if (!question) return res.status(400).json({ message: 'question is required' });
    const result = await dealRoomChatService.chat({
      dataRoomId: req.params.id,
      question,
      userId: req.user?.userId,
      topK: topK || 5
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Deal room chat failed:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
