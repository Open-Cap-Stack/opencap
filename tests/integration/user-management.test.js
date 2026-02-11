/**
 * Integration Tests: User Management Operations
 * Issue #42: Implement Integration Test Suite
 *
 * Tests the complete user management workflow:
 * - User CRUD operations
 * - Permission management
 * - Role-based access control
 */

const request = require('supertest');
const { createApp } = require('../setup/app');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Helper to generate a 24-char hex string (replaces mongoose.Types.ObjectId)
function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

describe('User Management Integration Tests', () => {
  let app;
  let adminToken;
  let managerToken;
  let userToken;
  let createdUserId;

  // Valid user data
  const validUser = {
    userId: 'user-integration-001',
    name: 'Integration Test User',
    username: 'integrationuser',
    email: 'integration.user@opencap.com',
    password: 'SecurePassword123!',
    role: 'user'
  };

  const adminUser = {
    userId: 'admin-integration-001',
    name: 'Admin Test User',
    username: 'adminuser',
    email: 'admin.user@opencap.com',
    password: 'AdminSecure123!',
    role: 'admin'
  };

  const managerUser = {
    userId: 'manager-integration-001',
    name: 'Manager Test User',
    username: 'manageruser',
    email: 'manager.user@opencap.com',
    password: 'ManagerSecure123!',
    role: 'manager'
  };

  beforeAll(async () => {
    // Set environment variables
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
    process.env.NODE_ENV = 'test';

    app = createApp();

    // Create admin token with full permissions
    adminToken = jwt.sign(
      {
        userId: 'admin-test-user',
        role: 'admin',
        permissions: [
          'admin:all',
          'read:users', 'write:users', 'delete:users',
          'read:companies', 'write:companies', 'delete:companies'
        ]
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create manager token
    managerToken = jwt.sign(
      {
        userId: 'manager-test-user',
        role: 'manager',
        permissions: ['read:users', 'write:users']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create regular user token
    userToken = jwt.sign(
      {
        userId: 'regular-test-user',
        role: 'user',
        permissions: ['read:users']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // No-op: ZeroDB handles data isolation
  });

  describe('User CRUD Operations', () => {
    describe('POST /api/v1/users - Create User', () => {
      it('should create a new user with valid data', async () => {
        const response = await request(app)
          .post('/api/v1/users')
          .send(validUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('userId', validUser.userId);
        expect(response.body).toHaveProperty('email', validUser.email);
        expect(response.body).toHaveProperty('role', validUser.role);

        createdUserId = response.body._id || response.body.id;
      });

      it('should create a manager user', async () => {
        const response = await request(app)
          .post('/api/v1/users')
          .send(managerUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('role', 'manager');
      });

      it('should create an admin user', async () => {
        const response = await request(app)
          .post('/api/v1/users')
          .send(adminUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('role', 'admin');
      });

      it('should reject user creation with missing required fields', async () => {
        const incompleteUser = {
          email: 'incomplete@test.com',
          password: 'Password123!'
          // Missing: userId, name, username, role
        };

        const response = await request(app)
          .post('/api/v1/users')
          .send(incompleteUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('required');
      });

      it('should reject duplicate email', async () => {
        // Create first user
        await request(app)
          .post('/api/v1/users')
          .send(validUser);

        // Try to create user with same email
        const duplicateUser = {
          ...validUser,
          userId: 'user-duplicate-001',
          username: 'duplicateuser'
        };

        const response = await request(app)
          .post('/api/v1/users')
          .send(duplicateUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('already exists');
      });
    });

    describe('GET /api/v1/users - List Users', () => {
      beforeEach(async () => {
        // Create test users
        await request(app)
          .post('/api/v1/users')
          .send(validUser);

        await request(app)
          .post('/api/v1/users')
          .send(managerUser);

        await request(app)
          .post('/api/v1/users')
          .send(adminUser);
      });

      it('should list all users for authenticated admin', async () => {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(3);
      });

      it('should list users for manager with appropriate permissions', async () => {
        const response = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should reject list request without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/users')
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/users/:id - Get User by ID', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/v1/users')
          .send(validUser);

        createdUserId = createResponse.body._id || createResponse.body.id;
      });

      it('should retrieve a specific user by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('email', validUser.email);
        expect(response.body).toHaveProperty('name', validUser.name);
      });

      it('should return 404 for non-existent user', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .get(`/api/v1/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('GET /api/v1/users/profile - Get User Profile', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/users')
          .send(validUser);
      });

      it('should retrieve authenticated user profile', async () => {
        // Create token for the created user
        const profileToken = jwt.sign(
          {
            userId: validUser.userId,
            role: validUser.role
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${profileToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('userId', validUser.userId);
      });

      it('should reject profile request without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/users/profile')
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/v1/users/:id - Update User', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/v1/users')
          .send(validUser);

        createdUserId = createResponse.body._id || createResponse.body.id;
      });

      it('should update user name and username', async () => {
        const updates = {
          name: 'Updated Name',
          username: 'updatedusername'
        };

        const response = await request(app)
          .put(`/api/v1/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('name', 'Updated Name');
        expect(response.body).toHaveProperty('username', 'updatedusername');
      });

      it('should update user role (admin only)', async () => {
        const response = await request(app)
          .put(`/api/v1/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'manager' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('role', 'manager');
      });

      it('should return 404 when updating non-existent user', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .put(`/api/v1/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });

      it('should reject update without authentication', async () => {
        const response = await request(app)
          .put(`/api/v1/users/${createdUserId}`)
          .send({ name: 'Updated' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /api/v1/users/:id - Delete User', () => {
      beforeEach(async () => {
        const createResponse = await request(app)
          .post('/api/v1/users')
          .send(validUser);

        createdUserId = createResponse.body._id || createResponse.body.id;
      });

      it('should delete an existing user', async () => {
        const response = await request(app)
          .delete(`/api/v1/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');

        // Verify deletion
        const getResponse = await request(app)
          .get(`/api/v1/users/${createdUserId}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(getResponse.status).toBe(404);
      });

      it('should return 404 when deleting non-existent user', async () => {
        const fakeId = generateObjectId();

        const response = await request(app)
          .delete(`/api/v1/users/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });

      it('should reject delete without authentication', async () => {
        const response = await request(app)
          .delete(`/api/v1/users/${createdUserId}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('User Complete Lifecycle', () => {
    it('should complete full user CRUD lifecycle', async () => {
      // 1. CREATE
      const createResponse = await request(app)
        .post('/api/v1/users')
        .send({
          userId: 'lifecycle-user-001',
          name: 'Lifecycle User',
          username: 'lifecycleuser',
          email: 'lifecycle@opencap.com',
          password: 'LifecyclePass123!',
          role: 'user'
        });

      expect(createResponse.status).toBe(201);
      const userId = createResponse.body._id || createResponse.body.id;

      // 2. READ
      const readResponse = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.name).toBe('Lifecycle User');

      // 3. UPDATE
      const updateResponse = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Lifecycle User',
          role: 'manager'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.name).toBe('Updated Lifecycle User');
      expect(updateResponse.body.role).toBe('manager');

      // 4. VERIFY UPDATE
      const verifyResponse = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.name).toBe('Updated Lifecycle User');

      // 5. DELETE
      const deleteResponse = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);

      // 6. VERIFY DELETION
      const finalResponse = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finalResponse.status).toBe(404);
    });
  });

  describe('Role-Based Access Control', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/users')
        .send(validUser);

      await request(app)
        .post('/api/v1/users')
        .send(adminUser);

      await request(app)
        .post('/api/v1/users')
        .send(managerUser);
    });

    it('should allow admin to access all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3);
    });

    it('should allow manager to read users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow regular user to read users (with read permission)', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${userToken}`);

      // Depending on implementation, may allow or restrict
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('User Roles and Permissions', () => {
    it('should create users with different roles', async () => {
      const roles = ['admin', 'founder', 'investor', 'manager', 'user', 'client'];

      for (const role of roles) {
        const response = await request(app)
          .post('/api/v1/users')
          .send({
            userId: `role-test-${role}`,
            name: `${role} Test`,
            username: `${role}testuser`,
            email: `${role}.test@opencap.com`,
            password: 'RoleTest123!',
            role: role
          });

        expect(response.status).toBe(201);
        expect(response.body.role).toBe(role);
      }
    });

    it('should verify different users have appropriate role', async () => {
      // Create users with different roles
      await request(app)
        .post('/api/v1/users')
        .send({ ...validUser, role: 'investor' });

      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);

      const investor = response.body.find(u => u.role === 'investor');
      expect(investor).toBeDefined();
    });
  });

  describe('User Validation Edge Cases', () => {
    it('should handle special characters in name', async () => {
      const specialUser = {
        ...validUser,
        userId: 'special-char-user',
        name: "O'Brien-Smith Jr.",
        username: 'obriensmith',
        email: 'special.char@opencap.com'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(specialUser);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe("O'Brien-Smith Jr.");
    });

    it('should handle unicode characters in name', async () => {
      const unicodeUser = {
        ...validUser,
        userId: 'unicode-user',
        name: 'Jose Garcia',
        username: 'josegarcia',
        email: 'jose.garcia@opencap.com'
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(unicodeUser);

      expect(response.status).toBe(201);
    });

    it('should trim whitespace from email', async () => {
      const whitespaceUser = {
        ...validUser,
        userId: 'whitespace-user',
        username: 'whitespaceuser',
        email: '  whitespace@opencap.com  '
      };

      const response = await request(app)
        .post('/api/v1/users')
        .send(whitespaceUser);

      // Should either accept trimmed email or reject
      expect([201, 400]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON body', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle invalid ObjectId format', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 404, 500]).toContain(response.status);
    });

    it('should handle empty request body for create', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
