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
const { hasRole } = require('../../middleware/rbacMiddleware');
const investorCommunicationController = require('../../controllers/investorCommunicationController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Investor segmentation (must be before /:id routes)
router.post('/segment', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.segmentInvestors);

// Templates (must be before /:id routes)
router.post('/templates', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.createTemplate);
router.get('/templates', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.getTemplates);

// Preferences (must be before /:id routes)
router.get('/preferences/:investorId/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.getPreferences);
router.put('/preferences/:investorId/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.updatePreferences);
router.post('/preferences/:investorId/:companyId/unsubscribe', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.unsubscribe);

// Communications routes
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.createCommunication);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.getCommunications);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.getCommunicationById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.updateCommunication);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.deleteCommunication);

// Communication actions
router.post('/:id/send', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.sendCommunication);
router.post('/:id/schedule', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.scheduleCommunication);
router.get('/:id/delivery-status', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorCommunicationController.getDeliveryStatus);

module.exports = router;
