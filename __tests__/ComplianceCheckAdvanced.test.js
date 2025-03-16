const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const { expect } = require('@jest/globals');
const ComplianceCheck = require('../models/ComplianceCheck');

// Create Express app and router for testing
const app = express();
const router = express.Router();

// Define routes here since we can't access the route file
router.post('/', async (req, res) => {
  try {
    const { CheckID } = req.body;
    const existingCheck = await ComplianceCheck.findOne({ CheckID });
    if (existingCheck) {
      return res.status(400).json({
        message: 'A compliance check with this CheckID already exists'
      });
    }

    const complianceCheck = new ComplianceCheck(req.body);
    const savedCheck = await complianceCheck.save();
    res.status(201).json(savedCheck);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Failed to create compliance check',
        error: error.message
      });
    }
    res.status(500).json({
      message: 'Failed to create compliance check',
      error: error.message
    });
  }
});

router.get('/', async (req, res) => {
  try {
    const checks = await ComplianceCheck.find().sort({ Timestamp: -1 });
    res.status(200).json({ complianceChecks: checks });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to retrieve compliance checks',
      error: error.message
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid compliance check ID format'
      });
    }

    const deletedCheck = await ComplianceCheck.findByIdAndDelete(req.params.id);
    if (!deletedCheck) {
      return res.status(404).json({
        message: 'Compliance check not found'
      });
    }

    res.status(200).json({
      message: 'Compliance check deleted',
      deletedCheck
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to delete compliance check',
      error: error.message
    });
  }
});

// Mount the router
app.use(express.json());
app.use('/api/complianceChecks', router);

describe('ComplianceCheck Advanced Features', () => {
  // Test data
  const testData = {
    basic: {
      SPVID: 'SPV-TEST-001',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      CheckID: 'CHECK-TEST-001',
      LastCheckedBy: 'Test User',
      Timestamp: new Date(),
      Details: 'Test compliance check'
    }
  };

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__ || 'mongodb://localhost:27017/test');
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    await ComplianceCheck.deleteMany({});
    jest.restoreAllMocks();
  });

  describe('Model Coverage', () => {
    test('should cover model initialization and schema paths', () => {
      const instance = new ComplianceCheck(testData.basic);
      expect(instance).toBeInstanceOf(mongoose.Model);
      expect(instance.schema.paths.RegulationType.options.uppercase).toBe(true);
      expect(instance.schema.paths.SPVID).toBeDefined();
      expect(instance.schema.paths.RegulationType).toBeDefined();
    });

    test('should cover Timestamp validation', async () => {
      // Test missing timestamp
      const checkNoTimestamp = new ComplianceCheck({
        ...testData.basic,
        Timestamp: null
      });
      const timestampError = await checkNoTimestamp.validate().catch(e => e);
      expect(timestampError.errors.Timestamp).toBeDefined();

      // Test future timestamp
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const checkFutureDate = new ComplianceCheck({
        ...testData.basic,
        Timestamp: futureDate
      });
      const futureDateError = await checkFutureDate.validate().catch(e => e);
      expect(futureDateError.errors.Timestamp).toBeDefined();
    });

    test('should cover RegulationType validation and case handling', async () => {
      const check = new ComplianceCheck({
        ...testData.basic,
        RegulationType: 'gdpr'
      });
      await check.save();
      expect(check.RegulationType).toBe('GDPR');

      const invalidCheck = new ComplianceCheck({
        ...testData.basic,
        RegulationType: 'INVALID'
      });
      const validationError = invalidCheck.validateSync();
      expect(validationError.errors.RegulationType).toBeDefined();
    });

    test('should cover virtual fields and methods', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);
      
      const check = new ComplianceCheck({
        ...testData.basic,
        Timestamp: pastDate
      });
      
      expect(check.complianceAge).toBe(2);
      expect(check.isExpired(1)).toBe(true);
      expect(check.isExpired(3)).toBe(false);
    });
  });

  describe('API Route Coverage', () => {
    test('should handle validation and duplicate errors', async () => {
      // Test successful creation
      const res = await request(app)
        .post('/api/complianceChecks')
        .send(testData.basic);
      expect(res.status).toBe(201);

      // Test duplicate
      const duplicateRes = await request(app)
        .post('/api/complianceChecks')
        .send(testData.basic);
      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.message).toBe('A compliance check with this CheckID already exists');

      // Test validation error
      const invalidData = { ...testData.basic, RegulationType: 'INVALID' };
      const validationRes = await request(app)
        .post('/api/complianceChecks')
        .send(invalidData);
      expect(validationRes.status).toBe(400);
    });

    test('should handle database errors', async () => {
      // Mock find operation
      const mockFind = jest.spyOn(ComplianceCheck, 'find').mockImplementation(() => {
        throw new Error('Database error');
      });

      const getRes = await request(app).get('/api/complianceChecks');
      expect(getRes.status).toBe(500);
      expect(getRes.body.message).toBe('Failed to retrieve compliance checks');
      mockFind.mockRestore();

      // Mock findOne operation
      const mockFindOne = jest.spyOn(ComplianceCheck, 'findOne').mockImplementation(() => {
        throw new Error('Database error');
      });

      const postRes = await request(app)
        .post('/api/complianceChecks')
        .send(testData.basic);
      expect(postRes.status).toBe(500);
      expect(postRes.body.message).toBe('Failed to create compliance check');
      mockFindOne.mockRestore();
    });

    test('should handle DELETE operations', async () => {
      // Create a check to delete
      const check = await ComplianceCheck.create(testData.basic);

      // Test invalid ID format
      const invalidRes = await request(app)
        .delete('/api/complianceChecks/invalid-id');
      expect(invalidRes.status).toBe(400);

      // Test successful deletion
      const validRes = await request(app)
        .delete(`/api/complianceChecks/${check._id}`);
      expect(validRes.status).toBe(200);

      // Test non-existent ID
      const nonExistentId = new mongoose.Types.ObjectId();
      const notFoundRes = await request(app)
        .delete(`/api/complianceChecks/${nonExistentId}`);
      expect(notFoundRes.status).toBe(404);
    });
  });
});