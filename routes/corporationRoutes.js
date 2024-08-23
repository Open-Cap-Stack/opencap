const express = require('express');
const router = express.Router();
const corporationController = require('../controllers/CorporationController');

router.get('/corporations', corporationController.listCorporations);
router.post('/corporations', corporationController.createCorporation);
router.put('/corporations/:id', corporationController.updateCorporation);
router.delete('/corporations/:id', corporationController.deleteCorporation);

module.exports = router;
