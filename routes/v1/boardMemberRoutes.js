/**
 * Board Member Routes
 *
 * CRUD routes for board members — separate from cap table stakeholders.
 * Board members are chosen by founders and have governance roles
 * (Chairman, Director, Observer, Independent Director, Lead Director).
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const databaseAdapter = require('../../services/databaseAdapter');

router.use(authenticateToken);

const BOARD_ROLES = ['super_admin', 'admin', 'founder', 'manager'];

// GET /api/v1/board-members
router.get('/', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.query.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    const members = await databaseAdapter.find('BoardMember', { companyId });
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/board-members
router.post('/', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }
    if (!req.body.firstName || !req.body.lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const memberData = {
      ...req.body,
      companyId,
      name: `${req.body.firstName} ${req.body.lastName}`.trim(),
      role: req.body.role || 'Director',
      status: 'active',
      addedBy: req.user?.userId || req.user?.id,
      createdAt: new Date().toISOString(),
    };

    const saved = await databaseAdapter.create('BoardMember', memberData);
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/v1/board-members/:id
router.get('/:id', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const member = await databaseAdapter.findById('BoardMember', req.params.id);
    if (!member) {
      return res.status(404).json({ message: 'Board member not found' });
    }
    res.status(200).json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/v1/board-members/:id
router.put('/:id', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const updated = await databaseAdapter.findByIdAndUpdate(
      'BoardMember',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Board member not found' });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/v1/board-members/:id
router.delete('/:id', hasRole(BOARD_ROLES), async (req, res) => {
  try {
    const deleted = await databaseAdapter.findByIdAndDelete('BoardMember', req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Board member not found' });
    }
    res.status(200).json({ message: 'Board member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
