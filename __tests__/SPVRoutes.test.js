/**
 * SPV Management API Tests
 * Feature: OCAE-011: Create BDD test suite for SPV Management API
 */
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const SPV = require('../models/SPV');
const spvRoutes = require('../routes/SPV');

const app = express();
app.use(express.json());
app.use('/api/spvs', spvRoutes);

// Sample test data
const testSPV = {
  SPVID: 'spv-001',
  Name: 'Test SPV',
  Purpose: 'Investment in technology startups',
  CreationDate: new Date(),
  Status: 'Active',
  ComplianceStatus: 'Compliant',
  ParentCompanyID: 'parent-001'
};

// Sample test data for status testing
const pendingSPV = {
  ...testSPV,
  SPVID: 'spv-002',
  Status: 'Pending',
  ComplianceStatus: 'PendingReview'
};

// Sample test data for compliance testing
const nonCompliantSPV = {
  ...testSPV,
  SPVID: 'spv-003',
  Status: 'Active',
  ComplianceStatus: 'NonCompliant'
};

// Setup and teardown
beforeEach(async () => {
  await SPV.deleteMany({});
});

// POST /api/spvs - Create a new SPV
describe('POST /api/spvs', () => {
  it('should create a new SPV with valid data', async () => {
    const res = await request(app)
      .post('/api/spvs')
      .send(testSPV);

    expect(res.statusCode).toBe(201);
    expect(res.body.SPVID).toBe(testSPV.SPVID);
    expect(res.body.Name).toBe(testSPV.Name);
    expect(res.body.ComplianceStatus).toBe(testSPV.ComplianceStatus);
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/spvs')
      .send({
        Name: 'Incomplete SPV'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvs - Get all SPVs
describe('GET /api/spvs', () => {
  it('should get all SPVs', async () => {
    // Create test SPVs
    await new SPV(testSPV).save();
    await new SPV({
      ...testSPV,
      SPVID: 'spv-002',
      Name: 'Second SPV'
    }).save();

    const res = await request(app).get('/api/spvs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('SPVID');
    expect(res.body[1]).toHaveProperty('SPVID');
  });

  it('should return empty array when no SPVs exist', async () => {
    const res = await request(app).get('/api/spvs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(0);
  });
});

// GET /api/spvs/:id - Get SPV by ID
describe('GET /api/spvs/:id', () => {
  it('should get an SPV by valid ID', async () => {
    const spv = await new SPV(testSPV).save();
    const res = await request(app).get(`/api/spvs/${spv.SPVID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.SPVID).toBe(testSPV.SPVID);
    expect(res.body.Name).toBe(testSPV.Name);
  });

  it('should return 404 for non-existent SPV ID', async () => {
    const res = await request(app).get('/api/spvs/507f1f77bcf86cd799439011');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('should try to find by SPVID first', async () => {
    const spv = await new SPV(testSPV).save();
    const res = await request(app).get(`/api/spvs/${spv.SPVID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.SPVID).toBe(testSPV.SPVID);
  });

  it('should find by MongoDB ID if not found by SPVID', async () => {
    const spv = await new SPV(testSPV).save();
    const res = await request(app).get(`/api/spvs/${spv._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(spv._id.toString());
  });
});

// GET /api/spvs/:id/investors - Get investors for a specific SPV
describe('GET /api/spvs/:id/investors', () => {
  it('should get investors for a specific SPV', async () => {
    const spv = await new SPV(testSPV).save();
    // Mock investors could be created here
    
    const res = await request(app).get(`/api/spvs/${spv.SPVID}/investors`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
  });

  it('should return 404 for SPV with no investors', async () => {
    const spv = await new SPV(testSPV).save();
    
    const res = await request(app).get(`/api/spvs/${spv.SPVID}/investors?requireInvestors=true`);

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 404 for non-existent SPV ID', async () => {
    const res = await request(app).get('/api/spvs/non-existent-id/investors');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvs/status/:status - Get SPVs by status
describe('GET /api/spvs/status/:status', () => {
  it('should get SPVs by status', async () => {
    await new SPV(testSPV).save(); // Status: Active
    await new SPV(pendingSPV).save(); // Status: Pending

    const res = await request(app).get('/api/spvs/status/Active');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('spvs');
    expect(Array.isArray(res.body.spvs)).toBeTruthy();
    expect(res.body.spvs.length).toBe(1);
    expect(res.body.spvs[0].Status).toBe('Active');
  });

  it('should return 400 for invalid status', async () => {
    const res = await request(app).get('/api/spvs/status/InvalidStatus');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid status parameter. Must be Active, Pending, or Closed');
  });

  it('should return empty array for valid status with no matching SPVs', async () => {
    const res = await request(app).get('/api/spvs/status/Closed');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('spvs');
    expect(Array.isArray(res.body.spvs)).toBeTruthy();
    expect(res.body.spvs.length).toBe(0);
  });
});

// GET /api/spvs/compliance/:status - Get SPVs by compliance status
describe('GET /api/spvs/compliance/:status', () => {
  it('should get SPVs by compliance status', async () => {
    await new SPV(testSPV).save(); // ComplianceStatus: Compliant
    await new SPV(nonCompliantSPV).save(); // ComplianceStatus: NonCompliant

    const res = await request(app).get('/api/spvs/compliance/Compliant');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(1);
    expect(res.body[0].ComplianceStatus).toBe('Compliant');
  });

  it('should return 400 for invalid compliance status', async () => {
    const res = await request(app).get('/api/spvs/compliance/Unknown');

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Invalid compliance status. Status must be one of: Compliant, NonCompliant, PendingReview');
  });

  it('should return empty array for valid compliance status with no matching SPVs', async () => {
    const res = await request(app).get('/api/spvs/compliance/NonCompliant');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(0);
  });
});

// GET /api/spvs/parent/:id - Get SPVs by parent company ID
describe('GET /api/spvs/parent/:id', () => {
  it('should get SPVs by parent company ID', async () => {
    await new SPV(testSPV).save(); // ParentCompanyID: parent-001
    await new SPV({
      ...testSPV,
      SPVID: 'spv-002',
      ParentCompanyID: 'parent-002'
    }).save();

    const res = await request(app).get('/api/spvs/parent/parent-001');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('spvs');
    expect(Array.isArray(res.body.spvs)).toBeTruthy();
    expect(res.body.spvs.length).toBe(1);
    expect(res.body.spvs[0].ParentCompanyID).toBe('parent-001');
  });

  it('should return empty array for parent company with no associated SPVs', async () => {
    const res = await request(app).get('/api/spvs/parent/non-existent-parent');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('spvs');
    expect(Array.isArray(res.body.spvs)).toBeTruthy();
    expect(res.body.spvs.length).toBe(0);
  });
});

// PUT /api/spvs/:id - Update SPV
describe('PUT /api/spvs/:id', () => {
  it('should update an SPV by ID', async () => {
    const spv = await new SPV(testSPV).save();
    const updateData = {
      Name: 'Updated SPV Name',
      ComplianceStatus: 'NonCompliant'
    };

    const res = await request(app)
      .put(`/api/spvs/${spv.SPVID}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Name).toBe(updateData.Name);
    expect(res.body.ComplianceStatus).toBe(updateData.ComplianceStatus);
    expect(res.body.SPVID).toBe(spv.SPVID); // ID should remain unchanged
  });

  it('should prevent SPVID from being updated', async () => {
    const spv = await new SPV(testSPV).save();
    const updateData = {
      SPVID: 'new-spv-id',
      Name: 'Updated SPV Name'
    };

    const res = await request(app)
      .put(`/api/spvs/${spv.SPVID}`)
      .send(updateData);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'SPVID cannot be modified');
  });

  it('should return 404 for non-existent SPV ID', async () => {
    const res = await request(app)
      .put('/api/spvs/non-existent-id')
      .send({ Name: 'Updated Name' });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// DELETE /api/spvs/:id - Delete SPV
describe('DELETE /api/spvs/:id', () => {
  it('should delete an SPV by ID', async () => {
    const spv = await new SPV(testSPV).save();
    const res = await request(app).delete(`/api/spvs/${spv.SPVID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verify SPV is deleted
    const findRes = await request(app).get(`/api/spvs/${spv.SPVID}`);
    expect(findRes.statusCode).toBe(404);
  });

  it('should return 404 for non-existent SPV ID', async () => {
    const res = await request(app).delete('/api/spvs/non-existent-id');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
