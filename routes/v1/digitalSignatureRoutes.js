/**
 * Digital Signature Routes
 * Issue #100: Build Digital Signature Workflow
 *
 * API routes for digital signature management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const digitalSignatureController = require('../../controllers/digitalSignatureController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD operations
router.post('/digital-signatures', digitalSignatureController.createSignatureRequest);
router.get('/digital-signatures', digitalSignatureController.getSignatureRequests);
router.get('/digital-signatures/expiring', digitalSignatureController.getExpiringRequests);
router.get('/digital-signatures/by-signer', digitalSignatureController.getRequestsBySignerEmail);
router.get('/digital-signatures/:id', digitalSignatureController.getSignatureRequestById);
router.put('/digital-signatures/:id', digitalSignatureController.updateSignatureRequest);
router.delete('/digital-signatures/:id', digitalSignatureController.deleteSignatureRequest);

// Status and audit
router.get('/digital-signatures/:id/status', digitalSignatureController.getSignatureStatus);
router.get('/digital-signatures/:id/audit-trail', digitalSignatureController.getAuditTrail);

// Signing operations
router.post('/digital-signatures/:id/send', digitalSignatureController.sendSignatureRequest);
router.post('/digital-signatures/:id/view', digitalSignatureController.recordView);
router.post('/digital-signatures/:id/sign', digitalSignatureController.recordSignature);
router.post('/digital-signatures/:id/decline', digitalSignatureController.recordDecline);
router.post('/digital-signatures/:id/cancel', digitalSignatureController.cancelSignatureRequest);
router.post('/digital-signatures/:id/void', digitalSignatureController.voidSignatureRequest);
router.post('/digital-signatures/:id/reminder', digitalSignatureController.sendReminder);

// Signing link
router.get('/digital-signatures/:id/signing-link', digitalSignatureController.getSigningLink);

// Document download
router.get('/digital-signatures/:id/download', digitalSignatureController.downloadSignedDocument);

// Webhook callback for external providers
router.post('/digital-signatures/webhook', digitalSignatureController.handleProviderCallback);

// Admin operations
router.post('/digital-signatures/process-expired', digitalSignatureController.processExpiredRequests);

module.exports = router;
