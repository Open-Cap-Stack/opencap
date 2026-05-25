/**
 * Digital Signature Routes
 * Issue #100: Build Digital Signature Workflow
 *
 * API routes for digital signature management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const digitalSignatureController = require('../../controllers/digitalSignatureController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD operations
router.post('/digital-signatures', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.createSignatureRequest);
router.get('/digital-signatures', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getSignatureRequests);
router.get('/digital-signatures/expiring', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getExpiringRequests);
router.get('/digital-signatures/by-signer', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getRequestsBySignerEmail);
router.get('/digital-signatures/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getSignatureRequestById);
router.put('/digital-signatures/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.updateSignatureRequest);
router.delete('/digital-signatures/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.deleteSignatureRequest);

// Status and audit
router.get('/digital-signatures/:id/status', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getSignatureStatus);
router.get('/digital-signatures/:id/audit-trail', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getAuditTrail);

// Signing operations
router.post('/digital-signatures/:id/send', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.sendSignatureRequest);
router.post('/digital-signatures/:id/view', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.recordView);
router.post('/digital-signatures/:id/sign', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.recordSignature);
router.post('/digital-signatures/:id/decline', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.recordDecline);
router.post('/digital-signatures/:id/cancel', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.cancelSignatureRequest);
router.post('/digital-signatures/:id/void', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.voidSignatureRequest);
router.post('/digital-signatures/:id/reminder', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.sendReminder);

// Signing link
router.get('/digital-signatures/:id/signing-link', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.getSigningLink);

// Document download
router.get('/digital-signatures/:id/download', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.downloadSignedDocument);

// Webhook callback for external providers
router.post('/digital-signatures/webhook', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.handleProviderCallback);

// Admin operations
router.post('/digital-signatures/process-expired', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), digitalSignatureController.processExpiredRequests);

module.exports = router;
