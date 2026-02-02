# Security Remediation Plan

**Date:** February 2, 2026
**Branch:** `security/comprehensive-audit`
**Target Completion:** February 16, 2026 (2 weeks)

---

## Quick Start - Execute These Commands Now

### 1. Fix Vulnerable Dependencies (CRITICAL - Do First)

```bash
# Fix non-breaking vulnerabilities
npm audit fix

# After testing, apply breaking changes
npm audit fix --force

# Verify fixes
npm audit
```

**Time Required:** 1-2 hours
**Risk if Delayed:** HIGH - Active vulnerabilities

---

## Critical Issues (Fix Within 24-48 Hours)

### Issue #1: Vulnerable NPM Dependencies
**Severity:** CRITICAL
**Affected Packages:** @langchain/core, axios, fast-xml-parser, @aws-sdk/*

**Fix:**
```bash
cd /Users/aideveloper/opencapstack
npm audit fix
npm test  # Verify nothing breaks
npm audit fix --force  # For breaking changes (test thoroughly)
```

**Validation:**
```bash
npm audit | grep "high severity"  # Should be 0
```

---

## High Priority (Fix Within 1 Week)

### Issue #2: Missing Input Validation & Sanitization
**Severity:** HIGH
**Risk:** XSS, Injection attacks

**Fix - Add express-validator:**

```bash
npm install express-validator --save
```

**Update authController.js:**
```javascript
const { body, validationResult } = require('express-validator');

// Add to registration endpoint
router.post('/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    }),
    body('firstName').trim().escape().isLength({ min: 1, max: 50 }),
    body('lastName').trim().escape().isLength({ min: 1, max: 50 }),
    body('role').isIn(['admin', 'manager', 'user', 'client']).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Continue with registration
  }
);
```

**Files to Update:**
- `/controllers/authController.js`
- `/routes/v1/authRoutes.js`
- All other route files accepting user input

**Test:**
```bash
npm test -- tests/security/owasp-top-10.test.js
```

---

### Issue #3: No Account Lockout After Failed Logins
**Severity:** HIGH
**Risk:** Brute force attacks

**Fix - Add to authController.js:**

```javascript
// In-memory store (for production, use Redis)
const loginAttempts = new Map();
const accountLockouts = new Map();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const checkAccountLockout = (email) => {
  const lockoutUntil = accountLockouts.get(email);
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000);
    throw new Error(
      `Account locked. Try again in ${remainingMinutes} minutes.`
    );
  }
  // Clear if lockout expired
  if (lockoutUntil && Date.now() >= lockoutUntil) {
    accountLockouts.delete(email);
    loginAttempts.delete(email);
  }
};

const recordFailedAttempt = (email) => {
  const attempts = (loginAttempts.get(email) || 0) + 1;
  loginAttempts.set(email, attempts);

  if (attempts >= MAX_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION;
    accountLockouts.set(email, lockoutUntil);
    loginAttempts.delete(email);
  }
};

const clearLoginAttempts = (email) => {
  loginAttempts.delete(email);
  accountLockouts.delete(email);
};

// Update loginUser function
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for account lockout
    try {
      checkAccountLockout(email);
    } catch (error) {
      return res.status(429).json({ message: error.message });
    }

    // ... existing validation ...

    const user = await User.findOne({ email });
    if (!user) {
      recordFailedAttempt(email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      recordFailedAttempt(email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Clear attempts on successful login
    clearLoginAttempts(email);

    // ... generate tokens and respond ...
  } catch (error) {
    // ... error handling ...
  }
};
```

**Test:**
```bash
# Test 6 failed login attempts
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

---

### Issue #4: Missing Resource Ownership Validation
**Severity:** HIGH
**Risk:** Horizontal privilege escalation

**Fix - Create middleware/ownershipValidation.js:**

```javascript
const User = require('../models/User');
const Company = require('../models/Company');
const Document = require('../models/Document');

/**
 * Validates that the authenticated user owns the requested resource
 * @param {String} resourceType - Type of resource (user, company, document, etc.)
 * @param {String} resourceIdParam - Name of the route parameter containing resource ID
 */
