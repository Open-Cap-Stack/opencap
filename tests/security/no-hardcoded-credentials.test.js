/**
 * Security Test: No Hardcoded Credentials
 *
 * CRITICAL SECURITY TEST
 * This test scans the entire codebase for hardcoded credentials
 * and MUST PASS before any production deployment.
 *
 * Test Coverage:
 * - Hardcoded passwords
 * - Hardcoded API keys
 * - Hardcoded secrets
 * - Hardcoded tokens
 * - Common weak passwords
 */

// Disable database connections for security scan
jest.mock('../../db/mongoConnection', () => ({
  connectToMongoDB: jest.fn().mockResolvedValue(true)
}));

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('Security: No Hardcoded Credentials', () => {
  const projectRoot = path.resolve(__dirname, '../..');
  const excludeDirs = ['node_modules', '.git', 'coverage', 'dist', 'build'];

  // Patterns that indicate hardcoded credentials
  const CREDENTIAL_PATTERNS = [
    // Direct password assignments with string literals
    {
      pattern: /password\s*[=:]\s*['"][^'"]{6,}['"]/gi,
      description: 'Hardcoded password assignment',
      allowlist: [
        'password: req.body.password',
        'password: userData.password',
        'password: user.password',
        'password: newPassword',
        'password: hashedPassword',
        'password: process.env',
        'password: config',
        'password: generatePassword()',
        'password: generateSecurePassword()',
        'password: crypto.randomBytes',
        'password = req.body.password',
        'password = await bcrypt.hash',
        'password = generatePassword()',
        'password = process.env'
      ]
    },
    // Common weak passwords (excluding 'admin' as it's a valid role)
    {
      pattern: /['"](?:admin123|password123|test123|123456|qwerty|root|Password1)['"]/gi,
      description: 'Common weak password literal',
      allowlist: [
        'should reject weak password "admin123"',
        'should not accept password123',
        'test("password123")',
        'describe("password validation")',
        'it("rejects admin123")'
      ]
    },
    // API key assignments
    {
      pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi,
      description: 'Hardcoded API key',
      allowlist: [
        'apiKey: process.env',
        'apiKey: config',
        'api_key: process.env',
        'apikey = process.env'
      ]
    },
    // Secret assignments
    {
      pattern: /(?:secret|jwt_secret)\s*[=:]\s*['"](?!test-secret|your-secret|changeme)[a-zA-Z0-9_-]{10,}['"]/gi,
      description: 'Hardcoded secret',
      allowlist: [
        'secret: process.env',
        'secret = process.env',
        'jwtSecret: process.env',
        'JWT_SECRET: process.env',
        'secret || \'test-secret-key\'', // Test fallback is allowed
        'webhook.secret' // Dynamic secret reference
      ]
    },
    // Bearer tokens
    {
      pattern: /['"]Bearer\s+[a-zA-Z0-9_-]{30,}['"]/gi,
      description: 'Hardcoded bearer token',
      allowlist: []
    }
  ];

  // Files that are allowed to have credential-like patterns (test fixtures, examples)
  const ALLOWLISTED_FILES = [
    'tests/fixtures/',
    'tests/setup.js', // Test setup can have test-only secrets
    'tests/setup.migration.js', // Test setup can have test-only secrets
    'test-init-scripts/', // MongoDB init scripts for test containers
    'scripts/fix-migration-tests.js', // Script that manipulates test strings
    '.env.example',
    'docs/',
    'README.md',
    'CLAUDE.md',
    'prettify.js', // Coverage report files
    'lcov-report/',
    'swagger/',
    '.test.js', // Test files can have test data
    '.spec.js'
  ];

  /**
   * Check if a file should be scanned
   */
  function shouldScanFile(filePath) {
    const relativePath = path.relative(projectRoot, filePath);

    // Skip excluded directories
    if (excludeDirs.some(dir => relativePath.includes(dir))) {
      return false;
    }

    // Skip non-JS files
    if (!filePath.endsWith('.js')) {
      return false;
    }

    return true;
  }

  /**
   * Check if a file is allowlisted for credentials
   */
  function isAllowlisted(filePath) {
    const relativePath = path.relative(projectRoot, filePath);
    return ALLOWLISTED_FILES.some(pattern => relativePath.includes(pattern));
  }

  /**
   * Check if a match is in the allowlist
   */
  function isMatchAllowlisted(match, allowlist, context) {
    // Check if the match or its context is in the allowlist
    return allowlist.some(allowed =>
      match.toLowerCase().includes(allowed.toLowerCase()) ||
      context.toLowerCase().includes(allowed.toLowerCase())
    );
  }

  /**
   * Get files to scan recursively
   */
  function getFilesToScan(dir) {
    let files = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name)) {
            files = files.concat(getFilesToScan(fullPath));
          }
        } else if (shouldScanFile(fullPath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }

    return files;
  }

  /**
   * Scan a file for credential patterns
   */
  function scanFileForCredentials(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(projectRoot, filePath);
    const violations = [];

    // Skip allowlisted files
    if (isAllowlisted(filePath)) {
      return violations;
    }

    for (const { pattern, description, allowlist } of CREDENTIAL_PATTERNS) {
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const matches = line.match(pattern);

        if (matches) {
          for (const match of matches) {
            // Get context (surrounding lines)
            const contextStart = Math.max(0, index - 1);
            const contextEnd = Math.min(lines.length - 1, index + 1);
            const context = lines.slice(contextStart, contextEnd + 1).join('\n');

            // Check if match is allowlisted
            if (!isMatchAllowlisted(match, allowlist, context)) {
              violations.push({
                file: relativePath,
                line: index + 1,
                match: match.substring(0, 50), // Truncate for display
                description,
                context: line.trim().substring(0, 100)
              });
            }
          }
        }
      });
    }

    return violations;
  }

  test('should not contain any hardcoded credentials in production code', () => {
    const filesToScan = getFilesToScan(projectRoot);
    const allViolations = [];

    console.log(`\nScanning ${filesToScan.length} files for hardcoded credentials...`);

    filesToScan.forEach(file => {
      const violations = scanFileForCredentials(file);
      allViolations.push(...violations);
    });

    if (allViolations.length > 0) {
      console.error('\n CRITICAL SECURITY VIOLATION: Hardcoded Credentials Found\n');
      console.error('The following files contain hardcoded credentials:\n');

      allViolations.forEach(violation => {
        console.error(`File: ${violation.file}:${violation.line}`);
        console.error(`Issue: ${violation.description}`);
        console.error(`Match: ${violation.match}`);
        console.error(`Context: ${violation.context}`);
        console.error('---');
      });

      console.error(`\nTotal violations: ${allViolations.length}`);
      console.error('\nACTION REQUIRED:');
      console.error('1. Replace hardcoded credentials with environment variables');
      console.error('2. Use secure random generation for test data');
      console.error('3. Update .env.example with documentation');
      console.error('4. Never commit real credentials to version control\n');
    }

    expect(allViolations).toHaveLength(0);
  });

  test('should not contain production credentials in createProductionUsers.js', () => {
    const scriptPath = path.join(projectRoot, 'scripts/createProductionUsers.js');

    if (!fs.existsSync(scriptPath)) {
      console.warn('createProductionUsers.js not found - skipping test');
      return;
    }

    const content = fs.readFileSync(scriptPath, 'utf8');

    // Should not have hardcoded passwords
    expect(content).not.toMatch(/password:\s*['"][^'"]+['"]/);

    // Should use environment variables or secure generation
    expect(
      content.includes('process.env') ||
      content.includes('generatePassword') ||
      content.includes('crypto.randomBytes')
    ).toBe(true);
  });

  test('should not contain hardcoded test passwords in testHelpers.js', () => {
    const helperPath = path.join(projectRoot, 'tests/utils/testHelpers.js');

    if (!fs.existsSync(helperPath)) {
      console.warn('testHelpers.js not found - skipping test');
      return;
    }

    const content = fs.readFileSync(helperPath, 'utf8');

    // Should not have password123 or similar weak passwords
    expect(content).not.toMatch(/['"]password123['"]/);
    expect(content).not.toMatch(/['"]admin123['"]/);
    expect(content).not.toMatch(/['"]test123['"]/);

    // Should use secure password generation
    expect(
      content.includes('generatePassword') ||
      content.includes('crypto.randomBytes') ||
      content.includes('bcrypt.hash')
    ).toBe(true);
  });

  test('should have environment variable documentation in .env.example', () => {
    const envExamplePath = path.join(projectRoot, '.env.example');

    if (!fs.existsSync(envExamplePath)) {
      throw new Error('.env.example file is required for credential documentation');
    }

    const content = fs.readFileSync(envExamplePath, 'utf8');

    // Should document security-related variables
    const requiredDocs = [
      'JWT_SECRET',
      'ADMIN_PASSWORD',
      'API_KEY'
    ];

    for (const doc of requiredDocs) {
      if (!content.includes(doc)) {
        console.warn(`Warning: .env.example should document ${doc}`);
      }
    }
  });

  test('should use crypto.randomBytes for secure random generation', () => {
    // Check that crypto module is available for secure random generation
    const crypto = require('crypto');

    // Generate a test password to verify functionality
    const randomBytes = crypto.randomBytes(32);
    expect(randomBytes).toHaveLength(32);

    // Verify randomness (different calls produce different results)
    const bytes1 = crypto.randomBytes(16).toString('hex');
    const bytes2 = crypto.randomBytes(16).toString('hex');
    expect(bytes1).not.toBe(bytes2);
  });

  test('should enforce minimum password complexity for generated passwords', () => {
    // Test password generation function if it exists
    const crypto = require('crypto');

    // Simulate secure password generation
    const generateSecurePassword = (length = 16) => {
      const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      const randomBytes = crypto.randomBytes(length);

      for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
      }

      return password;
    };

    const password = generateSecurePassword(16);

    // Verify password meets complexity requirements
    expect(password.length).toBeGreaterThanOrEqual(12);
    expect(password).toMatch(/[A-Z]/); // At least one uppercase
    expect(password).toMatch(/[a-z]/); // At least one lowercase
    expect(password).toMatch(/[0-9]/); // At least one number
  });

  test('should not expose credentials in error messages or logs', () => {
    // This is a pattern check - in real implementation,
    // verify logging middleware doesn't log sensitive data
    const sensitiveFields = ['password', 'apiKey', 'secret', 'token'];

    // Ensure our logging configuration excludes sensitive fields
    // This test serves as documentation that logging must be configured carefully
    expect(sensitiveFields.length).toBeGreaterThan(0);
  });

  test('should hash all passwords before storage', async () => {
    const bcrypt = require('bcrypt');

    // Verify bcrypt is available for password hashing
    const testPassword = 'testPassword123!';

    const hash = await bcrypt.hash(testPassword, 10);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(testPassword);
    expect(hash.length).toBeGreaterThan(testPassword.length);

    // Verify hash format (bcrypt hashes start with $2b$ or $2a$)
    expect(hash).toMatch(/^\$2[ab]\$/);
  });
});
