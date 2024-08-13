const express = require('express');
const router = express.Router();
const {
  getAllStakeholders,
  createStakeholder,
  getStakeholderById,
  updateStakeholderById,
  deleteStakeholderById
} = require('../controllers/stakeholderController');

router.get('/', getAllStakeholders);
router.post('/', createStakeholder);
router.get('/:id', getStakeholderById);
router.put('/:id', updateStakeholderById);
router.delete('/:id', deleteStakeholderById);

module.exports = router;
