/**
 * SecurityMonitoringService
 *
 * Threat detection and security monitoring service
 * Handles failed login tracking, brute force detection, suspicious activity alerts
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class SecurityMonitoringService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      thresholds: {
        maxFailedLogins: config.thresholds?.maxFailedLogins || 5,
        bruteForceWindow: config.thresholds?.bruteForceWindow || 300000, // 5 minutes
        suspiciousActivityScore: config.thresholds?.suspiciousActivityScore || 50,
        maxRequestsPerMinute: config.thresholds?.maxRequestsPerMinute || 60,
        lockoutDuration: config.thresholds?.lockoutDuration || 900000, // 15 minutes
        ipBlockDuration: config.thresholds?.ipBlockDuration || 3600000 // 1 hour
      },
      alertHandler: config.alertHandler || this.defaultAlertHandler.bind(this),
      normalLoginHours: config.normalLoginHours || { start: 0, end: 24 },
      ...config
    };

    // Data stores
    this.failedLoginsByUser = new Map(); // userId -> [{timestamp, ipAddress, reason}]
    this.failedLoginsByIP = new Map(); // ipAddress -> [{timestamp, userId, reason}]
    this.successfulLogins = new Map(); // userId -> [{timestamp, ipAddress, location}]
    this.lockedAccounts = new Map(); // userId -> { lockedAt, expiresAt }
    this.blockedIPs = new Map(); // ipAddress -> { blockedAt, expiresAt, reason }
    this.alerts = new Map(); // alertId -> alert
    this.userThreatScores = new Map(); // userId -> { score, lastUpdated, events }
    this.apiCalls = new Map(); // userId -> [{timestamp, endpoint}]
    this.apiCallsByIP = new Map(); // ipAddress -> [{timestamp, endpoint}]
    this.accessAttempts = new Map(); // userId -> [{timestamp, resource, allowed}]
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Default alert handler
   */
  defaultAlertHandler(alert) {
    console.log(`[SECURITY ALERT] ${alert.severity}: ${alert.type}`, alert);
  }

  /**
   * Record a failed login attempt
   */
  recordFailedLogin({ userId, ipAddress, reason }) {
    const timestamp = Date.now();
    const attempt = { timestamp, ipAddress, reason };

    // Record by user
    if (!this.failedLoginsByUser.has(userId)) {
      this.failedLoginsByUser.set(userId, []);
    }
    this.failedLoginsByUser.get(userId).push(attempt);

    // Record by IP
    if (!this.failedLoginsByIP.has(ipAddress)) {
      this.failedLoginsByIP.set(ipAddress, []);
    }
    this.failedLoginsByIP.get(ipAddress).push({ timestamp, userId, reason });

    // Update threat score
    this.updateThreatScore(userId, 10); // +10 for failed login

    // Check for brute force
    this.checkBruteForce(userId, ipAddress);
  }

  /**
   * Record a successful login
   */
  recordSuccessfulLogin({ userId, ipAddress, location, timestamp }) {
    const loginTime = timestamp || new Date();
    const loginData = { timestamp: loginTime, ipAddress, location };

    // Get previous logins
    const previousLogins = this.successfulLogins.get(userId) || [];

    // Check for suspicious patterns before recording
    this.checkSuspiciousLogin(userId, loginData, previousLogins);

    // Record the login
    if (!this.successfulLogins.has(userId)) {
      this.successfulLogins.set(userId, []);
    }
    this.successfulLogins.get(userId).push(loginData);

    // Clear failed login attempts on successful login
    this.failedLoginsByUser.delete(userId);

    // Decay threat score on successful login
    this.updateThreatScore(userId, -5);
  }

  /**
   * Check for suspicious login patterns
   */
  checkSuspiciousLogin(userId, currentLogin, previousLogins) {
    // Check for new IP
    if (previousLogins.length > 0) {
      const knownIPs = new Set(previousLogins.map(l => l.ipAddress));
      if (!knownIPs.has(currentLogin.ipAddress)) {
        this.createAlert({
          type: 'NEW_IP_LOGIN',
          severity: 'MEDIUM',
          userId,
          ipAddress: currentLogin.ipAddress,
          message: `Login from new IP address: ${currentLogin.ipAddress}`
        });
      }
    }

    // Check for new location
    if (currentLogin.location && previousLogins.length > 0) {
      const knownLocations = previousLogins
        .filter(l => l.location)
        .map(l => l.location.country);

      if (knownLocations.length > 0 && !knownLocations.includes(currentLogin.location.country)) {
        this.createAlert({
          type: 'NEW_LOCATION_LOGIN',
          severity: 'HIGH',
          userId,
          location: currentLogin.location,
          message: `Login from new country: ${currentLogin.location.country}`
        });
      }

      // Check for impossible travel
      const lastLogin = previousLogins[previousLogins.length - 1];
      if (lastLogin?.location?.lat && currentLogin.location?.lat) {
        const timeDiff = (new Date(currentLogin.timestamp) - new Date(lastLogin.timestamp)) / (1000 * 60); // minutes
        const distance = this.calculateDistance(
          lastLogin.location.lat, lastLogin.location.lon,
          currentLogin.location.lat, currentLogin.location.lon
        );
        // 800 km/h is roughly max commercial flight speed
        const maxPossibleDistance = (timeDiff / 60) * 800;

        if (distance > maxPossibleDistance) {
          this.createAlert({
            type: 'IMPOSSIBLE_TRAVEL',
            severity: 'CRITICAL',
            userId,
            message: `Impossible travel detected: ${distance.toFixed(0)}km in ${timeDiff.toFixed(0)} minutes`
          });
        }
      }
    }

    // Check for unusual login time
    const loginHour = new Date(currentLogin.timestamp).getHours();
    if (loginHour < this.config.normalLoginHours.start || loginHour >= this.config.normalLoginHours.end) {
      this.createAlert({
        type: 'UNUSUAL_LOGIN_TIME',
        severity: 'LOW',
        userId,
        message: `Login at unusual time: ${loginHour}:00`
      });
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Check for brute force attacks
   */
  checkBruteForce(userId, ipAddress) {
    const window = this.config.thresholds.bruteForceWindow;
    const maxAttempts = this.config.thresholds.maxFailedLogins;
    const now = Date.now();

    // Check by user first
    const userAttempts = this.getFailedLoginAttempts(userId);
    if (userAttempts.length >= maxAttempts && !this.isAccountLocked(userId)) {
      this.createAlert({
        type: 'BRUTE_FORCE_DETECTED',
        severity: 'HIGH',
        userId,
        ipAddress,
        attempts: userAttempts.length,
        message: `Brute force detected: ${userAttempts.length} failed attempts`
      });
      this.lockAccount(userId);
    }

    // Check by IP
    const ipAttempts = this.getFailedLoginsByIP(ipAddress);
    if (ipAttempts.length >= maxAttempts) {
      // Only create alert if not already blocked
      if (!this.isIPBlocked(ipAddress)) {
        this.createAlert({
          type: 'BRUTE_FORCE_IP_DETECTED',
          severity: 'HIGH',
          ipAddress,
          attempts: ipAttempts.length,
          message: `Brute force from IP detected: ${ipAttempts.length} failed attempts`
        });
      }

      // Auto-block IP after 10 failed attempts (twice the user threshold)
      if (ipAttempts.length >= maxAttempts * 2) {
        this.blockIP(ipAddress, {
          reason: 'Automatic block: Too many failed login attempts',
          duration: this.config.thresholds.ipBlockDuration
        });
      }
    }
  }

  /**
   * Get failed login attempts for user (within window)
   */
  getFailedLoginAttempts(userId) {
    const attempts = this.failedLoginsByUser.get(userId) || [];
    const window = this.config.thresholds.bruteForceWindow;
    const cutoff = Date.now() - window;
    return attempts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Get failed logins by IP (within window)
   */
  getFailedLoginsByIP(ipAddress) {
    const attempts = this.failedLoginsByIP.get(ipAddress) || [];
    const window = this.config.thresholds.bruteForceWindow;
    const cutoff = Date.now() - window;
    return attempts.filter(a => a.timestamp > cutoff);
  }

  /**
   * Lock an account
   */
  lockAccount(userId) {
    const lockoutDuration = this.config.thresholds.lockoutDuration;
    const lockedAt = Date.now();
    const expiresAt = lockedAt + lockoutDuration;

    this.lockedAccounts.set(userId, { lockedAt, expiresAt });

    this.emit('accountLocked', { userId, expiresAt });
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId) {
    const lockInfo = this.lockedAccounts.get(userId);
    if (!lockInfo) return false;

    if (Date.now() > lockInfo.expiresAt) {
      this.lockedAccounts.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Record an API call
   */
  recordAPICall({ userId, endpoint, ipAddress }) {
    const timestamp = Date.now();
    const call = { timestamp, endpoint };

    // Record by user
    if (userId) {
      if (!this.apiCalls.has(userId)) {
        this.apiCalls.set(userId, []);
      }
      this.apiCalls.get(userId).push(call);
    }

    // Record by IP
    if (!this.apiCallsByIP.has(ipAddress)) {
      this.apiCallsByIP.set(ipAddress, []);
    }
    this.apiCallsByIP.get(ipAddress).push(call);

    // Check for potential scraping
    this.checkForScraping(userId, ipAddress);

    // Cleanup old entries
    this.cleanupOldAPICallsEntry(userId, ipAddress);
  }

  /**
   * Clean up old API call entries (keep last 5 minutes)
   */
  cleanupOldAPICallsEntry(userId, ipAddress) {
    const cutoff = Date.now() - 300000; // 5 minutes

    if (userId && this.apiCalls.has(userId)) {
      const calls = this.apiCalls.get(userId);
      this.apiCalls.set(userId, calls.filter(c => c.timestamp > cutoff));
    }

    if (ipAddress && this.apiCallsByIP.has(ipAddress)) {
      const calls = this.apiCallsByIP.get(ipAddress);
      this.apiCallsByIP.set(ipAddress, calls.filter(c => c.timestamp > cutoff));
    }
  }

  /**
   * Check for potential scraping activity
   */
  checkForScraping(userId, ipAddress) {
    const window = 60000; // 1 minute
    const cutoff = Date.now() - window;
    const maxRequests = this.config.thresholds.maxRequestsPerMinute;

    // Check by user
    if (userId) {
      const userCalls = (this.apiCalls.get(userId) || []).filter(c => c.timestamp > cutoff);
      if (userCalls.length >= maxRequests) {
        this.createAlert({
          type: 'POTENTIAL_SCRAPING',
          severity: 'MEDIUM',
          userId,
          requestCount: userCalls.length,
          message: `Potential scraping: ${userCalls.length} requests in 1 minute`
        });
      }
    }
  }

  /**
   * Record access attempt
   */
  recordAccessAttempt({ userId, resource, allowed, ipAddress }) {
    const timestamp = Date.now();
    const attempt = { timestamp, resource, allowed, ipAddress };

    if (!this.accessAttempts.has(userId)) {
      this.accessAttempts.set(userId, []);
    }
    this.accessAttempts.get(userId).push(attempt);

    if (!allowed) {
      this.createAlert({
        type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        severity: 'MEDIUM',
        userId,
        resource,
        ipAddress,
        message: `Unauthorized access attempt to: ${resource}`
      });

      // Check for privilege escalation attempts
      const recentDenials = this.accessAttempts.get(userId)
        .filter(a => !a.allowed && Date.now() - a.timestamp < 300000);

      if (recentDenials.length >= 5) {
        this.createAlert({
          type: 'PRIVILEGE_ESCALATION_ATTEMPT',
          severity: 'HIGH',
          userId,
          attempts: recentDenials.length,
          message: `Possible privilege escalation: ${recentDenials.length} denied access attempts`
        });
      }
    }
  }

  /**
   * Block an IP address
   */
  blockIP(ipAddress, { reason, duration }) {
    const blockedAt = Date.now();
    const expiresAt = duration ? blockedAt + duration : null;

    this.blockedIPs.set(ipAddress, { blockedAt, expiresAt, reason });

    this.emit('ipBlocked', { ipAddress, reason, expiresAt });
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ipAddress) {
    this.blockedIPs.delete(ipAddress);
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress) {
    const blockInfo = this.blockedIPs.get(ipAddress);
    if (!blockInfo) return false;

    if (blockInfo.expiresAt && Date.now() > blockInfo.expiresAt) {
      this.blockedIPs.delete(ipAddress);
      return false;
    }

    return true;
  }

  /**
   * Get list of blocked IPs
   */
  getBlockedIPs() {
    return Array.from(this.blockedIPs.entries()).map(([ipAddress, info]) => ({
      ipAddress,
      ...info
    }));
  }

  /**
   * Create a security alert
   */
  createAlert({ type, severity, userId, ipAddress, message, ...data }) {
    const alert = {
      id: this.generateId(),
      type,
      severity,
      userId,
      ipAddress,
      message,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false,
      ...data
    };

    this.alerts.set(alert.id, alert);

    this.config.alertHandler(alert);
    this.emit('alert', alert);

    return alert;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId) {
    return this.alerts.get(alertId);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId, { resolvedBy, resolution }) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolution = resolution;
      alert.resolvedAt = Date.now();
    }
  }

  /**
   * Update threat score for user
   */
  updateThreatScore(userId, delta) {
    if (!this.userThreatScores.has(userId)) {
      this.userThreatScores.set(userId, { score: 0, lastUpdated: Date.now(), events: [] });
    }

    const data = this.userThreatScores.get(userId);
    data.score = Math.max(0, data.score + delta);
    data.lastUpdated = Date.now();
    data.events.push({ delta, timestamp: Date.now() });
  }

  /**
   * Get threat score for user
   */
  getThreatScore(userId) {
    const data = this.userThreatScores.get(userId);
    if (!data) return 0;

    // Apply decay based on time elapsed (decay 10% per hour)
    const hoursElapsed = (Date.now() - data.lastUpdated) / (1000 * 60 * 60);
    const decayFactor = Math.pow(0.9, hoursElapsed);

    return Math.round(data.score * decayFactor);
  }

  /**
   * Get request rate for user
   */
  getRequestRate(userId) {
    const calls = this.apiCalls.get(userId) || [];
    const window = 60000; // 1 minute
    const cutoff = Date.now() - window;
    const recentCalls = calls.filter(c => c.timestamp > cutoff);

    return {
      requestsPerMinute: recentCalls.length,
      endpoints: [...new Set(recentCalls.map(c => c.endpoint))]
    };
  }

  /**
   * Get request rate for IP
   */
  getRequestRateByIP(ipAddress) {
    const calls = this.apiCallsByIP.get(ipAddress) || [];
    const window = 60000; // 1 minute
    const cutoff = Date.now() - window;
    const recentCalls = calls.filter(c => c.timestamp > cutoff);

    return {
      requestsPerMinute: recentCalls.length,
      endpoints: [...new Set(recentCalls.map(c => c.endpoint))]
    };
  }

  /**
   * Get security statistics
   */
  getStatistics({ startDate, endDate } = {}) {
    return {
      totalFailedLogins: Array.from(this.failedLoginsByUser.values())
        .reduce((sum, arr) => sum + arr.length, 0),
      totalSuccessfulLogins: Array.from(this.successfulLogins.values())
        .reduce((sum, arr) => sum + arr.length, 0),
      activeAlerts: this.getActiveAlerts().length,
      blockedIPs: this.blockedIPs.size,
      lockedAccounts: Array.from(this.lockedAccounts.entries())
        .filter(([_, info]) => Date.now() <= info.expiresAt).length
    };
  }

  /**
   * Reset all data (for testing)
   */
  reset() {
    this.failedLoginsByUser.clear();
    this.failedLoginsByIP.clear();
    this.successfulLogins.clear();
    this.lockedAccounts.clear();
    this.blockedIPs.clear();
    this.alerts.clear();
    this.userThreatScores.clear();
    this.apiCalls.clear();
    this.apiCallsByIP.clear();
    this.accessAttempts.clear();
  }
}

module.exports = SecurityMonitoringService;
