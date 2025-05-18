const express = require('express');
const router = express.Router();
const fundraisingRoundController = require('../controllers/fundraisingRoundController');

router.post('/', fundraisingRoundController.createFundraisingRound);
router.get('/', fundraisingRoundController.getFundraisingRounds);
router.get('/:id', fundraisingRoundController.getFundraisingRoundById);
router.put('/:id', fundraisingRoundController.updateFundraisingRound);
router.delete('/:id', fundraisingRoundController.deleteFundraisingRound);

module.exports = router;
