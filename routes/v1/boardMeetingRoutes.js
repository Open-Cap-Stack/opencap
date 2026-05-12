/**
 * Board Meeting Routes
 *
 * API routes for board meeting management.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const databaseAdapter = require('../../services/databaseAdapter');

router.use(authenticateToken);

// GET /api/v1/board-meetings
router.get('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    const meetings = await databaseAdapter.find('BoardMeeting', { companyId });
    res.status(200).json(meetings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/board-meetings
router.post('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if (!req.body.title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!req.body.date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const meetingData = {
      ...req.body,
      companyId,
      status: req.body.status || 'scheduled',
      createdBy: req.user?.id || req.user?._id,
    };

    const saved = await databaseAdapter.create('BoardMeeting', meetingData);
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/board-meetings/:id
router.get('/:id', async (req, res) => {
  try {
    const meeting = await databaseAdapter.findById('BoardMeeting', req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Board meeting not found' });
    }
    res.status(200).json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/board-meetings/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await databaseAdapter.findByIdAndUpdate(
      'BoardMeeting',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Board meeting not found' });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/v1/board-meetings/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await databaseAdapter.findByIdAndDelete('BoardMeeting', req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Board meeting not found' });
    }
    res.status(200).json({ message: 'Board meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
