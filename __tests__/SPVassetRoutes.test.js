/**
 * SPV Asset Management API Tests
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Bug Fix: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to mock JWT authentication middleware and improve MongoDB reliability
 * Following Semantic Seed Venture Studio Coding Standards
 */
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const SPVAsset = require('../models/SPVasset');
const spvAssetRoutes = require('../routes/SPVasset');
const mongoDbConnection = require('../utils/mongoDbConnection');

// Mock JWT authentication middleware
jest.mock('../middleware/jwtAuth', () => ({
  authenticate: jest.fn((req, res, next) => {
    // Set mock user with admin role
    req.user = {
      id: 'test-user-id',
      email: 'admin@test.com',
      roles: ['Admin']
    };
    next();
  }),
  authenticateRole: jest.fn(() => (req, res, next) => {
    next();
  })
}));

const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

// Sample test data
const testAsset = {
  AssetID: 'asset-001',
  SPVID: 'spv-001',
  Type: 'Real Estate',
  Value: 1000000,
  Description: 'Office building in downtown',
  AcquisitionDate: new Date(),
};

// Helper function to create and save multiple test assets with retry logic
async function createTestAssets(assets) {
  return Promise.all(
    assets.map(async (asset) => {
      return mongoDbConnection.withRetry(async () => {
        const newAsset = new SPVAsset(asset);
        return await newAsset.save();
      });
    })
  );
}

