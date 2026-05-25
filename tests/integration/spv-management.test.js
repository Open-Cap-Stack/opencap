/**
 * Integration Tests: SPV Management Operations
 * Issue #42: Implement Integration Test Suite
 *
 * Tests the complete SPV (Special Purpose Vehicle) workflow:
 * - Create SPV
 * - Add/manage members
 * - Manage assets
 * - Update SPV status
 * - Delete SPV
 */

const request = require('supertest');
const { createApp } = require('../setup/app');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Helper to generate a 24-char hex string (replaces mongoose.Types.ObjectId)
function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

describe('SPV Management Integration Tests', () => {
  let app;
  let adminToken;
  let userToken;
  let createdSPVId;

  // Valid SPV data
  const validSPV = {
    SPVID: 'SPV-2024-001',
    Name: 'Integration Test SPV',
    Purpose: 'Investment vehicle for Series A funding round',
    CreationDate: new Date().toISOString(),
    Status: 'Active',
    ParentCompanyID: 'company-123',
    ComplianceStatus: 'Compliant'
  };

  const pendingSPV = {
    SPVID: 'SPV-2024-002',
    Name: 'Pending SPV',
    Purpose: 'Pending investment vehicle',
    CreationDate: new Date().toISOString(),
    Status: 'Pending',
    ParentCompanyID: 'company-123',
    ComplianceStatus: 'PendingReview'
  };

  beforeAll(async () => {
    // Set environment variables
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
    process.env.NODE_ENV = 'test';

    app = createApp();

    // Create admin token
    adminToken = jwt.sign(
      {
        userId: 'admin-spv-manager',
        role: 'admin',
        permissions: ['admin:all', 'read:spv', 'write:spv', 'delete:spv']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create user token
    userToken = jwt.sign(
      {
        userId: 'regular-user',
        role: 'employee',
        permissions: ['read:spv']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // No-op: ZeroDB handles data isolation
  });

  describe('SPV CRUD Operations', () => {
    describe('POST /api/spvs - Create SPV', () => {
      it('should create a new SPV with valid data', async () => {
        const response = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('SPVID', validSPV.SPVID);
        expect(response.body).toHaveProperty('Name', validSPV.Name);
        expect(response.body).toHaveProperty('Status', 'Active');
        expect(response.body).toHaveProperty('ComplianceStatus', 'Compliant');

        createdSPVId = response.body._id || response.body.SPVID;
      });

      it('should create an SPV with Pending status', async () => {
        const response = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pendingSPV)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('Status', 'Pending');
        expect(response.body).toHaveProperty('ComplianceStatus', 'PendingReview');
      });

      it('should reject SPV creation with missing required fields', async () => {
        const incompleteSPV = {
          SPVID: 'SPV-INCOMPLETE',
          Name: 'Incomplete SPV'
          // Missing: Purpose, CreationDate, Status, ParentCompanyID, ComplianceStatus
        };

        const response = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(incompleteSPV)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Missing required fields');
      });

      it('should reject SPV with invalid Status value', async () => {
        const invalidStatus = {
          ...validSPV,
          SPVID: 'SPV-INVALID-STATUS',
          Status: 'InvalidStatus'
        };

        const response = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidStatus)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid status');
      });

      it('should reject SPV with invalid ComplianceStatus value', async () => {
        const invalidCompliance = {
          ...validSPV,
          SPVID: 'SPV-INVALID-COMPLIANCE',
          ComplianceStatus: 'InvalidCompliance'
        };

        const response = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCompliance)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid compliance status');
      });

      it('should reject duplicate SPVID', async () => {
        // Create first SPV
        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        // Try to create duplicate
        const response = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already exists');
      });
    });

    describe('GET /api/spvs - List SPVs', () => {
      beforeEach(async () => {
        // Create test SPVs
        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pendingSPV);

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validSPV,
            SPVID: 'SPV-2024-003',
            Name: 'Third SPV',
            Status: 'Closed',
            ComplianceStatus: 'NonCompliant'
          });
      });

      it('should list all SPVs', async () => {
        const response = await request(app)
          .get('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('spvs');
        expect(Array.isArray(response.body.spvs)).toBe(true);
        expect(response.body.spvs.length).toBe(3);
      });

      it('should return empty array message when no SPVs exist', async () => {
        // Note: This test may need separate data isolation in ZeroDB
        const response = await request(app)
          .get('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.spvs).toEqual([]);
      });
    });

    describe('GET /api/spvs/:id - Get SPV by ID', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        createdSPVId = createResponse.body._id;
      });

      it('should retrieve an SPV by MongoDB ID', async () => {
        const response = await request(app)
          .get(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('SPVID', validSPV.SPVID);
        expect(response.body).toHaveProperty('Name', validSPV.Name);
      });

      it('should retrieve an SPV by SPVID', async () => {
        const response = await request(app)
          .get(`/api/spvs/${validSPV.SPVID}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('SPVID', validSPV.SPVID);
      });

      it('should return 404 for non-existent SPV', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .get(`/api/spvs/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      });
    });

    describe('GET /api/spvs/status/:status - Filter by Status', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pendingSPV);

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validSPV,
            SPVID: 'SPV-CLOSED',
            Name: 'Closed SPV',
            Status: 'Closed'
          });
      });

      it('should filter SPVs by Active status', async () => {
        const response = await request(app)
          .get('/api/spvs/status/Active')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.spvs).toBeDefined();
        response.body.spvs.forEach(spv => {
          expect(spv.Status).toBe('Active');
        });
      });

      it('should filter SPVs by Pending status', async () => {
        const response = await request(app)
          .get('/api/spvs/status/Pending')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        response.body.spvs.forEach(spv => {
          expect(spv.Status).toBe('Pending');
        });
      });

      it('should filter SPVs by Closed status', async () => {
        const response = await request(app)
          .get('/api/spvs/status/Closed')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        response.body.spvs.forEach(spv => {
          expect(spv.Status).toBe('Closed');
        });
      });

      it('should return 400 for invalid status parameter', async () => {
        const response = await request(app)
          .get('/api/spvs/status/InvalidStatus')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/spvs/compliance/:status - Filter by Compliance', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV); // Compliant

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(pendingSPV); // PendingReview

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validSPV,
            SPVID: 'SPV-NONCOMPLIANT',
            ComplianceStatus: 'NonCompliant'
          });
      });

      it('should filter SPVs by Compliant status', async () => {
        const response = await request(app)
          .get('/api/spvs/compliance/Compliant')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        response.body.spvs.forEach(spv => {
          expect(spv.ComplianceStatus).toBe('Compliant');
        });
      });

      it('should filter SPVs by NonCompliant status', async () => {
        const response = await request(app)
          .get('/api/spvs/compliance/NonCompliant')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        response.body.spvs.forEach(spv => {
          expect(spv.ComplianceStatus).toBe('NonCompliant');
        });
      });

      it('should filter SPVs by PendingReview status', async () => {
        const response = await request(app)
          .get('/api/spvs/compliance/PendingReview')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        response.body.spvs.forEach(spv => {
          expect(spv.ComplianceStatus).toBe('PendingReview');
        });
      });

      it('should return 400 for invalid compliance status', async () => {
        const response = await request(app)
          .get('/api/spvs/compliance/Invalid')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/spvs/parent/:id - Filter by Parent Company', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...validSPV,
            SPVID: 'SPV-OTHER-PARENT',
            ParentCompanyID: 'company-456'
          });
      });

      it('should filter SPVs by parent company ID', async () => {
        const response = await request(app)
          .get('/api/spvs/parent/company-123')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.spvs).toBeDefined();
        response.body.spvs.forEach(spv => {
          expect(spv.ParentCompanyID).toBe('company-123');
        });
      });

      it('should return 404 for non-existent parent company', async () => {
        const response = await request(app)
          .get('/api/spvs/parent/non-existent-company')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });
    });

    describe('PUT /api/spvs/:id - Update SPV', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        createdSPVId = createResponse.body._id;
      });

      it('should update SPV Name and Purpose', async () => {
        const updates = {
          Name: 'Updated SPV Name',
          Purpose: 'Updated investment purpose'
        };

        const response = await request(app)
          .put(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('Name', 'Updated SPV Name');
        expect(response.body).toHaveProperty('Purpose', 'Updated investment purpose');
      });

      it('should update SPV Status', async () => {
        const response = await request(app)
          .put(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ Status: 'Closed' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('Status', 'Closed');
      });

      it('should update SPV ComplianceStatus', async () => {
        const response = await request(app)
          .put(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ComplianceStatus: 'NonCompliant' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ComplianceStatus', 'NonCompliant');
      });

      it('should reject SPVID modification', async () => {
        const response = await request(app)
          .put(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ SPVID: 'NEW-SPVID' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('cannot be modified');
      });

      it('should reject invalid Status update', async () => {
        const response = await request(app)
          .put(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ Status: 'InvalidStatus' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      });

      it('should return 404 when updating non-existent SPV', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .put(`/api/spvs/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ Name: 'Updated Name' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/spvs/:id - Delete SPV', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/spvs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validSPV);

        createdSPVId = createResponse.body._id;
      });

      it('should delete an existing SPV', async () => {
        const response = await request(app)
          .delete(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');

        // Verify deletion
        const getResponse = await request(app)
          .get(`/api/spvs/${createdSPVId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(404);
      });

      it('should delete by SPVID', async () => {
        const response = await request(app)
          .delete(`/api/spvs/${validSPV.SPVID}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
      });

      it('should return 404 when deleting non-existent SPV', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .delete(`/api/spvs/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('SPV Complete Lifecycle', () => {
    it('should complete full SPV lifecycle', async () => {
      // 1. CREATE
      const createResponse = await request(app)
        .post('/api/spvs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          SPVID: 'SPV-LIFECYCLE-TEST',
          Name: 'Lifecycle Test SPV',
          Purpose: 'Testing complete lifecycle',
          CreationDate: new Date().toISOString(),
          Status: 'Pending',
          ParentCompanyID: 'company-lifecycle',
          ComplianceStatus: 'PendingReview'
        });

      expect(createResponse.status).toBe(201);
      const spvId = createResponse.body._id;

      // 2. READ
      const readResponse = await request(app)
        .get(`/api/spvs/${spvId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.Status).toBe('Pending');

      // 3. UPDATE to Active
      const activateResponse = await request(app)
        .put(`/api/spvs/${spvId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          Status: 'Active',
          ComplianceStatus: 'Compliant'
        });

      expect(activateResponse.status).toBe(200);
      expect(activateResponse.body.Status).toBe('Active');
      expect(activateResponse.body.ComplianceStatus).toBe('Compliant');

      // 4. UPDATE to Closed
      const closeResponse = await request(app)
        .put(`/api/spvs/${spvId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ Status: 'Closed' });

      expect(closeResponse.status).toBe(200);
      expect(closeResponse.body.Status).toBe('Closed');

      // 5. DELETE
      const deleteResponse = await request(app)
        .delete(`/api/spvs/${spvId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);

      // 6. VERIFY DELETION
      const verifyResponse = await request(app)
        .get(`/api/spvs/${spvId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('SPV Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/spvs')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/spvs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should handle empty ID parameter', async () => {
      const response = await request(app)
        .get('/api/spvs/   ')
        .set('Authorization', `Bearer ${adminToken}`);

      // Should either return 400 or 404 for empty/whitespace ID
      expect([400, 404]).toContain(response.status);
    });
  });
});
