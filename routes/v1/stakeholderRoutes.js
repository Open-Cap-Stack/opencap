/**
 * Stakeholder Routes
 * Migrated to use ZeroDB model
 */

const express = require('express');
const router = express.Router();
const Stakeholder = require('../../models/Stakeholder');
const bulkReportsController = require('../../controllers/bulkReportsController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication to all stakeholder routes
router.use(authenticateToken);

/**
 * POST /api/v1/stakeholders/reports/bulk
 * Generate bulk reports for multiple stakeholders
 */
router.post('/reports/bulk', bulkReportsController.generateBulkReports);

/**
 * GET /api/v1/stakeholders
 * Get all stakeholders
 */
router.get('/', async (req, res) => {
  try {
    const stakeholders = await Stakeholder.find({});
    res.status(200).json(stakeholders || []);
  } catch (error) {
    console.error('Error fetching stakeholders:', error);
    res.status(500).json({ error: 'Error fetching stakeholders' });
  }
});

/**
 * GET /api/v1/stakeholders/:id
 * Get stakeholder by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findOne({ stakeholderId: req.params.id });
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.status(200).json(stakeholder);
  } catch (error) {
    console.error('Error fetching stakeholder:', error);
    res.status(500).json({ error: 'Error fetching stakeholder' });
  }
});

/**
 * POST /api/v1/stakeholders
 * Create a new stakeholder
 */
router.post('/', async (req, res) => {
  try {
    const stakeholder = await Stakeholder.create(req.body);
    res.status(201).json(stakeholder);
  } catch (error) {
    console.error('Error creating stakeholder:', error);
    res.status(500).json({ error: 'Error creating stakeholder' });
  }
});

/**
 * PUT /api/v1/stakeholders/:id
 * Update a stakeholder
 */
router.put('/:id', async (req, res) => {
  try {
    const result = await Stakeholder.findOneAndUpdate(
      { stakeholderId: req.params.id },
      { $set: req.body },
      { returnDocument: 'after' }
    );
    if (!result) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating stakeholder:', error);
    res.status(500).json({ error: 'Error updating stakeholder' });
  }
});

/**
 * DELETE /api/v1/stakeholders/:id
 * Delete a stakeholder
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await Stakeholder.findOneAndDelete({ stakeholderId: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.status(200).json({ message: 'Stakeholder deleted successfully' });
  } catch (error) {
    console.error('Error deleting stakeholder:', error);
    res.status(500).json({ error: 'Error deleting stakeholder' });
  }
});

module.exports = router;
