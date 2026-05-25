const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById,
} = require('../../controllers/shareClassController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), getAllShareClasses);
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), createShareClass);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), getShareClassById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), updateShareClassById);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder']), deleteShareClassById);

module.exports = router;
