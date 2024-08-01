// routes/fundraisingRoutes.js
const express = require('express');
const router = express.Router();
const fundraisingController = require('../controllers/FundraisingController');

router.post('/fundraising-rounds', fundraisingController.createFundraisingRound);
router.get('/fundraising-rounds', fundraisingController.getFundraisingRounds);
router.get('/fundraising-rounds/:id', fundraisingController.getFundraisingRoundById);
router.put('/fundraising-rounds/:id', fundraisingController.updateFundraisingRound);
router.delete('/fundraising-rounds/:id', fundraisingController.deleteFundraisingRound);

module.exports = router;
