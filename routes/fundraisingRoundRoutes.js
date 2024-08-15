const express = require('express');
const router = express.Router();
const fundraisingRoundController = require('../controllers/fundraisingRoundController');

router.post('/fundraising-rounds', fundraisingRoundController.createFundraisingRound);
router.get('/fundraising-rounds', fundraisingRoundController.getFundraisingRounds);
router.get('/fundraising-rounds/:id', fundraisingRoundController.getFundraisingRoundById);
router.put('/fundraising-rounds/:id', fundraisingRoundController.updateFundraisingRound);
router.delete('/fundraising-rounds/:id', fundraisingRoundController.deleteFundraisingRound);

module.exports = router;
