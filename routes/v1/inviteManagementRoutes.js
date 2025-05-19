const express = require("express");
const router = express.Router();
const inviteManagementController = require("../../controllers/inviteManagementController");

// Route for creating an invite
router.post("/invites", inviteManagementController.createInvite);

// Route for getting all invites
router.get("/invites", inviteManagementController.getAllInvites);

// Route for getting an invite by ID
router.get("/invites/:id", inviteManagementController.getInviteById);

// Route for updating an invite
router.put("/invites/:id", inviteManagementController.updateInvite);

// Route for deleting an invite
router.delete("/invites/:id", inviteManagementController.deleteInvite);

module.exports = router;
