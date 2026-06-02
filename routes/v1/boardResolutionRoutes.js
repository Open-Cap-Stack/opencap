/**
 * Board Resolution Routes
 *
 * CRUD routes for board resolutions with real ZeroDB persistence.
 * Replaces the stubs in app.js.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const databaseAdapter = require('../../services/databaseAdapter');

router.use(authenticateToken);

const BOARD_ROLES = ['super_admin', 'admin', 'founder', 'manager'];

// GET /api/v1/board-resolutions
router.get('/', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    const resolutions = await databaseAdapter.find('BoardResolution', { companyId });
    res.status(200).json(resolutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/board-resolutions
router.post('/', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if (!req.body.title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const resolutionData = {
      ...req.body,
      companyId,
      status: req.body.status || 'pending',
      votesFor: parseInt(req.body.votesFor) || 0,
      votesAgainst: parseInt(req.body.votesAgainst) || 0,
      votesAbstained: parseInt(req.body.votesAbstained) || 0,
      createdBy: req.user?.userId || req.user?.id,
      createdAt: new Date().toISOString(),
    };

    const saved = await databaseAdapter.create('BoardResolution', resolutionData);
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/board-resolutions/:id
router.get('/:id', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const resolution = await databaseAdapter.findById('BoardResolution', req.params.id);
    if (!resolution) {
      return res.status(404).json({ message: 'Resolution not found' });
    }
    res.status(200).json(resolution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/board-resolutions/:id
router.put('/:id', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const updated = await databaseAdapter.findByIdAndUpdate(
      'BoardResolution',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Resolution not found' });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/v1/board-resolutions/:id
router.delete('/:id', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const deleted = await databaseAdapter.findByIdAndDelete('BoardResolution', req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Resolution not found' });
    }
    res.status(200).json({ message: 'Resolution deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
