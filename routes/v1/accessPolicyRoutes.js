/**
 * Access Policy Routes
 *
 * Defines API endpoints for access policy management
 * Issue #247: Implement Access Policies Endpoints
 *
 * Endpoints:
 * - GET    /api/v1/access-policies              - List all policies
 * - GET    /api/v1/access-policies/templates    - Get policy templates
 * - GET    /api/v1/access-policies/:id          - Get policy by ID
 * - POST   /api/v1/access-policies              - Create new policy
 * - PUT    /api/v1/access-policies/:id          - Update policy
 * - DELETE /api/v1/access-policies/:id          - Delete policy
 */

const express = require('express');
const router = express.Router();
const accessPolicyController = require('../../controllers/accessPolicyController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication to all access policy routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/access-policies/templates
 * @desc Get predefined access policy templates
 * @access Private
 */
router.get('/templates', accessPolicyController.getAccessPolicyTemplates);

/**
 * @route GET /api/v1/access-policies
 * @desc Get all access policies for the authenticated user's company
 * @access Private
 */
router.get('/', accessPolicyController.getAllAccessPolicies);

/**
 * @route GET /api/v1/access-policies/:id
 * @desc Get access policy by ID
 * @access Private
 */
router.get('/:id', accessPolicyController.getAccessPolicyById);

/**
 * @route POST /api/v1/access-policies
 * @desc Create a new access policy
 * @access Private
 * @body {
 *   name: string,
 *   description?: string,
 *   resourceType: string,
 *   actions: string[],
 *   conditions?: object,
 *   status?: 'active' | 'inactive'
 * }
 */
router.post('/', accessPolicyController.createAccessPolicy);

/**
 * @route PUT /api/v1/access-policies/:id
 * @desc Update an existing access policy
 * @access Private
 * @body Partial policy object with fields to update
 */
router.put('/:id', accessPolicyController.updateAccessPolicy);

/**
 * @route DELETE /api/v1/access-policies/:id
 * @desc Delete an access policy
 * @access Private
 */
router.delete('/:id', accessPolicyController.deleteAccessPolicy);

module.exports = router;
