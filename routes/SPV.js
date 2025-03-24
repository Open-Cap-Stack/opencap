/**
 * SPV Management API Routes
 * Feature: OCAE-211: Implement SPV Management API
 * Previously tracked as OCAE-002
 */
const express = require('express');
const router = express.Router();
const SPVController = require('../controllers/SPV');

// POST /api/spvs - Create a new SPV
router.post('/', SPVController.createSPV);

// GET /api/spvs - Get all SPVs
router.get('/', SPVController.getSPVs);

// GET /api/spvs/status/:status - Get SPVs by status
router.get('/status/:status', SPVController.getSPVsByStatus);

// GET /api/spvs/compliance/:status - Get SPVs by compliance status
router.get('/compliance/:status', SPVController.getSPVsByComplianceStatus);

// GET /api/spvs/parent/:id - Get SPVs by parent company ID
router.get('/parent/:id', SPVController.getSPVsByParentCompany);

// GET /api/spvs/:id - Get an SPV by ID
router.get('/:id', SPVController.getSPVById);

// PUT /api/spvs/:id - Update an SPV by ID
router.put('/:id', SPVController.updateSPV);

// DELETE /api/spvs/:id - Delete an SPV by ID
router.delete('/:id', SPVController.deleteSPV);

module.exports = router;
