/**
 * Company Routes RBAC Tests
 * [Feature] OCAE-302: Implement role-based access control
 */

const request = require('supertest');
const app = require('../../app');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Company = require('../../models/Company');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Company Routes with RBAC', () => {
  let adminToken, managerToken, userToken, clientToken;
  let adminUser, managerUser, regularUser, clientUser;
  let testCompany;

  beforeAll(async () => {
    // Create test users with different roles
    adminUser = new User({
      userId: 'test-admin-' + Date.now(),
      firstName: 'Admin',
      lastName: 'User',
      email: `admin-${Date.now()}@example.com`,
      password: 'password123',
      role: 'admin',
      status: 'active'
    });
    
    managerUser = new User({
      userId: 'test-manager-' + Date.now(),
      firstName: 'Manager',
      lastName: 'User',
      email: `manager-${Date.now()}@example.com`,
      password: 'password123',
      role: 'manager',
      status: 'active'
    });
    
    regularUser = new User({
      userId: 'test-user-' + Date.now(),
      firstName: 'Regular',
      lastName: 'User',
      email: `user-${Date.now()}@example.com`,
      password: 'password123',
      role: 'user',
      status: 'active'
    });
    
    clientUser = new User({
      userId: 'test-client-' + Date.now(),
      firstName: 'Client',
      lastName: 'User',
      email: `client-${Date.now()}@example.com`,
      password: 'password123',
      role: 'client',
      status: 'active'
    });

    await adminUser.save();
    await managerUser.save();
    await regularUser.save();
    await clientUser.save();

    // Create test tokens
    const jwtSecret = process.env.JWT_SECRET || 'testsecret';
    
    adminToken = jwt.sign(
      { userId: adminUser.userId, email: adminUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      { userId: managerUser.userId, email: managerUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: regularUser.userId, email: regularUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    clientToken = jwt.sign(
      { userId: clientUser.userId, email: clientUser.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Create test company
    testCompany = new Company({
      name: 'Test Company',
      description: 'Test company for RBAC testing',
      industry: 'Technology',
      foundedYear: 2020,
      website: 'https://example.com'
    });

    await testCompany.save();
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({
      userId: {
        $in: [
          adminUser.userId,
          managerUser.userId,
          regularUser.userId,
          clientUser.userId
        ]
      }
    });

    await Company.findByIdAndDelete(testCompany._id);
  });

  describe('GET /api/companies - Get all companies', () => {
    it('should allow admin users to access companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should allow manager users to access companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should allow regular users to access companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should allow client users to access companies', async () => {
      const res = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should reject requests without authentication', async () => {
      const res = await request(app).get('/api/companies');
      expect(res.status).to.equal(401);
    });
  });

  describe('POST /api/companies - Create company', () => {
    const newCompany = {
      name: 'New Test Company',
      description: 'Created during RBAC testing',
      industry: 'Finance',
      foundedYear: 2021,
      website: 'https://new-example.com'
    };

    it('should allow admin users to create companies', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCompany);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('name', newCompany.name);
      
      // Clean up
      if (res.body._id) {
        await Company.findByIdAndDelete(res.body._id);
      }
    });

    it('should allow manager users to create companies', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newCompany);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('name', newCompany.name);
      
      // Clean up
      if (res.body._id) {
        await Company.findByIdAndDelete(res.body._id);
      }
    });

    it('should forbid regular users from creating companies', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newCompany);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
    });

    it('should forbid client users from creating companies', async () => {
      const res = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(newCompany);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
    });
  });

  describe('PUT /api/companies/:id - Update company', () => {
    const updateData = {
      description: 'Updated during RBAC testing',
      industry: 'Updated Industry'
    };

    it('should allow admin users to update companies', async () => {
      const res = await request(app)
        .put(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('description', updateData.description);
    });

    it('should allow manager users to update companies', async () => {
      const res = await request(app)
        .put(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('description', updateData.description);
    });

    it('should forbid regular users from updating companies', async () => {
      const res = await request(app)
        .put(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
    });

    it('should forbid client users from updating companies', async () => {
      const res = await request(app)
        .put(`/api/companies/${testCompany._id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
    });
  });

  describe('DELETE /api/companies/:id - Delete company', () => {
    let tempCompany;

    beforeEach(async () => {
      // Create a temporary company for delete tests
      tempCompany = new Company({
        name: 'Temp Delete Company',
        description: 'Will be deleted in tests',
        industry: 'Testing',
        foundedYear: 2022
      });
      await tempCompany.save();
    });

    it('should allow admin users to delete companies', async () => {
      const res = await request(app)
        .delete(`/api/companies/${tempCompany._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).to.equal(200);
      
      // Verify it's deleted
      const company = await Company.findById(tempCompany._id);
      expect(company).to.be.null;
    });

    it('should forbid manager users from deleting companies', async () => {
      const res = await request(app)
        .delete(`/api/companies/${tempCompany._id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
      
      // Clean up
      await Company.findByIdAndDelete(tempCompany._id);
    });

    it('should forbid regular users from deleting companies', async () => {
      const res = await request(app)
        .delete(`/api/companies/${tempCompany._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
      
      // Clean up
      await Company.findByIdAndDelete(tempCompany._id);
    });

    it('should forbid client users from deleting companies', async () => {
      const res = await request(app)
        .delete(`/api/companies/${tempCompany._id}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).to.equal(403);
      expect(res.body).to.have.property('message').that.includes('Access denied');
      
      // Clean up
      await Company.findByIdAndDelete(tempCompany._id);
    });
  });
});
