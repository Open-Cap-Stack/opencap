const express = require("express");
const router = express.Router();
const {
  createActivity,
  getActivities,
  getActivityById,
  updateActivityById,
  deleteActivity,
} = require("../controllers/activitesController.js");

router.post("/", createActivity);
router.get("/", getActivities);
router.get("/:id", getActivityById);
router.put("/:id", updateActivityById);
router.delete("/:id", deleteActivity);

module.exports = router;
