/**
 * Investor Communication Routes
 * Issue #91: Build Investor Communication System
 *
 * API routes for investor communications:
 * - Communications CRUD
 * - Send and schedule communications
 * - Investor segmentation
 * - Delivery tracking
 * - Templates
 * - Preferences
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const investorCommunicationController = require('../../controllers/investorCommunicationController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Investor segmentation (must be before /:id routes)
router.post('/segment', investorCommunicationController.segmentInvestors);

// Templates (must be before /:id routes)
router.post('/templates', investorCommunicationController.createTemplate);
router.get('/templates', investorCommunicationController.getTemplates);

// Preferences (must be before /:id routes)
router.get('/preferences/:investorId/:companyId', investorCommunicationController.getPreferences);
router.put('/preferences/:investorId/:companyId', investorCommunicationController.updatePreferences);
router.post('/preferences/:investorId/:companyId/unsubscribe', investorCommunicationController.unsubscribe);

// Communications routes
router.post('/', investorCommunicationController.createCommunication);
router.get('/', investorCommunicationController.getCommunications);
router.get('/:id', investorCommunicationController.getCommunicationById);
router.put('/:id', investorCommunicationController.updateCommunication);
router.delete('/:id', investorCommunicationController.deleteCommunication);

// Communication actions
router.post('/:id/send', investorCommunicationController.sendCommunication);
router.post('/:id/schedule', investorCommunicationController.scheduleCommunication);
router.get('/:id/delivery-status', investorCommunicationController.getDeliveryStatus);

module.exports = router;
