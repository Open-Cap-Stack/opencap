const express = require('express');
const router = express.Router();
const issuerController = require('../controllers/issuerController');

// List all issuers with pagination and filtering
router.get('/', issuerController.listIssuers);

// Get a specific issuer by ID
router.get('/:issuerId', issuerController.getIssuer);

// Create a new issuer
router.post('/', issuerController.createIssuer);

// Update an existing issuer by ID
router.put('/:issuerId', issuerController.updateIssuer);

// Delete an issuer by ID (consider soft-deletion)
router.delete('/:issuerId', issuerController.deleteIssuer);

module.exports = router;
