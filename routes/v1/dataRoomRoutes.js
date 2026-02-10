/**
 * DataRoom Routes - v1
 * Issue #194: Build Data Room Backend Infrastructure
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

module.exports = router;
