const express = require('express');
const router = express.Router();
const {
  createShareClass,
  getAllShareClasses,
  getShareClassById,
  updateShareClassById,
  deleteShareClassById
} = require('../controllers/shareClassController');

router.post('/', createShareClass);
router.get('/', getAllShareClasses);
router.get('/:id', getShareClassById);
router.put('/:id', updateShareClassById);
router.delete('/:id', deleteShareClassById);

module.exports = router;
