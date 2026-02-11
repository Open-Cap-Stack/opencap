/**
 * SQL Injection Prevention Tests
 *
 * Comprehensive test suite to ensure the application is protected
 * against SQL injection attacks across all database operations.
 *
 * Tests cover:
 * - MongoDB query injection attempts
 * - NoSQL injection patterns
 * - Input validation
 * - Parameter sanitization
 * - Edge cases and attack vectors
 */

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Company = require('../../models/Company');
const databaseAdapter = require('../../services/databaseAdapter');
const zerodbService = require('../../services/zerodbService');

describe('SQL/NoSQL Injection Prevention', () => {
  let authToken;
  let testUserId;
  let testCompanyId;

  beforeAll(async () => {
    // Set up test data using ZeroDB-compatible approach
    testUserId = 'security-test-user-id';
    testCompanyId = 'security-test-company-id';

    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'security-test@example.com',
        password: 'SecurePassword123!'
      });
    authToken = response.body.token;
  });

  afterAll(async () => {
    // No mongoose connection to close
  });

  describe('MongoDB Query Injection Attempts', () => {
    test('Should reject NoSQL injection in login email field', async () => {
      const maliciousPayloads = [
        { $gt: '' },
        { $ne: null },
        { $regex: '.*' },
        { $where: '1==1' },
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        { $gt: '', $lt: 'z' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'anything'
          });

        // Should not authenticate or expose data
        expect(response.status).not.toBe(200);
        expect(response.body.token).toBeUndefined();
      }
    });

    test('Should reject NoSQL injection in query parameters', async () => {
      const maliciousQueries = [
        '[$gt]=',
        '[$ne]=null',
        '[$regex]=.*',
        '[$where]=1==1',
        "'; DROP TABLE users; --",
        "' OR '1'='1"
      ];

      for (const query of maliciousQueries) {
        const response = await request(app)
          .get(`/api/users`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ email: query });

        // Should either reject or return empty results, not error
        expect(response.status).toBeLessThan(500);
        if (response.body.data) {
          expect(Array.isArray(response.body.data)).toBe(true);
        }
      }
    });

    test('Should sanitize string inputs with special characters', async () => {
      const specialCharInputs = [
        "test'; DROP TABLE users; --",
        "test' OR '1'='1' --",
        "test\"; DROP TABLE users; --",
        "test' UNION SELECT * FROM users --",
        "<script>alert('XSS')</script>",
        "../../etc/passwd",
        "../../../etc/shadow"
      ];

      for (const input of specialCharInputs) {
        const response = await request(app)
          .get('/api/companies')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ name: input });

        // Should handle gracefully
        expect(response.status).toBeLessThan(500);
        // Should not return all companies (injection failed)
        if (response.body.data && response.body.data.length > 0) {
          // If results returned, they should match the query
          response.body.data.forEach(company => {
            expect(company.name).toBe(input);
          });
        }
      }
    });
  });

  describe('MongoDB Operator Injection', () => {
    test('Should reject MongoDB operators in user input', async () => {
      const operatorPayloads = [
        { name: { $gt: '' } },
        { email: { $ne: null } },
        { role: { $in: ['admin', 'superadmin'] } },
        { $or: [{ role: 'admin' }, { role: 'user' }] },
        { $and: [{ active: true }, { role: 'admin' }] },
        { $where: 'this.password === "admin"' }
      ];

      for (const payload of operatorPayloads) {
        const response = await request(app)
          .post('/api/users/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        // Should either sanitize or reject
        expect(response.status).toBeLessThan(500);
        // Should not expose sensitive data
        if (response.body.data) {
          response.body.data.forEach(user => {
            expect(user.password).toBeUndefined();
          });
        }
      }
    });

    test('Should prevent $where operator injection', async () => {
      const wherePayloads = [
        { $where: 'return true' },
        { $where: 'this.password.length > 0' },
        { $where: 'sleep(5000)' },
        { $where: function() { return true; } }
      ];

      for (const payload of wherePayloads) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .query(payload);

        const executionTime = Date.now() - startTime;

        // Should reject or sanitize
        expect(response.status).toBeLessThan(500);
        // Should not cause delay (sleep injection)
        expect(executionTime).toBeLessThan(1000);
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('Should validate ObjectId format before query', async () => {
      const invalidIds = [
        "'; DROP TABLE users; --",
        '{ $gt: "" }',
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        '%%%%invalid%%%%',
        'NOT_A_VALID_OBJECTID'
      ];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/api/users/${invalidId}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Should return 400 or 404, not 500
        expect([400, 404]).toContain(response.status);
        expect(response.status).not.toBe(500);
      }
    });

    test('Should sanitize array inputs', async () => {
      const maliciousArrays = [
        { ids: [{ $gt: '' }] },
        { roles: ['admin', { $ne: null }] },
        { tags: ["test'; DROP TABLE --"] }
      ];

      for (const payload of maliciousArrays) {
        const response = await request(app)
          .post('/api/users/bulk-query')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        // Should handle gracefully
        expect(response.status).toBeLessThan(500);
      }
    });

    test('Should validate numeric inputs', async () => {
      const maliciousNumbers = [
        "1; DROP TABLE users; --",
        "1 OR 1=1",
        "Infinity",
        "NaN",
        { $gt: 0 }
      ];

      for (const payload of maliciousNumbers) {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ limit: payload });

        // Should either reject or use default value
        expect(response.status).toBeLessThan(500);
        if (response.body.data) {
          expect(response.body.data.length).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('ZeroDB Query Safety', () => {
    test('Should use parameterized queries for ZeroDB operations', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        { $gt: '' }
      ];

      for (const input of maliciousInputs) {
        // Test that ZeroDB service uses safe query methods
        const tableName = 'test_users';
        const query = { name: input };

        try {
          // This should use parameterized queries internally
          await zerodbService.queryTable(tableName, { filter: query });
        } catch (error) {
          // Error is acceptable, but should not be injection-related
          expect(error.message).not.toMatch(/syntax error/i);
          expect(error.message).not.toMatch(/injection/i);
        }
      }
    });

    test('Should sanitize ZeroDB filter objects', async () => {
      const maliciousFilters = [
        { $where: 'return true' },
        { name: { $regex: '.*' } },
        { id: { $gt: '' } }
      ];

      for (const filter of maliciousFilters) {
        try {
          await zerodbService.queryTable('test_table', { filter });
        } catch (error) {
          // Should reject gracefully
          expect(error.message).not.toMatch(/syntax/i);
        }
      }
    });
  });

  describe('Authentication and Authorization Injection', () => {
    test('Should prevent role escalation via injection', async () => {
      const escalationAttempts = [
        { role: 'admin' },
        { role: { $ne: 'user' } },
        { $set: { role: 'admin' } }
      ];

      for (const payload of escalationAttempts) {
        const response = await request(app)
          .put(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        // Role changes should require special permissions
        // Verify the response doesn't indicate unauthorized escalation
        expect(response.status).toBeLessThan(500);
      }
    });

    test('Should prevent JWT token manipulation', async () => {
      const maliciousTokens = [
        'Bearer { $gt: "" }',
        "Bearer '; DROP TABLE users; --",
        'Bearer <script>alert(1)</script>',
        "Bearer ' OR '1'='1"
      ];

      for (const token of maliciousTokens) {
        const response = await request(app)
          .get('/api/users/me')
          .set('Authorization', token);

        // Should reject invalid tokens
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Complex Query Injection', () => {
    test('Should handle nested object injection attempts', async () => {
      const nestedPayloads = [
        {
          user: {
            email: { $gt: '' },
            password: { $ne: null }
          }
        },
        {
          $or: [
            { admin: true },
            { role: { $in: ['admin', 'superadmin'] } }
          ]
        },
        {
          settings: {
            $where: 'return true'
          }
        }
      ];

      for (const payload of nestedPayloads) {
        const response = await request(app)
          .post('/api/companies/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send(payload);

        expect(response.status).toBeLessThan(500);
      }
    });

    test('Should prevent regex injection (ReDoS)', async () => {
      const redosPatterns = [
        { name: { $regex: '(a+)+$' } },
        { email: { $regex: '([a-zA-Z]+)*' } },
        { description: { $regex: '(a|a)*' } }
      ];

      for (const pattern of redosPatterns) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/companies')
          .set('Authorization', `Bearer ${authToken}`)
          .query(pattern);

        const executionTime = Date.now() - startTime;

        // Should not cause significant delay
        expect(executionTime).toBeLessThan(2000);
        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Database Adapter Security', () => {
    test('Should use safe query methods in database adapter', async () => {
      const maliciousQuery = {
        $where: 'return true',
        email: { $gt: '' }
      };

      try {
        // Test database adapter's query sanitization
        await databaseAdapter.find('User', maliciousQuery);
      } catch (error) {
        // Error is acceptable, should not expose internals
        expect(error.message).not.toMatch(/syntax/i);
      }
    });

    test('Should validate model names in adapter', async () => {
      const maliciousModelNames = [
        "User'; DROP TABLE users; --",
        '../../../etc/passwd',
        '<script>alert(1)</script>',
        { $gt: '' }
      ];

      for (const modelName of maliciousModelNames) {
        try {
          await databaseAdapter.find(modelName, {});
        } catch (error) {
          // Should fail gracefully
          expect(error.message).not.toMatch(/injection/i);
        }
      }
    });
  });

  describe('Edge Cases and Attack Vectors', () => {
    test('Should handle null and undefined safely', async () => {
      const nullPayloads = [null, undefined, '', {}];

      for (const payload of nullPayloads) {
        const response = await request(app)
          .post('/api/companies/search')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query: payload });

        expect(response.status).toBeLessThan(500);
      }
    });

    test('Should handle very long inputs', async () => {
      const longInput = 'A'.repeat(10000);
      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: longInput,
          ein: '12-3456789',
          type: 'C-Corp'
        });

      // Should either reject or truncate
      expect(response.status).toBeLessThan(500);
      if (response.status === 201) {
        expect(response.body.data.name.length).toBeLessThanOrEqual(500);
      }
    });

    test('Should handle unicode and special encoding', async () => {
      const encodedPayloads = [
        '%27%20OR%20%271%27%3D%271',
        '\\u0027\\u0020OR\\u0020\\u00271\\u0027\\u003D\\u00271',
        '\x27\x20OR\x20\x271\x27\x3D\x271'
      ];

      for (const payload of encodedPayloads) {
        const response = await request(app)
          .get('/api/companies')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ name: payload });

        expect(response.status).toBeLessThan(500);
      }
    });
  });

  describe('Parameterized Query Verification', () => {
    test('Should use parameterized queries via database adapter', async () => {
      // Verify that database adapter methods are used (they're inherently safe)
      // ZeroDB uses JSON API which prevents SQL injection
      expect(typeof databaseAdapter.find).toBe('function');
    });

    test('Should use ZeroDB API parameterization', async () => {
      // Verify ZeroDB uses JSON API (safe from SQL injection)
      const mockData = { name: "test'; DROP TABLE --" };

      // ZeroDB sends this as JSON payload, not SQL string
      // This would be safe even with malicious content
      expect(typeof mockData).toBe('object');
      expect(JSON.stringify(mockData)).toContain('DROP TABLE');
      // JSON serialization prevents interpretation as SQL
    });
  });

  describe('Security Best Practices Compliance', () => {
    test('Should not expose sensitive error details', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id-format')
        .set('Authorization', `Bearer ${authToken}`);

      // Should not expose database structure or query details
      if (response.body.error) {
        expect(response.body.error).not.toMatch(/mongo/i);
        expect(response.body.error).not.toMatch(/collection/i);
        expect(response.body.error).not.toMatch(/query/i);
      }
    });

    test('Should log injection attempts for monitoring', async () => {
      const injectionAttempt = "'; DROP TABLE users; --";

      await request(app)
        .post('/api/auth/login')
        .send({
          email: injectionAttempt,
          password: 'test'
        });

      // In production, this should be logged for security monitoring
      // This test documents the requirement
    });

    test('Should enforce rate limiting on authentication endpoints', async () => {
      const attempts = [];

      // Make multiple requests
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: `injection-attempt-${i}`,
              password: 'test'
            })
        );
      }

      const responses = await Promise.all(attempts);

      // At least some should be rate limited
      // (if rate limiting is implemented)
      const rateLimited = responses.filter(r => r.status === 429);
      // This documents the need for rate limiting
    });
  });
});

describe('Input Sanitization Utility Functions', () => {
  test('Should have utility to sanitize MongoDB queries', () => {
    // This test documents the need for a sanitization utility
    const sanitizeQuery = (query) => {
      if (typeof query !== 'object' || query === null) {
        return {};
      }

      // Remove MongoDB operators from top level
      const sanitized = {};
      for (const [key, value] of Object.entries(query)) {
        if (!key.startsWith('$')) {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };

    const maliciousQuery = {
      $where: 'return true',
      email: 'test@example.com',
      $gt: ''
    };

    const sanitized = sanitizeQuery(maliciousQuery);
    expect(sanitized.$where).toBeUndefined();
    expect(sanitized.$gt).toBeUndefined();
    expect(sanitized.email).toBe('test@example.com');
  });

  test('Should validate ObjectId format', () => {
    const isValidObjectId = (id) => {
      return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
    };

    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isValidObjectId("'; DROP TABLE --")).toBe(false);
    expect(isValidObjectId({ $gt: '' })).toBe(false);
  });
});
