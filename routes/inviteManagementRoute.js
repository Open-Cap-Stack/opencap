const express = require("express");
const router = express.Router();
const inviteManagementController = require("../controllers/inviteManagementController");

// Route for creating an invite
router.post("/", inviteManagementController.createInvite);

// Route for getting all invites
router.get("/", inviteManagementController.getAllInvites);

// Route for getting an invite by ID
router.get("/:id", inviteManagementController.getInviteById);

// Route for updating an invite
router.put("/:id", inviteManagementController.updateInvite);

// Route for deleting an invite
router.delete("/:id", inviteManagementController.deleteInvite);

module.exports = router;