const validateOwnership = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const resourceId = req.params[resourceIdParam];

      // Admins can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      let resource;

      switch (resourceType) {
        case 'user':
          resource = await User.findOne({ userId: resourceId });
          if (!resource || resource.userId !== userId) {
            return res.status(403).json({
              message: 'Access denied: You can only access your own data'
            });
          }
          break;

        case 'company':
          resource = await Company.findById(resourceId);
          if (!resource || resource.ownerId !== userId) {
            return res.status(403).json({
              message: 'Access denied: You do not own this company'
            });
          }
          break;

        case 'document':
          resource = await Document.findById(resourceId);
          if (!resource || (resource.userId !== userId && resource.companyId !== req.user.companyId)) {
            return res.status(403).json({
              message: 'Access denied: You do not have access to this document'
            });
          }
          break;

        default:
          return res.status(500).json({
            message: 'Invalid resource type for ownership validation'
          });
      }

      // Attach resource to request for controller use
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership validation error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};

module.exports = { validateOwnership };
```

**Apply to routes:**
```javascript
const { validateOwnership } = require('../../middleware/ownershipValidation');

// Protect user profile endpoints
router.get('/users/:id',
  authenticateToken,
  validateOwnership('user', 'id'),
  userController.getUser
);

// Protect document endpoints
router.get('/documents/:id',
  authenticateToken,
  validateOwnership('document', 'id'),
  documentController.getDocument
);
```

---

## Medium Priority (Fix Within 2 Weeks)

### Issue #5: No Multi-Factor Authentication (MFA)
**Severity:** MEDIUM
**Risk:** Account takeover

**Fix - Install dependencies:**
```bash
npm install speakeasy qrcode --save
```

**Create utils/mfa.js:**
```javascript
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const generateMFASecret = async (email) => {
  const secret = speakeasy.generateSecret({
    name: `OpenCap (${email})`,
    issuer: 'OpenCap',
    length: 32
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl
  };
};

const verifyMFAToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2  // Allow 2 time steps before/after
  });
};

module.exports = { generateMFASecret, verifyMFAToken };
```

**Update User model:**
```javascript
// Add to User schema
mfaEnabled: {
  type: Boolean,
  default: false
},
mfaSecret: {
  type: String,
  default: null
}
```

**Add MFA routes:**
```javascript
// Enable MFA
router.post('/mfa/enable', authenticateToken, async (req, res) => {
  const user = await User.findOne({ userId: req.user.userId });
  const { secret, qrCode } = await generateMFASecret(user.email);

  // Save secret to user (encrypted in production)
  user.mfaSecret = secret;
  await user.save();

  res.json({ qrCode, secret });  // User scans QR with authenticator app
});

// Verify and complete MFA setup
router.post('/mfa/verify', authenticateToken, async (req, res) => {
  const { token } = req.body;
  const user = await User.findOne({ userId: req.user.userId });

  if (verifyMFAToken(user.mfaSecret, token)) {
    user.mfaEnabled = true;
    await user.save();
    res.json({ message: 'MFA enabled successfully' });
  } else {
    res.status(400).json({ message: 'Invalid MFA token' });
  }
});

// Update login to require MFA
const loginUser = async (req, res) => {
  // ... existing authentication ...

  if (user.mfaEnabled) {
    // Issue temporary token that requires MFA
    const mfaToken = jwt.sign(
      { userId: user.userId, mfaRequired: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );
    return res.status(200).json({
      mfaRequired: true,
      mfaToken
    });
  }

  // ... normal token generation ...
};

// MFA verification endpoint
router.post('/mfa/verify-login', async (req, res) => {
  const { mfaToken, mfaCode } = req.body;

  const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
  if (!decoded.mfaRequired) {
    return res.status(400).json({ message: 'Invalid MFA token' });
  }

  const user = await User.findOne({ userId: decoded.userId });
  if (!verifyMFAToken(user.mfaSecret, mfaCode)) {
    return res.status(401).json({ message: 'Invalid MFA code' });
  }

  // Generate full access token
  const accessToken = jwt.sign(
    { userId: user.userId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ accessToken });
});
```

---

### Issue #6: Improve Security Logging
**Severity:** MEDIUM
**Risk:** Delayed incident detection

**Fix - Install winston:**
```bash
npm install winston winston-daily-rotate-file --save
```

**Create utils/securityLogger.js:**
```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Sanitize sensitive data from logs
const sanitizeLogData = (data) => {
  const sanitized = { ...data };
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken',
    'mfaSecret', 'ssn', 'creditCard'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      level: 'security'
    }),
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      level: 'error'
    })
  ]
});

