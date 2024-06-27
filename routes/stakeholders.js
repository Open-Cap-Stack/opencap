const express = require('express');
const router = express.Router();
const {
  createStakeholder,
  getAllStakeholders,
  getStakeholderById,
  updateStakeholderById,
  deleteStakeholderById
} = require('../controllers/stakeholderController');

router.post('/', createStakeholder);
router.get('/', getAllStakeholders);
router.get('/:id', getStakeholderById);
router.put('/:id', updateStakeholderById);
router.delete('/:id', deleteStakeholderById);

module.exports = router;
