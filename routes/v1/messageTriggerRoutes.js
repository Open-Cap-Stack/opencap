/**
 * MessageTrigger Routes
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * API routes for message trigger management.
 */

const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const messageTriggerController = require('../../controllers/messageTriggerController');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/v1/message-triggers/event-types
 * Get supported event types
 */
router.get('/event-types', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.getEventTypes);

/**
 * GET /api/v1/message-triggers/trigger-types
 * Get supported trigger types
 */
router.get('/trigger-types', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.getTriggerTypes);

/**
 * POST /api/v1/message-triggers
 * Create a new message trigger
 *
 * Body:
 * - triggerId: string (required, unique)
 * - name: string (required)
 * - eventType: string (required)
 * - triggerType: string (required)
 * - messageTemplate: object (required)
 * - triggerRules: object (optional)
 * - schedule: object (optional)
 * - recipients: object (optional)
 * - deliveryChannels: array (optional, default: ['in_app'])
 * - isActive: boolean (optional, default: true)
 * - companyId: string (optional)
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.createTrigger);

/**
 * GET /api/v1/message-triggers
 * Get all triggers with optional filtering
 *
 * Query Parameters:
 * - eventType: Filter by event type
 * - triggerType: Filter by trigger type
 * - companyId: Filter by company
 * - isActive: Filter by active status (true/false)
 * - search: Search by name or triggerId
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.getTriggers);

/**
 * GET /api/v1/message-triggers/:id
 * Get a trigger by ID
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.getTriggerById);

/**
 * PUT /api/v1/message-triggers/:id
 * Update a trigger
 */
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.updateTrigger);

/**
 * DELETE /api/v1/message-triggers/:id
 * Delete a trigger
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.deleteTrigger);

/**
 * POST /api/v1/message-triggers/:id/activate
 * Activate a trigger
 */
router.post('/:id/activate', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.activateTrigger);

/**
 * POST /api/v1/message-triggers/:id/deactivate
 * Deactivate a trigger
 */
router.post('/:id/deactivate', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.deactivateTrigger);

/**
 * POST /api/v1/message-triggers/:id/test
 * Test a trigger with sample payload
 *
 * Body:
 * - testPayload: object (variables to test)
 */
router.post('/:id/test', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.testTrigger);

/**
 * GET /api/v1/message-triggers/:id/history
 * Get trigger execution history
 *
 * Query Parameters:
 * - limit: Max results (default: 50, max: 100)
 * - offset: Results to skip
 */
router.get('/:id/history', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.getTriggerHistory);

/**
 * POST /api/v1/message-triggers/:id/fire
 * Manually fire a trigger
 *
 * Body:
 * - payload: object (event payload)
 * - recipientIds: array (optional, override recipients)
 */
router.post('/:id/fire', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), messageTriggerController.fireManualTrigger);

module.exports = router;
