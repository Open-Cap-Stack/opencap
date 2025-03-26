/**
 * SPV Asset Response Body Tests
 * [Bug] OCAE-empty-response: Fix SPVasset controller empty response objects
 * 
 * This file tests that the SPVasset controller properly returns 
 * asset data in GET and PUT responses.
 */
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const responseDebugger = require('../middleware/responseDebugger');

// Mock SPVAsset model methods - note we define mocks before requiring the module
jest.mock('../models/SPVasset', () => {
  // Create helper for mocking mongoose documents
  const createMongooseDoc = (data) => {
    const doc = {
      ...data,
      toObject: function() {
        const obj = { ...this };
        delete obj.toObject;
        delete obj.toJSON;
        return obj;
      },
      toJSON: function() {
        const obj = { ...this };
        delete obj.toObject;
        delete obj.toJSON;
        return obj;
      }
    };
    return doc;
  };

  // Create test assets
  const testAsset = createMongooseDoc({
    _id: 'mock-id-123',
    AssetID: 'asset-001',
    SPVID: 'spv-001',
    Type: 'Real Estate',
    Value: 1000000,
    Description: 'Office building in downtown',
    AcquisitionDate: new Date()
  });

  const updatedAsset = createMongooseDoc({
    _id: 'mock-id-123',
    AssetID: 'asset-001',
    SPVID: 'spv-001',
    Type: 'Real Estate',
    Value: 1200000,
    Description: 'Updated description',
    AcquisitionDate: new Date()
  });

  // Return the mock implementation
  return {
    findById: jest.fn().mockImplementation((id) => {
      console.log('Mock findById called with:', id);
      return {
        exec: jest.fn().mockResolvedValue(testAsset)
      };
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id, updates, options) => {
      console.log('Mock findByIdAndUpdate called with:', id, JSON.stringify(updates), JSON.stringify(options));
      return {
        exec: jest.fn().mockResolvedValue(updatedAsset)
      };
    }),
    find: jest.fn().mockImplementation(() => {
      return {
        exec: jest.fn().mockResolvedValue([testAsset])
      };
    }),
    findByIdAndDelete: jest.fn().mockImplementation(() => {
      return {
        exec: jest.fn().mockResolvedValue(testAsset)
      };
    })
  };
});

// Import the controller after mocking dependencies
const SPVAsset = require('../models/SPVasset');
const SPVAssetController = require('../controllers/SPVasset');

// Mock mongoose connection to prevent hanging
mongoose.connect = jest.fn().mockResolvedValue(true);
mongoose.connection = {
  close: jest.fn().mockResolvedValue(true)
};

// Mock mongoose ObjectId validation
mongoose.Types.ObjectId = {
  isValid: jest.fn().mockImplementation((id) => {
    // Return true for our test IDs
    return id === 'mock-id-123';
  })
};

// Mock JWT auth middleware
jest.mock('../middleware/jwtAuth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { userId: 'test-user-id', roles: ['Admin'] };
    next();
  }),
  authenticateRole: jest.fn(() => (req, res, next) => {
    next();
  })
}));

// Set up JWT environment
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRATION = '1h';

// Create express app
const app = express();
app.use(express.json());
app.use(responseDebugger);

// Import routes with mocked dependencies
const spvAssetRoutes = require('../routes/SPVasset');
app.use('/api/spvassets', spvAssetRoutes);

// Generate JWT token for tests
const generateToken = () => {
  return jwt.sign(
    { userId: 'test-user-id', roles: ['Admin'] },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
};

// Test suite setup
beforeEach(() => {
  jest.clearAllMocks();
});

describe('SPVAssetController direct function tests', () => {
  it('getSPVAssetById should return the asset data', async () => {
    // Mock request and response
    const req = { params: { id: 'mock-id-123' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {}
    };

    // Call controller directly
    await SPVAssetController.getSPVAssetById(req, res);

    // Assertions
    expect(SPVAsset.findById).toHaveBeenCalledWith('mock-id-123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      AssetID: 'asset-001',
      SPVID: 'spv-001'
    }));
  });

  it('updateSPVAsset should update and return the asset data', async () => {
    // Mock request and response
    const req = {
      params: { id: 'mock-id-123' },
      body: {
        Description: 'Updated description',
        Value: 1200000
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {}
    };

    // Call controller directly
    await SPVAssetController.updateSPVAsset(req, res);

    // Assertions
    expect(SPVAsset.findByIdAndUpdate).toHaveBeenCalledWith(
      'mock-id-123',
      req.body,
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      Description: 'Updated description',
      Value: 1200000
    }));
  });
});

describe('SPVAsset API route tests', () => {
  it('GET /api/spvassets/:id should return non-empty response with asset properties', async () => {
    const res = await request(app)
      .get('/api/spvassets/mock-id-123')
      .set('Authorization', `Bearer ${generateToken()}`);

    console.log('GET API response:', JSON.stringify(res.body));
    
    // Response validation
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('AssetID', 'asset-001');
    expect(res.body).toHaveProperty('SPVID', 'spv-001');
  });

  it('PUT /api/spvassets/:id should return non-empty response with updated asset properties', async () => {
    const updateData = {
      Description: 'Updated description',
      Value: 1200000
    };

    const res = await request(app)
      .put('/api/spvassets/mock-id-123')
      .set('Authorization', `Bearer ${generateToken()}`)
      .send(updateData);

    console.log('PUT API response:', JSON.stringify(res.body));
    
    // Response validation
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('Description', 'Updated description');
    expect(res.body).toHaveProperty('Value', 1200000);
  });
});