// Setup and teardown
beforeEach(async () => {
  // Use MongoDB connection utility with retry logic
  await mongoDbConnection.withRetry(async () => {
    await SPVAsset.deleteMany({});
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

// POST /api/spvassets - Create a new SPV Asset
describe('POST /api/spvassets', () => {
  it('should create a new SPV Asset with valid data', async () => {
    const res = await request(app)
      .post('/api/spvassets')
      .send(testAsset);

    expect(res.statusCode).toBe(201);
    expect(res.body.AssetID).toBe(testAsset.AssetID);
    expect(res.body.SPVID).toBe(testAsset.SPVID);
    expect(res.body.Value).toBe(testAsset.Value);
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/spvassets')
      .send({
        Description: 'Incomplete asset'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets - Get all SPV Assets
describe('GET /api/spvassets', () => {
  it('should get all SPV Assets', async () => {
    // Create test assets
    await createTestAssets([
      testAsset,
      {
        ...testAsset,
        AssetID: 'asset-002',
        Description: 'Second asset'
      }
    ]);

    const res = await request(app).get('/api/spvassets');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('AssetID');
    expect(res.body[1]).toHaveProperty('AssetID');
  });

  it('should return empty array when no assets exist', async () => {
    const res = await request(app).get('/api/spvassets');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(0);
  });

  it('should get a specific SPVAsset by ID', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(assetData);
      return await newAsset.save();
    });

    const res = await request(app).get(`/api/spvassets/${savedAsset._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.AssetID).toBe(assetData.AssetID);
  });

  it('should return 400 for invalid asset ID format', async () => {
    const res = await request(app).get('/api/spvassets/invalid-id');
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid SPV Asset ID format');
  });

  it('should get all assets for a specific SPV', async () => {
    const assets = [
      {
        AssetID: 'asset-1',
        SPVID: 'test-spv',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-2',
        SPVID: 'test-spv',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-3',
        SPVID: 'other-spv',
        Type: 'Real Estate',
        Value: 750000,
        Description: 'Warehouse',
        AcquisitionDate: new Date(),
      }
    ];

    await createTestAssets(assets);

    const res = await request(app).get('/api/spvassets/spv/test-spv');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
    expect(res.body.assets[0].SPVID).toBe('test-spv');
    expect(res.body.assets[1].SPVID).toBe('test-spv');
  });

  it('should return 404 if no assets found for SPV', async () => {
    const res = await request(app).get('/api/spvassets/spv/nonexistent-spv');
    
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('No assets found for SPV');
  });

  it('should calculate total valuation for a specific SPV', async () => {
    const assets = [
      {
        AssetID: 'asset-1',
        SPVID: 'test-spv',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-2',
        SPVID: 'test-spv',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      }
    ];

    await createTestAssets(assets);

    const res = await request(app).get('/api/spvassets/valuation/spv/test-spv');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.spvId).toBe('test-spv');
    expect(res.body.totalValuation).toBe(1500000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assetBreakdown).toBeInstanceOf(Array);
    expect(res.body.assetBreakdown.length).toBe(2);
  });

  it('should calculate total valuation for a specific asset type', async () => {
    const assets = [
      {
        AssetID: 'asset-1',
        SPVID: 'spv-1',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-2',
        SPVID: 'spv-2',
        Type: 'Real Estate',
        Value: 1500000,
        Description: 'Warehouse',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-3',
        SPVID: 'spv-3',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      }
    ];

    await createTestAssets(assets);

    const res = await request(app).get('/api/spvassets/valuation/type/Real Estate');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.type).toBe('Real Estate');
    expect(res.body.totalValuation).toBe(2500000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
  });

  it('should update an SPV asset', async () => {
    const assetData = {
      AssetID: 'update-test-asset',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building downtown',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(assetData);
      return await newAsset.save();
    });
    
    const updateData = {
      Value: 1200000,
      Description: 'Updated office building downtown',
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Value).toBe(1200000);
    expect(res.body.Description).toBe('Updated office building downtown');
    expect(res.body.AssetID).toBe(assetData.AssetID);
    expect(res.body.SPVID).toBe(assetData.SPVID);
  });

  it('should prevent updating AssetID and SPVID', async () => {
    const assetData = {
      AssetID: 'immutable-id-test',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(assetData);
      return await newAsset.save();
    });
    
    const updateData = {
      AssetID: 'try-to-change',
      SPVID: 'try-to-change',
      Value: 1200000,
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Value).toBe(1200000);
    expect(res.body.AssetID).toBe(assetData.AssetID);
    expect(res.body.SPVID).toBe(assetData.SPVID);
  });

  it('should delete an SPVAsset by ID', async () => {
    const asset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset({
        AssetID: 'unique-asset-id',
        SPVID: 'spv123',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building in downtown',
        AcquisitionDate: new Date(),
      });
      return await newAsset.save();
    });

    const res = await request(app).delete(`/api/spvassets/${asset._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('SPVAsset deleted');
  });

  it('should return 404 when calculating valuation for nonexistent asset type', async () => {
    const res = await request(app).get('/api/spvassets/valuation/type/NonexistentType');
    
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('No assets found of type');
  });

  it('should handle invalid value in update request', async () => {
    const assetData = {
      AssetID: 'validation-test',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(assetData);
      return await newAsset.save();
    });
    
    const updateData = {
      Value: "not-a-number"
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid SPV Asset data');
  });

  it('should return 404 when updating nonexistent asset', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const updateData = {
      Value: 1200000,
    };

    const res = await request(app)
      .put(`/api/spvassets/${fakeId}`)
      .send(updateData);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('SPV Asset not found');
  });

  it('should return 404 when deleting nonexistent asset', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/spvassets/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('SPVAsset not found');
  });

  it('should handle missing required fields when creating asset', async () => {
    const incompleteAssetData = {
      AssetID: 'incomplete-asset',
      // Missing required fields
    };

    const res = await request(app)
      .post('/api/spvassets')
      .send(incompleteAssetData);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Missing required fields');
  });
});

// GET /api/spvassets/:id - Get asset by ID
describe('GET /api/spvassets/:id', () => {
  it('should get an asset by valid ID', async () => {
    const asset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(testAsset);
      return await newAsset.save();
    });
    const res = await request(app).get(`/api/spvassets/${asset.AssetID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.AssetID).toBe(testAsset.AssetID);
    expect(res.body.SPVID).toBe(testAsset.SPVID);
  });

  it('should return 404 for non-existent asset ID', async () => {
    const res = await request(app).get('/api/spvassets/non-existent-id');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 400 for invalid asset ID format', async () => {
    const res = await request(app).get('/api/spvassets/123'); // Assuming ID validation in place

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets/spv/:spvId - Get assets for a specific SPV
describe('GET /api/spvassets/spv/:spvId', () => {
  it('should get assets for a specific SPV', async () => {
    await createTestAssets([
      testAsset,
      {
        ...testAsset,
        AssetID: 'asset-002',
        SPVID: 'spv-002'
      }
    ]);

    const res = await request(app).get('/api/spvassets/spv/spv-001');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(1);
    expect(res.body[0].SPVID).toBe('spv-001');
  });

  it('should return 404 if no assets found for SPV', async () => {
    const res = await request(app).get('/api/spvassets/spv/non-existent-spv');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets/valuation/spv/:spvId - Get total valuation for a specific SPV
describe('GET /api/spvassets/valuation/spv/:spvId', () => {
  it('should calculate total valuation for a specific SPV', async () => {
    // Create assets for the same SPV with different values
    await createTestAssets([
      testAsset,
      {
        ...testAsset,
        AssetID: 'asset-002',
        Value: 500000
      }
    ]);

    const res = await request(app).get('/api/spvassets/valuation/spv/spv-001');

    expect(res.statusCode).toBe(200);
    expect(res.body.spvId).toBe('spv-001');
    expect(res.body.totalValuation).toBe(1500000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
  });

  it('should return 404 if no assets found for SPV valuation', async () => {
    const res = await request(app).get('/api/spvassets/valuation/spv/non-existent-spv');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets/valuation/type/:type - Get Valuation by Asset Type
describe('GET /api/spvassets/valuation/type/:type', () => {
  it('should calculate total valuation for a specific asset type', async () => {
    // Create assets of different types
    await createTestAssets([
      testAsset,
      {
        ...testAsset,
        AssetID: 'asset-002',
        Type: 'Financial Instrument',
        Value: 500000
      },
      {
        ...testAsset,
        AssetID: 'asset-003',
        Type: 'Real Estate',
        Value: 750000
      }
    ]);

    const res = await request(app).get('/api/spvassets/valuation/type/Real Estate');

    expect(res.statusCode).toBe(200);
    expect(res.body.type).toBe('Real Estate');
    expect(res.body.totalValuation).toBe(1750000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
  });

  it('should return 404 if no assets found of that type', async () => {
    const res = await request(app).get('/api/spvassets/valuation/type/Intellectual');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// PUT /api/spvassets/:id - Update Asset
describe('PUT /api/spvassets/:id', () => {
  it('should update an asset by ID', async () => {
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(testAsset);
      return await newAsset.save();
    });
    const updateData = {
      Type: 'Financial Instrument',
      Value: 1250000,
      Description: 'Updated asset description'
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Type).toBe(updateData.Type);
    expect(res.body.Value).toBe(updateData.Value);
    expect(res.body.Description).toBe(updateData.Description);
    expect(res.body.AssetID).toBe(savedAsset.AssetID); // ID should remain unchanged
  });

  it('should prevent AssetID and SPVID from being updated', async () => {
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(testAsset);
      return await newAsset.save();
    });
    const updateData = {
      AssetID: 'new-asset-id',
      SPVID: 'new-spv-id',
      Description: 'Updated description'
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.AssetID).toBe(savedAsset.AssetID); // Original ID should be preserved
    expect(res.body.SPVID).toBe(savedAsset.SPVID); // Original SPVID should be preserved
    expect(res.body.Description).toBe(updateData.Description);
  });

  it('should return 400 if Value is not numeric', async () => {
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(testAsset);
      return await newAsset.save();
    });
    const updateData = {
      Value: 'not-a-number'
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 404 for non-existent asset ID', async () => {
    const res = await request(app)
      .put('/api/spvassets/non-existent-id')
      .send({ Description: 'Updated description' });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// DELETE /api/spvassets/:id - Delete Asset
describe('DELETE /api/spvassets/:id', () => {
  it('should delete an asset by ID', async () => {
    const asset = await mongoDbConnection.withRetry(async () => {
      const newAsset = new SPVAsset(testAsset);
      return await newAsset.save();
    });
    const res = await request(app).delete(`/api/spvassets/${asset._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verify asset is deleted
    const findRes = await request(app).get(`/api/spvassets/${asset._id}`);
    expect(findRes.statusCode).toBe(404);
  });

  it('should return 404 for non-existent asset ID', async () => {
    const res = await request(app).delete('/api/spvassets/non-existent-id');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
