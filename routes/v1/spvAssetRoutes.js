/**
 * SPV Asset Management API Routes
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 */
const express = require('express');
const SPVAsset = require('../../models/SPVAssetModel');
const router = express.Router();
const mongoose = require('mongoose');
const SPVAssetController = require('../../controllers/SPVasset');
const jwtAuth = require('../../middleware/jwtAuth');
const responseDebugger = require('../../middleware/responseDebugger');

// Apply authentication middleware to all routes
router.use(jwtAuth.authenticate);

// Role-based access control - Admin only
const adminOnly = jwtAuth.authenticateRole(['Admin']);

// POST /api/spvassets - Create a new SPVAsset
router.post('/', 
  adminOnly, 
  responseDebugger, 
  SPVAssetController.createSPVAsset
);

// GET /api/spvassets - Get all SPVAssets
router.get('/', 
  responseDebugger, 
  SPVAssetController.getSPVAssets
);

// GET /api/spvassets/spv/:spvId - Get all assets for a specific SPV
router.get('/spv/:spvId', 
  responseDebugger, 
  SPVAssetController.getAssetsBySPVId
);

// GET /api/spvassets/valuation/spv/:spvId - Calculate total valuation for a specific SPV
router.get('/valuation/spv/:spvId', 
  responseDebugger, 
  SPVAssetController.getSPVValuation
);

// GET /api/spvassets/valuation/type/:type - Calculate total valuation by asset type
router.get('/valuation/type/:type', 
  responseDebugger, 
  SPVAssetController.getAssetTypeValuation
);

// GET /api/spvassets/:id - Get an SPV Asset by ID
router.get('/:id', 
  responseDebugger, 
  SPVAssetController.getSPVAssetById
);

// PUT /api/spvassets/:id - Update an SPV Asset by ID
router.put('/:id', 
  adminOnly, 
  responseDebugger, 
  SPVAssetController.updateSPVAsset
);

// DELETE /api/spvassets/:id - Delete an SPV Asset by ID
router.delete('/:id', 
  adminOnly, 
  responseDebugger, 
  SPVAssetController.deleteSPVAsset
);

module.exports = router;
