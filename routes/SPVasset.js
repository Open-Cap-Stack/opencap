/**
 * SPV Asset Management API Routes
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 */
const express = require('express');
const SPVAsset = require('../models/SPVasset');
const router = express.Router();
const mongoose = require('mongoose');
const SPVAssetController = require('../controllers/SPVasset');

// POST /api/spvassets - Create a new SPVAsset
router.post('/', SPVAssetController.createSPVAsset);

// GET /api/spvassets - Get all SPVAssets
router.get('/', SPVAssetController.getSPVAssets);

// GET /api/spvassets/spv/:spvId - Get all assets for a specific SPV
router.get('/spv/:spvId', SPVAssetController.getAssetsBySPVId);

// GET /api/spvassets/valuation/spv/:spvId - Calculate total valuation for a specific SPV
router.get('/valuation/spv/:spvId', SPVAssetController.getSPVValuation);

// GET /api/spvassets/valuation/type/:type - Calculate total valuation by asset type
router.get('/valuation/type/:type', SPVAssetController.getAssetTypeValuation);

// GET /api/spvassets/:id - Get an SPV Asset by ID
router.get('/:id', SPVAssetController.getSPVAssetById);

// PUT /api/spvassets/:id - Update an SPV Asset by ID
router.put('/:id', SPVAssetController.updateSPVAsset);

// DELETE /api/spvassets/:id - Delete an SPVAsset by ID
router.delete('/:id', SPVAssetController.deleteSPVAsset);

module.exports = router;
