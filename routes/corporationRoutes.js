const express = require('express');
const router = express.Router();
const corporationController = require('../controllers/corporationController');

// List Corporations
router.get('/corporations', corporationController.listCorporations);

// Create New Corporation
router.post('/corporations', corporationController.createCorporation);

// Update Corporation Details
router.put('/corporations/:id', corporationController.updateCorporation);

// Delete Corporation
router.delete('/corporations/:id', corporationController.deleteCorporation);

module.exports = router;
