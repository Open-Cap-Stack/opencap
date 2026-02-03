/**
 * MessageTrigger Routes
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * API routes for message trigger management.
 */

const express = require('express');
const messageTriggerController = require('../../controllers/messageTriggerController');
const router = express.Router();

/**
 * GET /api/v1/message-triggers/event-types
 * Get supported event types
 */
router.get('/event-types', messageTriggerController.getEventTypes);

/**
 * GET /api/v1/message-triggers/trigger-types
 * Get supported trigger types
 */
router.get('/trigger-types', messageTriggerController.getTriggerTypes);

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
router.post('/', messageTriggerController.createTrigger);

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
router.get('/', messageTriggerController.getTriggers);

/**
 * GET /api/v1/message-triggers/:id
 * Get a trigger by ID
 */
router.get('/:id', messageTriggerController.getTriggerById);

/**
 * PUT /api/v1/message-triggers/:id
 * Update a trigger
 */
router.put('/:id', messageTriggerController.updateTrigger);

/**
 * DELETE /api/v1/message-triggers/:id
 * Delete a trigger
 */
router.delete('/:id', messageTriggerController.deleteTrigger);

/**
 * POST /api/v1/message-triggers/:id/activate
 * Activate a trigger
 */
router.post('/:id/activate', messageTriggerController.activateTrigger);

/**
 * POST /api/v1/message-triggers/:id/deactivate
 * Deactivate a trigger
 */
router.post('/:id/deactivate', messageTriggerController.deactivateTrigger);

/**
 * POST /api/v1/message-triggers/:id/test
 * Test a trigger with sample payload
 *
 * Body:
 * - testPayload: object (variables to test)
 */
router.post('/:id/test', messageTriggerController.testTrigger);

/**
 * GET /api/v1/message-triggers/:id/history
 * Get trigger execution history
 *
 * Query Parameters:
 * - limit: Max results (default: 50, max: 100)
 * - offset: Results to skip
 */
router.get('/:id/history', messageTriggerController.getTriggerHistory);

/**
 * POST /api/v1/message-triggers/:id/fire
 * Manually fire a trigger
 *
 * Body:
 * - payload: object (event payload)
 * - recipientIds: array (optional, override recipients)
 */
router.post('/:id/fire', messageTriggerController.fireManualTrigger);

module.exports = router;
