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
const dataRoomController = require('../../controllers/dataRoomController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get('/stats', dataRoomController.getDataRoomStats);
router.get('/:id/external', dataRoomController.validateExternalAccess);
router.post('/', dataRoomController.createDataRoom);
router.get('/', dataRoomController.getDataRooms);
router.get('/:id', dataRoomController.getDataRoomById);
router.put('/:id', dataRoomController.updateDataRoom);
router.delete('/:id', dataRoomController.deleteDataRoom);
router.post('/:id/documents', dataRoomController.addDocument);
router.delete('/:id/documents/:docId', dataRoomController.removeDocument);
router.post('/:id/permissions', dataRoomController.managePermissions);
router.get('/:id/activity', dataRoomController.getActivityLog);
router.post('/:id/export', dataRoomController.exportAsZip);
router.post('/:id/external-link', dataRoomController.generateExternalLink);

// Issue #655: Data room diff — document-level changes between two timestamps
router.get('/:id/diff', dataRoomController.getDiff);

// Issue #657: Access audit log and link access tracking
router.get('/:id/access-log', dataRoomController.getAccessLog);
router.post('/:id/log-access', dataRoomController.logLinkAccess);

// Issue #659: AI deal room Q&A
const dealRoomChatService = require('../../services/dealRoomChatService');
router.post('/:id/chat', async (req, res) => {
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
