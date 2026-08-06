const express = require('express');
const router = express.Router();
const newsletterController = require('../../controllers/newsletterController');

router.post('/subscribe', newsletterController.subscribe);

module.exports = router;
