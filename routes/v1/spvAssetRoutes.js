/**
 * SPV Asset Management API Routes
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 */
const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const SPVAsset = require('../../models/SPVAssetModel');
const router = express.Router();
const SPVAssetController = require('../../controllers/SPVasset');
const responseDebugger = require('../../middleware/responseDebugger');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Note: Auth removed to match SPV routes behavior
// TODO: Re-enable authentication once auth flow is stabilized

// Note: Admin-only middleware disabled to match SPV routes
// TODO: Re-enable once auth flow is stabilized

// POST /api/spvassets - Create a new SPVAsset
router.post('/',
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
  responseDebugger,
  SPVAssetController.updateSPVAsset
);

// DELETE /api/spvassets/:id - Delete an SPV Asset by ID
router.delete('/:id',
  responseDebugger,
  SPVAssetController.deleteSPVAsset
);

module.exports = router;
