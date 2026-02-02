# Credential Management & Security Best Practices

## Overview

This document outlines the mandatory security practices for credential management in the OpenCap platform. Following these practices is **CRITICAL** for production security.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Password Management](#password-management)
3. [API Key Management](#api-key-management)
4. [Secrets Management](#secrets-management)
5. [Environment Variables](#environment-variables)
6. [Testing Credentials](#testing-credentials)
7. [Production Deployment](#production-deployment)
8. [Credential Rotation](#credential-rotation)
9. [Automated Security Checks](#automated-security-checks)

---

## Core Principles

### NEVER Hardcode Credentials

**Rule**: No credentials, passwords, API keys, tokens, or secrets should ever be hardcoded in source code.

**Why**: Hardcoded credentials:
- Are exposed in version control history
- Can be accidentally leaked in public repositories
- Cannot be rotated without code changes
- Violate security compliance standards (SOC2, ISO 27001, PCI DSS)

### Always Use Environment Variables

**Rule**: All sensitive configuration must be loaded from environment variables.

**Example**:

```javascript
// WRONG - Hardcoded credential
const password = 'admin123';
const apiKey = 'sk_live_abc123xyz456';

// CORRECT - Environment variable
const password = process.env.ADMIN_PASSWORD;
const apiKey = process.env.API_KEY;

// BEST - Environment variable with validation
const password = process.env.ADMIN_PASSWORD;
if (!password) {
  throw new Error('ADMIN_PASSWORD environment variable is required');
}
```

### Use Secure Random Generation

**Rule**: For test data or temporary credentials, use cryptographically secure random generation.

**Example**:

```javascript
const crypto = require('crypto');

// Generate secure random password
function generateSecurePassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one of each type
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];

  // Fill remaining length
  for (let i = 4; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Shuffle password
  return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
}
```

---

## Password Management

### Password Complexity Requirements

All passwords must meet the following requirements:

- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*)
- No common dictionary words
- No sequential patterns (123456, qwerty)

### Password Hashing

**Rule**: All passwords MUST be hashed before storage using bcrypt with a minimum cost factor of 10.

**Example**:

```javascript
const bcrypt = require('bcrypt');

// Hash password before storage
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// Verify password during login
const isValid = await bcrypt.compare(plainPassword, hashedPassword);
```

### Password Storage

**NEVER**:
- Store passwords in plain text
- Store passwords in reversible encryption
- Log passwords in application logs
- Return passwords in API responses
- Include passwords in error messages

**ALWAYS**:
- Hash passwords with bcrypt
- Use schema methods to exclude passwords from JSON output
- Implement password field exclusion in queries

---

## API Key Management

### API Key Format

API keys should:
- Be at least 32 characters long
- Use cryptographically random generation
- Include a prefix to identify the key type (e.g., `sk_live_`, `pk_test_`)
- Be stored securely in environment variables

### API Key Generation

```javascript
const crypto = require('crypto');

// Generate API key
function generateApiKey(prefix = 'sk_live_') {
  const randomBytes = crypto.randomBytes(32);
  return prefix + randomBytes.toString('hex');
}
```

### API Key Security

**NEVER**:
- Commit API keys to version control
- Log API keys in application logs
- Send API keys in GET request parameters
- Include API keys in client-side code

**ALWAYS**:
- Store API keys in environment variables
- Rotate API keys regularly
- Use different keys for different environments
- Implement key expiration
- Monitor API key usage

---

## Secrets Management

### JWT Secrets

**Rule**: JWT secrets must be:
- At least 32 characters long
- Cryptographically random
- Different for each environment
- Never shared across environments

**Generation**:

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Credentials

**Rule**: Database credentials must:
- Use strong passwords (minimum 16 characters)
- Be stored in environment variables
- Never be committed to version control
- Be different for each environment
- Be rotated regularly

### Third-Party Service Credentials

**Rule**: For external services (AWS, SendGrid, etc.):
- Use service-specific API keys
- Implement least-privilege access
- Store in environment variables
- Rotate regularly
- Monitor usage and set alerts

---

## Environment Variables

### .env File Management

**CRITICAL RULES**:

1. `.env` files are NEVER committed to version control
2. `.env.example` documents all required variables WITHOUT actual values
3. Each environment has its own `.env` file
4. Production `.env` files are stored in secure credential management systems

### .env.example Template

```bash
# .env.example

# Critical: Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_here_minimum_32_chars

# Production user credentials (set in production environment only)
ADMIN_PASSWORD=
TEST_USER_PASSWORD=

# Database
MONGODB_URI=mongodb://localhost:27017/opencap
ZERODB_API_KEY=your_zerodb_api_key_here

# API Keys
API_KEY=your_api_key_here
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### Environment Variable Validation

**Rule**: Validate required environment variables on application startup.

```javascript
// config/validateEnv.js
function validateEnvironment() {
  const required = [
    'JWT_SECRET',
    'MONGODB_URI',
    'ZERODB_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check .env.example for required configuration.'
    );
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

module.exports = { validateEnvironment };
```

---

## Testing Credentials

### Test Data Generation

**Rule**: Test data should use secure random generation, NOT hardcoded values.

**WRONG**:

```javascript
// tests/utils/testHelpers.js
async function createTestUser() {
  return {
    email: 'test@example.com',
    password: 'password123',  // WRONG: Hardcoded
    role: 'user'
  };
}
```

**CORRECT**:

```javascript
// tests/utils/testHelpers.js
const crypto = require('crypto');

function generateTestPassword() {
  // Use secure random generation
  return crypto.randomBytes(16).toString('hex');
}

async function createTestUser() {
  return {
    email: `test-${Date.now()}@example.com`,
    password: generateTestPassword(),  // CORRECT: Random
    role: 'user'
  };
}
```

### Test Environment Isolation

**Rule**: Tests should NEVER use production credentials.

```javascript
// Use test-specific environment
const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
```

---

## Production Deployment

### Pre-Deployment Checklist

Before deploying to production, verify:

- [ ] All credentials are stored in environment variables
- [ ] No hardcoded credentials in source code
- [ ] `.env` files are not committed to version control
- [ ] Production credentials are different from development
- [ ] Security tests pass (no-hardcoded-credentials.test.js)
- [ ] API keys are rotated from development versions
- [ ] JWT secrets are unique and secure
- [ ] Database credentials use strong passwords

### Production Credential Management

**Use a Secrets Manager**:

Recommended options:
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager
- Railway Environment Variables (for Railway deployments)

**Example with AWS Secrets Manager**:

```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({
    SecretId: secretName
  }).promise();

  return JSON.parse(data.SecretString);
}

// Usage
const dbCredentials = await getSecret('opencap/production/database');
```

### Railway Deployment

For Railway deployments:

1. Set environment variables in Railway dashboard
2. Use Railway's built-in secrets management
3. Never commit Railway credentials to version control

```bash
# Set via Railway CLI
railway variables set JWT_SECRET="your-secure-secret"
railway variables set ADMIN_PASSWORD="your-secure-password"
```

---

## Credential Rotation

### Rotation Schedule

| Credential Type | Rotation Frequency | Priority |
|----------------|-------------------|----------|
| User Passwords | 90 days | High |
| API Keys | 90 days | High |
| JWT Secrets | 180 days | Medium |
| Database Passwords | 180 days | High |
| Service Tokens | 30 days | Critical |

### Rotation Process

1. **Generate new credential**
2. **Deploy with dual-credential support** (old + new)
3. **Monitor for usage of old credential**
4. **Update all services to use new credential**
5. **Revoke old credential**
6. **Verify no service failures**

### Automated Rotation

Implement automated rotation for critical credentials:

```javascript
// scripts/rotateApiKeys.js
const crypto = require('crypto');

async function rotateApiKey(userId) {
  const newApiKey = generateApiKey();

  // Store new key
  await User.findByIdAndUpdate(userId, {
    apiKey: newApiKey,
    apiKeyRotatedAt: new Date(),
    previousApiKey: user.apiKey // Keep old key for grace period
  });

  // Schedule old key revocation
  setTimeout(() => {
    revokeOldApiKey(userId);
  }, 24 * 60 * 60 * 1000); // 24 hour grace period

  return newApiKey;
}
```

---

## Automated Security Checks

### Pre-Commit Hooks

Install pre-commit hooks to prevent credential commits:

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check for common credential patterns
if git diff --cached | grep -E '(password|api_key|secret).*=.*["\'][^"\']+["\']'; then
  echo "ERROR: Potential hardcoded credential detected!"
  echo "Please use environment variables instead."
  exit 1
fi
```

### CI/CD Pipeline Checks

Include security tests in CI/CD pipeline:

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run security tests
        run: npm test -- tests/security/no-hardcoded-credentials.test.js
      - name: Fail on hardcoded credentials
        run: exit 1
        if: failure()
```

### Regular Security Scans

Schedule regular security scans:

```bash
# Run weekly security audit
npm run test:security

# Scan for exposed secrets
npm install -g trufflehog
trufflehog --regex --entropy=False .

# Check dependencies for vulnerabilities
npm audit
```

---

## Security Testing

### Automated Tests

We maintain a comprehensive security test suite:

```bash
# Run security tests
npm test -- tests/security/no-hardcoded-credentials.test.js
```

This test:
- Scans entire codebase for hardcoded credentials
- Detects common weak passwords
- Validates environment variable usage
- Ensures password hashing
- Checks for API key patterns

### Manual Security Review

Before production deployment:

1. Review all new code for credential exposure
2. Audit environment variable configuration
3. Verify .env files are not in version control
4. Check logs for credential leakage
5. Review API responses for sensitive data

---

## Incident Response

### If Credentials Are Exposed

**IMMEDIATE ACTIONS**:

1. **Revoke exposed credentials immediately**
2. **Generate new credentials**
3. **Update all services**
4. **Review access logs for unauthorized usage**
5. **Notify security team**
6. **Document incident**

### GitHub Credential Exposure

If credentials are committed to GitHub:

```bash
# 1. Remove from current commit
git rm .env
git commit --amend

# 2. Remove from history (DANGEROUS)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Force push (coordinate with team)
git push origin --force --all

# 4. Immediately rotate exposed credentials
```

**Note**: Even after removal, exposed credentials should be considered compromised and rotated immediately.

---

## Compliance & Standards

### Security Standards

This credential management policy complies with:

- **SOC 2 Type II**: Access controls and credential management
- **ISO 27001**: Information security management
- **PCI DSS**: Payment card industry data security
- **OWASP Top 10**: Security best practices
- **NIST Cybersecurity Framework**: Credential lifecycle management

### Audit Trail

Maintain audit logs for:
- Credential creation
- Credential rotation
- Credential access
- Failed authentication attempts
- Credential revocation

---

## Tools & Resources

### Recommended Tools

- **bcrypt**: Password hashing
- **dotenv**: Environment variable management
- **crypto**: Secure random generation
- **trufflehog**: Secret detection in git history
- **git-secrets**: Prevent committing secrets
- **npm audit**: Dependency vulnerability scanning

### Additional Reading

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)

---

## Summary

**Critical Rules**:

1. NEVER hardcode credentials
2. ALWAYS use environment variables
3. ALWAYS use secure random generation for test data
4. ALWAYS hash passwords with bcrypt
5. NEVER commit .env files to version control
6. ALWAYS rotate credentials regularly
7. ALWAYS use different credentials per environment
8. ALWAYS run security tests before deployment

**Remember**: Security is not optional. Following these practices protects our users, our data, and our reputation.

---

**Last Updated**: 2026-02-02
**Version**: 1.0
**Owner**: Security Team
