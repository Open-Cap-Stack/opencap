const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById,
} = require('../../controllers/shareClassController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

router.get('/', getAllShareClasses);
router.post('/', createShareClass);
router.get('/:id', getShareClassById);
router.put('/:id', updateShareClassById);
router.delete('/:id', deleteShareClassById);

module.exports = router;