// Add custom log level for security events
winston.addColors({
  security: 'red'
});

const logSecurityEvent = (event, details = {}) => {
  const sanitizedDetails = sanitizeLogData(details);

  securityLogger.log('security', event, {
    ...sanitizedDetails,
    timestamp: new Date().toISOString()
  });
};

module.exports = { logSecurityEvent };
```

**Use in controllers:**
```javascript
const { logSecurityEvent } = require('../utils/securityLogger');

// Log failed login
if (!isPasswordValid) {
  logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
    email,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  return res.status(401).json({ message: 'Invalid credentials' });
}

// Log successful login
logSecurityEvent('SUCCESSFUL_LOGIN', {
  userId: user.userId,
  email: user.email,
  ip: req.ip
});

// Log access control violations
logSecurityEvent('ACCESS_CONTROL_VIOLATION', {
  userId: req.user.userId,
  attemptedResource: req.path,
  method: req.method
});
```

---

### Issue #7: Update Mongoose to 8.x
**Severity:** MEDIUM
**Risk:** Missing security patches

**Fix:**
```bash
npm install mongoose@8 --save
npm test  # Run full test suite
```

**Review Breaking Changes:**
- Check MongoDB connection options
- Update deprecated methods
- Test all database operations

---

## Low Priority (Fix Within 1 Month)

### Issue #8: Add Common Password Check
**Install package:**
```bash
npm install common-passwords --save
```

**Add to registration:**
```javascript
const commonPasswords = require('common-passwords-list');

if (commonPasswords.includes(password.toLowerCase())) {
  return res.status(400).json({
    message: 'Password is too common. Please choose a more unique password.'
  });
}
```

---

### Issue #9: Implement API Key Management
**For third-party integrations**

**Create models/ApiKey.js:**
```javascript
const apiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  permissions: [String],
  expiresAt: Date,
  lastUsed: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
```

---

## Testing Checklist

After implementing each fix, run:

```bash
# Run security test suite
npm test -- tests/security/owasp-top-10.test.js

# Run full test suite
npm test

# Check for vulnerabilities
npm audit

# Check code coverage
npm run test:coverage

# Manual testing
# - Test login with wrong password 6 times (lockout)
# - Test MFA enrollment and verification
# - Test ownership validation with different users
# - Test input validation with malicious inputs
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All npm audit vulnerabilities fixed (HIGH severity = 0)
- [ ] Input validation implemented on all endpoints
- [ ] Account lockout mechanism tested
- [ ] Resource ownership validation applied to protected routes
- [ ] MFA implemented and tested
- [ ] Security logging enhanced with rotation
- [ ] All tests passing (coverage >= 80%)
- [ ] Environment variables properly configured
- [ ] Secrets rotated (JWT_SECRET, database passwords, API keys)
- [ ] Professional penetration test completed
- [ ] Incident response plan documented
- [ ] Backup and recovery tested

---

## Monitoring & Maintenance

**Ongoing Security Tasks:**

### Daily
- Monitor security logs for suspicious activity
- Review failed login attempts

### Weekly
- Run `npm audit` and update dependencies
- Review access logs for anomalies
- Check rate limiting effectiveness

### Monthly
- Rotate API keys and secrets
- Review user permissions and roles
- Security patch assessment

### Quarterly
- Comprehensive security audit
- Penetration testing
- Security awareness training
- Incident response drill

---

## Emergency Contacts

**Security Incident Response:**
- Escalation: security@opencap.com
- On-Call Engineer: [TBD]
- Management: [TBD]

**External Resources:**
- Pen Testing Firm: [TBD]
- Security Consultant: [TBD]
- Legal Counsel: [TBD]

---

## Success Metrics

**Target Security Score:** 85/100

**Current:** 65/100
**After Critical Fixes:** 75/100
**After High Priority:** 82/100
**After Medium Priority:** 88/100

**Production Ready Threshold:** >= 85/100

---

**Document Version:** 1.0
**Last Updated:** February 2, 2026
**Next Review:** February 9, 2026
