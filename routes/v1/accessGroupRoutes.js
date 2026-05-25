/**
 * Access Group Routes
 *
 * Defines API endpoints for access group management
 * Issue #274: Implement Access Groups and Policy Management endpoints
 *
 * Endpoints:
 * - GET    /api/v1/access-groups              - List all groups
 * - GET    /api/v1/access-groups/:id          - Get group by ID
 * - POST   /api/v1/access-groups              - Create new group
 * - PUT    /api/v1/access-groups/:id          - Update group
 * - DELETE /api/v1/access-groups/:id          - Delete group
 */

const express = require('express');
const router = express.Router();
const accessGroupController = require('../../controllers/accessGroupController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication to all access group routes
router.use(authenticateToken);

/**
 * @route GET /api/v1/access-groups
 * @desc Get all access groups for the authenticated user's company
 * @access Private
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), accessGroupController.getAllAccessGroups);

/**
 * @route GET /api/v1/access-groups/:id
 * @desc Get access group by ID
 * @access Private
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), accessGroupController.getAccessGroupById);

/**
 * @route POST /api/v1/access-groups
 * @desc Create a new access group
 * @access Private
 * @body {
 *   name: string,
 *   description?: string
 * }
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), accessGroupController.createAccessGroup);

/**
 * @route PUT /api/v1/access-groups/:id
 * @desc Update an existing access group
 * @access Private
 * @body Partial group object with fields to update
 */
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), accessGroupController.updateAccessGroup);

/**
 * @route DELETE /api/v1/access-groups/:id
 * @desc Delete an access group
 * @access Private
 */
router.delete('/:id', hasRole(['super_admin', 'admin']), accessGroupController.deleteAccessGroup);

module.exports = router;
