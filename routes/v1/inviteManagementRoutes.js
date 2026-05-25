const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../../middleware/authMiddleware");
const { hasRole } = require("../../middleware/rbacMiddleware");
const inviteManagementController = require("../../controllers/inviteManagementController");

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Route for creating an invite
router.post("/", hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), inviteManagementController.createInvite);

// Route for getting all invites
router.get("/", hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), inviteManagementController.getAllInvites);

// Route for getting an invite by ID
router.get("/:id", hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), inviteManagementController.getInviteById);

// Route for updating an invite
router.put("/:id", hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), inviteManagementController.updateInvite);

// Route for deleting an invite
router.delete("/:id", hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), inviteManagementController.deleteInvite);

module.exports = router;
