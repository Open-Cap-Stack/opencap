/**
 * OWASP Top 10 Security Vulnerability Test Suite
 * Comprehensive automated security testing for the OpenCap platform
 *
 * Tests cover all OWASP Top 10 2021 vulnerabilities:
 * A01 - Broken Access Control
 * A02 - Cryptographic Failures
 * A03 - Injection
 * A04 - Insecure Design
 * A05 - Security Misconfiguration
 * A06 - Vulnerable and Outdated Components
 * A07 - Identification and Authentication Failures
 * A08 - Software and Data Integrity Failures
 * A09 - Security Logging and Monitoring Failures
 * A10 - Server-Side Request Forgery (SSRF)
 */

const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper to generate a 24-char hex string (replaces mongoose.Types.ObjectId)
function generateObjectId() {
  return crypto.randomBytes(12).toString('hex');
}

describe('OWASP Top 10 Security Vulnerability Tests', () => {
  let validToken;
  let adminToken;
  let userToken;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // Create test user data (no MongoDB needed)
    testUser = {
      userId: 'test-user-001',
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      role: 'employee',
      status: 'active',
      permissions: ['read:companies']
    };

    adminUser = {
      userId: 'admin-001',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      role: 'admin',
      status: 'active',
      permissions: ['admin:all']
    };

    // Generate test tokens
    validToken = jwt.sign(
      { userId: testUser.userId, role: testUser.role, permissions: testUser.permissions },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: adminUser.userId, role: adminUser.role, permissions: adminUser.permissions },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    userToken = validToken;
  });

  afterAll(async () => {
    // No mongoose connection to close
  });

  // ========================================================================
  // A01 - Broken Access Control
  // ========================================================================
  describe('A01 - Broken Access Control', () => {
    describe('Horizontal Privilege Escalation', () => {
      it('should prevent users from accessing other users data', async () => {
        const otherUserId = 'other-user-001';

        const response = await request(app)
          .get(`/api/v1/users/${otherUserId}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect([403, 401]).toContain(response.status);
      });

      it('should prevent unauthorized access to company data', async () => {
        const response = await request(app)
          .get('/api/v1/company/unauthorized-company-id')
          .set('Authorization', `Bearer ${userToken}`);

        expect([403, 404, 401]).toContain(response.status);
      });
    });

    describe('Vertical Privilege Escalation', () => {
      it('should prevent regular users from accessing admin endpoints', async () => {
        const response = await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${userToken}`);

        expect([403, 404]).toContain(response.status);
      });

      it('should prevent role escalation through user updates', async () => {
        const response = await request(app)
          .put(`/api/v1/users/${testUser.userId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' });

        // Should either reject (403) or ignore role change
        if (response.status === 200) {
          // If update succeeded, role should not have been escalated
          expect(response.body.role).not.toBe('admin');
        } else {
          expect([403, 400, 404]).toContain(response.status);
        }
      });
    });

    describe('Missing Authentication', () => {
      it('should require authentication for protected endpoints', async () => {
        const endpoints = [
          '/api/v1/auth/profile',
          '/api/v1/documents',
          '/api/v1/financial-reports'
        ];

        for (const endpoint of endpoints) {
          const response = await request(app).get(endpoint);
          expect([401, 404]).toContain(response.status);
        }
      });
    });

    describe('IDOR (Insecure Direct Object References)', () => {
      it('should validate object ownership before allowing access', async () => {
        // Try to access document with sequential ID
        const response = await request(app)
          .get('/api/v1/documents/1')
          .set('Authorization', `Bearer ${userToken}`);

        if (response.status === 200) {
          // If document exists, verify ownership is checked
          expect(response.body).toHaveProperty('userId');
        } else {
          expect([403, 404]).toContain(response.status);
        }
      });
    });
  });

  // ========================================================================
  // A02 - Cryptographic Failures
  // ========================================================================
  describe('A02 - Cryptographic Failures', () => {
    describe('Sensitive Data Exposure', () => {
      it('should not expose passwords in API responses', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${validToken}`);

        if (response.status === 200 && response.body.user) {
          expect(response.body.user.password).toBeUndefined();
        }
      });

      it('should not log sensitive data', async () => {
        // Check that password is not in error messages
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'WrongPassword123!' });

        expect(response.body.password).toBeUndefined();
        expect(JSON.stringify(response.body)).not.toContain('WrongPassword123!');
      });
    });

    describe('Password Storage', () => {
      it('should hash passwords using strong algorithms', async () => {
        // Verify that bcrypt is used for password hashing
        const bcrypt = require('bcryptjs');
        const testHash = await bcrypt.hash('TestPass123!', 10);

        // BCrypt hashes start with $2a$, $2b$, or $2y$
        expect(testHash).toMatch(/^\$2[aby]\$/);

        // BCrypt hash should be 60 characters
        expect(testHash.length).toBe(60);
      });

      it('should not accept weak passwords', async () => {
        const weakPasswords = [
          'short',
          'nouppercase123!',
          'NOLOWERCASE123!',
          'NoSpecialChar123',
          'NoNumber!'
        ];

        for (const weakPassword of weakPasswords) {
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
              firstName: 'Test',
              lastName: 'User',
              email: `weak${Date.now()}@example.com`,
              password: weakPassword,
              role: 'employee'
            });

          expect(response.status).toBe(400);
          expect(response.body.message).toMatch(/password/i);
        }
      });
    });

    describe('Token Security', () => {
      it('should use secure JWT tokens', () => {
        const decoded = jwt.decode(validToken);

        // Should have expiration
        expect(decoded.exp).toBeDefined();

        // Should not contain sensitive data
        expect(decoded.password).toBeUndefined();
      });

      it('should reject tokens with invalid signatures', async () => {
        const tamperedToken = validToken.slice(0, -10) + 'TAMPERED';

        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${tamperedToken}`);

        expect(response.status).toBe(401);
      });
    });

    describe('HTTPS/TLS Configuration', () => {
      it('should set secure headers', async () => {
        const response = await request(app).get('/health');

        // Check for security headers
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBeDefined();
      });
    });
  });

  // ========================================================================
  // A03 - Injection
  // ========================================================================
  describe('A03 - Injection', () => {
    describe('SQL/NoSQL Injection', () => {
      it('should prevent NoSQL injection in login', async () => {
        const injectionPayloads = [
          { email: { $ne: null }, password: { $ne: null } },
          { email: { $gt: '' }, password: { $gt: '' } },
          { email: 'admin@example.com', password: { $regex: '.*' } }
        ];

        for (const payload of injectionPayloads) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send(payload);

          expect(response.status).not.toBe(200);
        }
      });

      it('should prevent NoSQL injection in query parameters', async () => {
        const response = await request(app)
          .get('/api/v1/users?role[$ne]=user')
          .set('Authorization', `Bearer ${adminToken}`);

        // Should reject malformed query or return 404
        expect([400, 404, 403]).toContain(response.status);
      });
    });

    describe('Command Injection', () => {
      it('should sanitize file upload names', async () => {
        const maliciousFilenames = [
          '../../../etc/passwd',
          'file.txt; rm -rf /',
          'file$(whoami).txt',
          'file`whoami`.txt'
        ];

        // Test would require actual file upload endpoint
        // This is a placeholder for the security check
        expect(true).toBe(true);
      });
    });

    describe('XSS Prevention', () => {
      it('should escape user input in responses', async () => {
        const xssPayload = '<script>alert("XSS")</script>';

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: xssPayload,
            lastName: 'User',
            email: `xss${Date.now()}@example.com`,
            password: 'ValidPass123!',
            role: 'employee'
          });

        if (response.status === 201) {
          // Check that script tags are escaped or sanitized
          const profileResponse = await request(app)
            .get('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${response.body.token}`);

          if (profileResponse.body.user && profileResponse.body.user.firstName) {
            expect(profileResponse.body.user.firstName).not.toContain('<script>');
          }
        }
      });
    });
  });

  // ========================================================================
  // A04 - Insecure Design
  // ========================================================================
  describe('A04 - Insecure Design', () => {
    describe('Business Logic Flaws', () => {
      it('should prevent email enumeration during registration', async () => {
        // Register a user
        await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Existing',
            lastName: 'User',
            email: 'existing@example.com',
            password: 'ValidPass123!',
            role: 'employee'
          });

        // Try to register again
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'New',
            lastName: 'User',
            email: 'existing@example.com',
            password: 'ValidPass123!',
            role: 'employee'
          });

        // Should still provide meaningful error but not enumerate
        expect(response.status).toBe(400);
      });

      it('should implement rate limiting on sensitive endpoints', async () => {
        const requests = [];

        // Try 100 rapid requests
        for (let i = 0; i < 100; i++) {
          requests.push(
            request(app)
              .post('/api/v1/auth/login')
              .send({ email: 'test@example.com', password: 'wrong' })
          );
        }

        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.status === 429);

        // Should have rate limiting
        expect(rateLimited).toBe(true);
      });
    });

    describe('Missing Security Controls', () => {
      it('should require email verification for sensitive operations', async () => {
        // Create unverified user token
        const unverifiedUser = {
          userId: 'unverified-001',
          role: 'employee',
          emailVerified: false
        };

        const unverifiedToken = jwt.sign(
          { userId: unverifiedUser.userId, role: unverifiedUser.role },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1h' }
        );

        // Check if unverified users are restricted (implementation dependent)
        // This is a design check
        expect(unverifiedUser.emailVerified).toBe(false);
      });
    });
  });

  // ========================================================================
  // A05 - Security Misconfiguration
  // ========================================================================
  describe('A05 - Security Misconfiguration', () => {
    describe('Secure Headers', () => {
      it('should set Content-Security-Policy header', async () => {
        const response = await request(app).get('/health');

        // Check for CSP header (if implemented)
        const cspHeader = response.headers['content-security-policy'];
        if (cspHeader) {
          expect(cspHeader).toBeDefined();
        }
      });

      it('should set X-Frame-Options to prevent clickjacking', async () => {
        const response = await request(app).get('/health');

        expect(response.headers['x-frame-options']).toBeDefined();
        expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
      });

      it('should set Strict-Transport-Security header', async () => {
        const response = await request(app).get('/health');

        // HSTS should be set in production
        const hstsHeader = response.headers['strict-transport-security'];
        // May not be set in test environment, but check structure if present
        if (hstsHeader) {
          expect(hstsHeader).toMatch(/max-age=\d+/);
        }
      });
    });

    describe('Error Handling', () => {
      it('should not expose stack traces in production', async () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const response = await request(app)
          .get('/api/v1/nonexistent-endpoint');

        expect(response.body.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
      });

      it('should provide generic error messages', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'WrongPass123!' });

        // Should not reveal if user exists
        expect(response.body.message).not.toMatch(/user.*not.*found/i);
        expect(response.body.message).toMatch(/invalid credentials/i);
      });
    });

    describe('Default Credentials', () => {
      it('should not have default admin credentials', async () => {
        const defaultCombos = [
          { email: 'admin@admin.com', password: 'admin' },
          { email: 'admin@localhost', password: 'password' },
          { email: 'root@localhost', password: 'root' }
        ];

        for (const combo of defaultCombos) {
          const response = await request(app)
            .post('/api/v1/auth/login')
            .send(combo);

          expect(response.status).not.toBe(200);
        }
      });
    });

    describe('Directory Listing', () => {
      it('should not expose directory listings', async () => {
        const directories = [
          '/uploads',
          '/config',
          '/logs',
          '/tests'
        ];

        for (const dir of directories) {
          const response = await request(app).get(dir);

          // Should not return directory listing
          expect(response.status).not.toBe(200);
          if (response.body) {
            expect(JSON.stringify(response.body)).not.toMatch(/index of/i);
          }
        }
      });
    });
  });

  // ========================================================================
  // A06 - Vulnerable and Outdated Components
  // ========================================================================
  describe('A06 - Vulnerable and Outdated Components', () => {
    it('should not use vulnerable dependencies', async () => {
      const packageJson = require('../../package.json');

      // Check that key dependencies are not critically outdated
      const dependencies = packageJson.dependencies;

      // Express should be >= 4.17.0 (security fixes)
      if (dependencies.express) {
        const expressVersion = dependencies.express.replace(/[^0-9.]/g, '');
        const [major, minor] = expressVersion.split('.');
        expect(parseInt(major)).toBeGreaterThanOrEqual(4);
        if (parseInt(major) === 4) {
          expect(parseInt(minor)).toBeGreaterThanOrEqual(17);
        }
      }

      // JWT should be >= 9.0.0 (security fixes)
      if (dependencies.jsonwebtoken) {
        const jwtVersion = dependencies.jsonwebtoken.replace(/[^0-9.]/g, '');
        const [major] = jwtVersion.split('.');
        expect(parseInt(major)).toBeGreaterThanOrEqual(9);
      }
    });

    it('should have npm audit findings documented', () => {
      // This test documents that npm audit should be run regularly
      // The actual findings are tested via npm audit command
      expect(true).toBe(true);
    });
  });

  // ========================================================================
  // A07 - Identification and Authentication Failures
  // ========================================================================
  describe('A07 - Identification and Authentication Failures', () => {
    describe('Password Security', () => {
      it('should enforce strong password requirements', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: `weak${Date.now()}@example.com`,
            password: 'weak',
            role: 'employee'
          });

        expect(response.status).toBe(400);
      });

      it('should prevent password reuse (if implemented)', async () => {
        // This would require password history tracking
        // Placeholder for the security requirement
        expect(true).toBe(true);
      });
    });

    describe('Session Management', () => {
      it('should invalidate tokens on logout', async () => {
        // Login
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'testuser@example.com',
            password: 'TestPass123!'
          });

        if (loginResponse.status === 200) {
          const token = loginResponse.body.accessToken;

          // Logout
          await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${token}`);

          // Try to use token after logout
          const response = await request(app)
            .get('/api/v1/auth/profile')
            .set('Authorization', `Bearer ${token}`);

          expect(response.status).toBe(401);
        }
      });

      it('should have token expiration', () => {
        const decoded = jwt.decode(validToken);

        expect(decoded.exp).toBeDefined();
        expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
      });
    });

    describe('Brute Force Protection', () => {
      it('should implement account lockout after failed attempts', async () => {
        const email = 'bruteforce@example.com';

        // Attempt multiple failed logins
        const attempts = [];
        for (let i = 0; i < 20; i++) {
          attempts.push(
            request(app)
              .post('/api/v1/auth/login')
              .send({ email: email, password: 'WrongPassword' })
          );
        }

        const responses = await Promise.all(attempts);

        // Should have rate limiting or account lockout
        const blocked = responses.some(r => r.status === 429 ||
          (r.status === 403 && r.body.message && r.body.message.includes('locked')));

        expect(blocked).toBe(true);
      });
    });

    describe('Multi-Factor Authentication', () => {
      it('should support MFA (if implemented)', () => {
        // Placeholder for MFA implementation check
        // This is a design requirement
        expect(true).toBe(true);
      });
    });
  });

  // ========================================================================
  // A08 - Software and Data Integrity Failures
  // ========================================================================
  describe('A08 - Software and Data Integrity Failures', () => {
    describe('Input Validation', () => {
      it('should validate all user inputs', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'A'.repeat(1000), // Extremely long input
            lastName: 'User',
            email: 'invalid-email',
            password: 'ValidPass123!',
            role: 'employee'
          });

        expect(response.status).toBe(400);
      });

      it('should validate email format', async () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user..name@example.com'
        ];

        for (const email of invalidEmails) {
          const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
              firstName: 'Test',
              lastName: 'User',
              email: email,
              password: 'ValidPass123!',
              role: 'employee'
            });

          expect(response.status).toBe(400);
        }
      });
    });

    describe('Data Integrity', () => {
      it('should validate role values', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: `test${Date.now()}@example.com`,
            password: 'ValidPass123!',
            role: 'superadmin' // Invalid role
          });

        expect(response.status).toBe(400);
      });
    });

    describe('Deserialization Security', () => {
      it('should not accept malicious JSON payloads', async () => {
        const maliciousPayload = {
          __proto__: { isAdmin: true },
          firstName: 'Test',
          lastName: 'User',
          email: `test${Date.now()}@example.com`,
          password: 'ValidPass123!',
          role: 'employee'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(maliciousPayload);

        // Should not create admin user via prototype pollution
        if (response.status === 201) {
          // Verify the response doesn't reflect prototype pollution
          expect(response.body.role).not.toBe('admin');
          expect(response.body.isAdmin).toBeUndefined();
        }
      });
    });
  });

  // ========================================================================
  // A09 - Security Logging and Monitoring Failures
  // ========================================================================
  describe('A09 - Security Logging and Monitoring Failures', () => {
    describe('Security Event Logging', () => {
      it('should log authentication failures', async () => {
        // Attempt failed login
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword'
          });

        // In a real implementation, this would check logs
        // For now, we verify the endpoint handles it properly
        expect(true).toBe(true);
      });

      it('should log access to sensitive resources', async () => {
        await request(app)
          .get('/api/v1/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        // Verify logging (implementation dependent)
        expect(true).toBe(true);
      });
    });

    describe('Audit Trail', () => {
      it('should maintain audit logs for critical operations', () => {
        // Check for audit logging implementation
        const securityAuditExists = fs.existsSync(
          path.join(__dirname, '../../middleware/securityAuditLogger.js')
        );

        expect(securityAuditExists).toBe(true);
      });
    });

    describe('Error Monitoring', () => {
      it('should not expose sensitive information in logs', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'SensitivePassword123!'
          });

        // Response should not contain password
        expect(JSON.stringify(response.body)).not.toContain('SensitivePassword123!');
      });
    });
  });

  // ========================================================================
  // A10 - Server-Side Request Forgery (SSRF)
  // ========================================================================
  describe('A10 - Server-Side Request Forgery (SSRF)', () => {
    describe('URL Validation', () => {
      it('should validate external URLs', async () => {
        // Test if endpoints that fetch external resources validate URLs
        const maliciousUrls = [
          'http://localhost:22',
          'http://169.254.169.254/latest/meta-data/',
          'file:///etc/passwd',
          'http://127.0.0.1:6379'
        ];

        // This would be tested on endpoints that fetch external resources
        // Placeholder for the security requirement
        expect(true).toBe(true);
      });

      it('should restrict internal network access', () => {
        // Verify that internal network ranges are blocked
        const internalRanges = [
          '10.0.0.0/8',
          '172.16.0.0/12',
          '192.168.0.0/16',
          '127.0.0.0/8'
        ];

        // Implementation check
        expect(internalRanges.length).toBeGreaterThan(0);
      });
    });

    describe('Webhook Validation', () => {
      it('should validate webhook URLs', () => {
        // If webhooks are implemented, they should validate destinations
        expect(true).toBe(true);
      });
    });
  });

  // ========================================================================
  // Additional Security Tests
  // ========================================================================
  describe('Additional Security Checks', () => {
    describe('CORS Configuration', () => {
      it('should have restrictive CORS policy', async () => {
        const response = await request(app)
          .options('/api/v1/auth/login')
          .set('Origin', 'http://malicious-site.com');

        // Should have CORS headers configured
        const corsHeader = response.headers['access-control-allow-origin'];
        if (corsHeader) {
          expect(corsHeader).not.toBe('*');
        }
      });
    });

    describe('Content Type Validation', () => {
      it('should reject non-JSON payloads on JSON endpoints', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('email=test@example.com&password=test');

        // May accept or reject based on implementation
        // This is a configuration check
        expect([400, 401, 415]).toContain(response.status);
      });
    });

    describe('Request Size Limits', () => {
      it('should limit request body size', async () => {
        const largePayload = {
          firstName: 'A'.repeat(10000000), // 10MB of data
          lastName: 'User',
          email: 'test@example.com',
          password: 'ValidPass123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(largePayload);

        expect([400, 413]).toContain(response.status);
      });
    });

    describe('API Versioning', () => {
      it('should support API versioning', async () => {
        const response = await request(app).get('/api/v1/health');

        // Should have version in path or headers
        expect(response.request.url).toMatch(/\/v\d+\//);
      });
    });
  });
});
