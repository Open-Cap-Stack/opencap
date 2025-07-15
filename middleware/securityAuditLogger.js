/**
 * OpenCap Security Audit Logging Middleware
 * 
 * [Feature] OCAE-306: Implement security audit logging
 * 
 * This module provides comprehensive security event logging for compliance,
 * threat detection, and security monitoring across the OpenCap platform.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Security event types
const SECURITY_EVENTS = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILURE: 'auth.login.failure',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_TOKEN_REFRESH: 'auth.token.refresh',
  AUTH_TOKEN_INVALID: 'auth.token.invalid',
  AUTH_PASSWORD_RESET: 'auth.password.reset',
  AUTH_UNAUTHORIZED_ACCESS: 'auth.unauthorized',
  DATA_ACCESS: 'data.access',
  DATA_MODIFICATION: 'data.modification',
  DATA_DELETION: 'data.deletion',
  ADMIN_ACTION: 'admin.action',
  RBAC_PERMISSION_DENIED: 'rbac.permission_denied',
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  FILE_UPLOAD: 'data.file_upload',
  EXPORT_REQUEST: 'data.export_request',
  CONFIGURATION_CHANGE: 'admin.config_change'
};

// Security levels
const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class SecurityAuditLogger {
  constructor() {
    this.setupLogDirectories();
    this.initializeLogger();
  }

  setupLogDirectories() {
    const baseDir = path.join(__dirname, '../logs');
    this.securityLogDir = path.join(baseDir, 'security');
    this.auditLogDir = path.join(baseDir, 'audit');
    
    // Create directories if they don't exist
    [baseDir, this.securityLogDir, this.auditLogDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  initializeLogger() {
    const date = new Date().toISOString().split('T')[0];
    this.securityLogFile = path.join(this.securityLogDir, `security-${date}.log`);
    this.auditLogFile = path.join(this.auditLogDir, `audit-${date}.log`);
  }

  /**
   * Generate a unique event ID for tracking
   */
  generateEventId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Create structured security log entry
   */
  createLogEntry(eventType, level, details, req) {
    const timestamp = new Date().toISOString();
    const eventId = this.generateEventId();
    
    // Extract user context
    const userContext = {
      userId: req.user?.id || 'anonymous',
      userEmail: req.user?.email || 'unknown',
      userRole: req.user?.role || 'guest',
      sessionId: req.sessionID || req.headers['x-session-id'] || 'unknown'
    };

    // Extract request context
    const requestContext = {
      ip: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      method: req.method,
      url: req.originalUrl || req.url,
      headers: {
        authorization: req.headers.authorization ? '[REDACTED]' : 'none',
        'x-api-version': req.headers['x-api-version'] || 'none',
        'x-forwarded-for': req.headers['x-forwarded-for'] || 'none',
        'x-real-ip': req.headers['x-real-ip'] || 'none'
      }
    };

    return {
      eventId,
      timestamp,
      eventType,
      level,
      details,
      userContext,
      requestContext,
      environment: process.env.NODE_ENV || 'unknown',
      nodeVersion: process.version
    };
  }

  /**
   * Write log entry to file
   */
  writeLogEntry(logEntry, isAuditLog = false) {
    const logFile = isAuditLog ? this.auditLogFile : this.securityLogFile;
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      fs.appendFileSync(logFile, logLine);
      
      // Also log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔒 [${logEntry.level.toUpperCase()}] ${logEntry.eventType}:`, logEntry.details);
      }
    } catch (error) {
      console.error('Security audit logger error:', error);
    }
  }

  /**
   * Log security events
   */
  logSecurityEvent(eventType, level, details, req) {
    const logEntry = this.createLogEntry(eventType, level, details, req);
    this.writeLogEntry(logEntry, false);
    
    // Critical events should also go to audit log
    if (level === SECURITY_LEVELS.CRITICAL) {
      this.writeLogEntry(logEntry, true);
    }
  }

  /**
   * Log compliance audit events
   */
  logAuditEvent(eventType, details, req) {
    const logEntry = this.createLogEntry(eventType, SECURITY_LEVELS.MEDIUM, details, req);
    this.writeLogEntry(logEntry, true);
  }

  /**
   * Middleware factory for different security events
   */
  createMiddleware() {
    return {
      // Authentication events
      authSuccess: (req, res, next) => {
        this.logSecurityEvent(
          SECURITY_EVENTS.AUTH_LOGIN_SUCCESS,
          SECURITY_LEVELS.LOW,
          { action: 'successful_login', userId: req.user?.id },
          req
        );
        next();
      },

      authFailure: (req, res, next) => {
        this.logSecurityEvent(
          SECURITY_EVENTS.AUTH_LOGIN_FAILURE,
          SECURITY_LEVELS.MEDIUM,
          { 
            action: 'failed_login_attempt',
            attemptedEmail: req.body?.email || 'unknown',
            reason: res.locals?.authError || 'unknown'
          },
          req
        );
        next();
      },

      unauthorizedAccess: (req, res, next) => {
        this.logSecurityEvent(
          SECURITY_EVENTS.AUTH_UNAUTHORIZED_ACCESS,
          SECURITY_LEVELS.HIGH,
          { 
            action: 'unauthorized_access_attempt',
            resource: req.originalUrl,
            requiredPermission: res.locals?.requiredPermission
          },
          req
        );
        next();
      },

      // Data access logging
      dataAccess: (resourceType) => (req, res, next) => {
        this.logAuditEvent(
          SECURITY_EVENTS.DATA_ACCESS,
          {
            action: 'data_access',
            resourceType,
            resourceId: req.params.id || 'collection',
            operation: 'read'
          },
          req
        );
        next();
      },

      dataModification: (resourceType) => (req, res, next) => {
        this.logAuditEvent(
          SECURITY_EVENTS.DATA_MODIFICATION,
          {
            action: 'data_modification',
            resourceType,
            resourceId: req.params.id || 'new',
            operation: req.method.toLowerCase(),
            changes: this.sanitizeRequestBody(req.body)
          },
          req
        );
        next();
      },

      // Admin actions
      adminAction: (req, res, next) => {
        this.logSecurityEvent(
          SECURITY_EVENTS.ADMIN_ACTION,
          SECURITY_LEVELS.HIGH,
          {
            action: 'admin_operation',
            operation: `${req.method} ${req.originalUrl}`,
            adminUserId: req.user?.id
          },
          req
        );
        next();
      },

      // Rate limiting
      rateLimitExceeded: (req, res, next) => {
        this.logSecurityEvent(
          SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
          SECURITY_LEVELS.MEDIUM,
          {
            action: 'rate_limit_exceeded',
            limit: res.locals?.rateLimit?.limit,
            remaining: res.locals?.rateLimit?.remaining,
            resetTime: res.locals?.rateLimit?.resetTime
          },
          req
        );
        next();
      },

      // File operations
      fileUpload: (req, res, next) => {
        this.logAuditEvent(
          SECURITY_EVENTS.FILE_UPLOAD,
          {
            action: 'file_upload',
            fileName: req.file?.originalname || 'unknown',
            fileSize: req.file?.size || 0,
            mimeType: req.file?.mimetype || 'unknown'
          },
          req
        );
        next();
      }
    };
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  sanitizeRequestBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Express error handler for security events
   */
  errorHandler() {
    return (err, req, res, next) => {
      // Log security-related errors
      if (err.status === 401 || err.status === 403) {
        this.logSecurityEvent(
          SECURITY_EVENTS.AUTH_UNAUTHORIZED_ACCESS,
          SECURITY_LEVELS.MEDIUM,
          {
            action: 'access_denied',
            error: err.message,
            statusCode: err.status
          },
          req
        );
      } else if (err.status >= 400 && err.status < 500) {
        this.logSecurityEvent(
          SECURITY_EVENTS.SUSPICIOUS_ACTIVITY,
          SECURITY_LEVELS.LOW,
          {
            action: 'client_error',
            error: err.message,
            statusCode: err.status
          },
          req
        );
      }
      
      next(err);
    };
  }

  /**
   * Manual logging methods for use in controllers
   */
  static log = {
    authSuccess: (req, details = {}) => securityLogger.logSecurityEvent(
      SECURITY_EVENTS.AUTH_LOGIN_SUCCESS, SECURITY_LEVELS.LOW, details, req
    ),
    
    authFailure: (req, details = {}) => securityLogger.logSecurityEvent(
      SECURITY_EVENTS.AUTH_LOGIN_FAILURE, SECURITY_LEVELS.MEDIUM, details, req
    ),
    
    dataExport: (req, details = {}) => securityLogger.logAuditEvent(
      SECURITY_EVENTS.EXPORT_REQUEST, details, req
    ),
    
    configChange: (req, details = {}) => securityLogger.logSecurityEvent(
      SECURITY_EVENTS.CONFIGURATION_CHANGE, SECURITY_LEVELS.HIGH, details, req
    ),
    
    suspiciousActivity: (req, details = {}) => securityLogger.logSecurityEvent(
      SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, SECURITY_LEVELS.HIGH, details, req
    )
  };
}

// Create singleton instance
const securityLogger = new SecurityAuditLogger();

module.exports = {
  SecurityAuditLogger,
  securityLogger,
  SECURITY_EVENTS,
  SECURITY_LEVELS
};