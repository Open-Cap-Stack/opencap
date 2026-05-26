const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const { auditAction } = require('../../middleware/auditLog');
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
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('create_share_class', 'share_class'), createShareClass);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), getShareClassById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), auditAction('update_share_class', 'share_class'), updateShareClassById);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder']), auditAction('delete_share_class', 'share_class'), deleteShareClassById);

module.exports = router;
