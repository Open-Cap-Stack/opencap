/**
 * Unit tests for SecurityMonitoringService
 */

const SecurityMonitoringService = require('../../../../services/security/securityMonitoringService');

describe('SecurityMonitoringService', () => {
  let monitor;

  beforeEach(() => {
    monitor = new SecurityMonitoringService({
      thresholds: {
        maxFailedLogins: 3,
        bruteForceWindow: 300000,
        suspiciousActivityScore: 50,
        maxRequestsPerMinute: 5,
        lockoutDuration: 900000,
        ipBlockDuration: 3600000
      },
      alertHandler: jest.fn(),
      normalLoginHours: { start: 9, end: 17 }
    });
  });

  afterEach(() => {
    monitor.reset();
    monitor.removeAllListeners();
  });

  // ============ Constructor ============

  describe('constructor', () => {
    it('should use default thresholds when none provided', () => {
      const service = new SecurityMonitoringService();
      expect(service.config.thresholds.maxFailedLogins).toBe(5);
      expect(service.config.thresholds.bruteForceWindow).toBe(300000);
    });

    it('should accept custom thresholds', () => {
      expect(monitor.config.thresholds.maxFailedLogins).toBe(3);
    });

    it('should use default alert handler when none provided', () => {
      const service = new SecurityMonitoringService();
      expect(typeof service.config.alertHandler).toBe('function');
    });
  });

  // ============ Failed Login Recording ============

  describe('recordFailedLogin', () => {
    it('should record a failed login attempt', () => {
      monitor.recordFailedLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        reason: 'Invalid password'
      });

      const attempts = monitor.getFailedLoginAttempts('user1');
      expect(attempts).toHaveLength(1);
      expect(attempts[0].reason).toBe('Invalid password');
    });

    it('should record by IP address as well', () => {
      monitor.recordFailedLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        reason: 'Invalid password'
      });

      const ipAttempts = monitor.getFailedLoginsByIP('10.0.0.1');
      expect(ipAttempts).toHaveLength(1);
    });

    it('should update threat score on failed login', () => {
      monitor.recordFailedLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        reason: 'Invalid password'
      });

      const score = monitor.getThreatScore('user1');
      expect(score).toBeGreaterThan(0);
    });

    it('should trigger brute force detection after threshold', () => {
      for (let i = 0; i < 3; i++) {
        monitor.recordFailedLogin({
          userId: 'user1',
          ipAddress: '10.0.0.1',
          reason: 'Wrong password'
        });
      }

      expect(monitor.isAccountLocked('user1')).toBe(true);
      const alerts = monitor.getActiveAlerts();
      const bruteForce = alerts.find(a => a.type === 'BRUTE_FORCE_DETECTED');
      expect(bruteForce).toBeDefined();
    });
  });

  // ============ Successful Login Recording ============

  describe('recordSuccessfulLogin', () => {
    it('should record a successful login', () => {
      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        location: { country: 'US' },
        timestamp: new Date()
      });

      const logins = monitor.successfulLogins.get('user1');
      expect(logins).toHaveLength(1);
    });

    it('should clear failed login attempts on success', () => {
      monitor.recordFailedLogin({ userId: 'user1', ipAddress: '10.0.0.1', reason: 'test' });
      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        timestamp: new Date()
      });

      expect(monitor.failedLoginsByUser.has('user1')).toBe(false);
    });

    it('should decay threat score on successful login', () => {
      monitor.recordFailedLogin({ userId: 'user1', ipAddress: '10.0.0.1', reason: 'test' });
      const scoreBefore = monitor.getThreatScore('user1');

      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        timestamp: new Date()
      });
      const scoreAfter = monitor.getThreatScore('user1');

      expect(scoreAfter).toBeLessThan(scoreBefore);
    });
  });

  // ============ Suspicious Login Detection ============

  describe('checkSuspiciousLogin', () => {
    it('should alert on login from new IP', () => {
      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        timestamp: new Date()
      });
      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '192.168.1.1',
        timestamp: new Date()
      });

      const alerts = monitor.getActiveAlerts();
      const newIpAlert = alerts.find(a => a.type === 'NEW_IP_LOGIN');
      expect(newIpAlert).toBeDefined();
    });

    it('should alert on login from new country', () => {
      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        location: { country: 'US' },
        timestamp: new Date()
      });
      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.2',
        location: { country: 'CN' },
        timestamp: new Date()
      });

      const alerts = monitor.getActiveAlerts();
      const locationAlert = alerts.find(a => a.type === 'NEW_LOCATION_LOGIN');
      expect(locationAlert).toBeDefined();
      expect(locationAlert.severity).toBe('HIGH');
    });

    it('should alert on unusual login time', () => {
      const earlyMorning = new Date();
      earlyMorning.setHours(3, 0, 0, 0);

      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        timestamp: earlyMorning
      });

      const alerts = monitor.getActiveAlerts();
      const timeAlert = alerts.find(a => a.type === 'UNUSUAL_LOGIN_TIME');
      expect(timeAlert).toBeDefined();
      expect(timeAlert.severity).toBe('LOW');
    });

    it('should alert on impossible travel', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.1',
        location: { country: 'US', lat: 40.7128, lon: -74.0060 },
        timestamp: fiveMinutesAgo
      });

      monitor.recordSuccessfulLogin({
        userId: 'user1',
        ipAddress: '10.0.0.2',
        location: { country: 'JP', lat: 35.6762, lon: 139.6503 },
        timestamp: now
      });

      const alerts = monitor.getActiveAlerts();
      const travelAlert = alerts.find(a => a.type === 'IMPOSSIBLE_TRAVEL');
      expect(travelAlert).toBeDefined();
      expect(travelAlert.severity).toBe('CRITICAL');
    });
  });

  // ============ Brute Force Detection ============

  describe('checkBruteForce', () => {
    it('should lock account after max failed attempts', () => {
      for (let i = 0; i < 3; i++) {
        monitor.recordFailedLogin({
          userId: 'victim',
          ipAddress: '10.0.0.1',
          reason: 'Wrong password'
        });
      }

      expect(monitor.isAccountLocked('victim')).toBe(true);
    });

    it('should create BRUTE_FORCE_IP_DETECTED alert for IP-based attacks', () => {
      for (let i = 0; i < 3; i++) {
        monitor.recordFailedLogin({
          userId: 'user' + i,
          ipAddress: '10.0.0.99',
          reason: 'Wrong password'
        });
      }

      const alerts = monitor.getActiveAlerts();
      const ipAlert = alerts.find(a => a.type === 'BRUTE_FORCE_IP_DETECTED');
      expect(ipAlert).toBeDefined();
    });

    it('should auto-block IP after double threshold', () => {
      for (let i = 0; i < 6; i++) {
        monitor.recordFailedLogin({
          userId: 'user' + i,
          ipAddress: '10.0.0.99',
          reason: 'Wrong password'
        });
      }

      expect(monitor.isIPBlocked('10.0.0.99')).toBe(true);
    });

    it('should not re-alert for already locked accounts', () => {
      for (let i = 0; i < 3; i++) {
        monitor.recordFailedLogin({
          userId: 'victim',
          ipAddress: '10.0.0.1',
          reason: 'Wrong password'
        });
      }
      const alertCountAfterLock = monitor.getActiveAlerts()
        .filter(a => a.type === 'BRUTE_FORCE_DETECTED').length;

      monitor.recordFailedLogin({
        userId: 'victim',
        ipAddress: '10.0.0.1',
        reason: 'Wrong password'
      });

      const alertCountAfter = monitor.getActiveAlerts()
        .filter(a => a.type === 'BRUTE_FORCE_DETECTED').length;
      expect(alertCountAfter).toBe(alertCountAfterLock);
    });
  });

  // ============ Account Locking ============

  describe('Account Locking', () => {
    it('should lock and detect locked account', () => {
      monitor.lockAccount('user1');
      expect(monitor.isAccountLocked('user1')).toBe(true);
    });

    it('should auto-unlock after lockout duration expires', () => {
      monitor.lockAccount('user1');
      const lockInfo = monitor.lockedAccounts.get('user1');
      lockInfo.expiresAt = Date.now() - 1000;
      expect(monitor.isAccountLocked('user1')).toBe(false);
    });

    it('should return false for non-locked account', () => {
      expect(monitor.isAccountLocked('nobody')).toBe(false);
    });

    it('should emit accountLocked event', () => {
      const handler = jest.fn();
      monitor.on('accountLocked', handler);
      monitor.lockAccount('user1');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].userId).toBe('user1');
    });
  });

  // ============ IP Blocking ============

  describe('IP Blocking', () => {
    it('should block and detect blocked IP', () => {
      monitor.blockIP('10.0.0.1', { reason: 'Abuse', duration: 3600000 });
      expect(monitor.isIPBlocked('10.0.0.1')).toBe(true);
    });

    it('should auto-unblock after duration expires', () => {
      monitor.blockIP('10.0.0.1', { reason: 'Abuse', duration: 1 });
      const blockInfo = monitor.blockedIPs.get('10.0.0.1');
      blockInfo.expiresAt = Date.now() - 1000;
      expect(monitor.isIPBlocked('10.0.0.1')).toBe(false);
    });

    it('should support permanent blocking (no duration)', () => {
      monitor.blockIP('10.0.0.1', { reason: 'Permanent ban' });
      const blockInfo = monitor.blockedIPs.get('10.0.0.1');
      expect(blockInfo.expiresAt).toBeNull();
      expect(monitor.isIPBlocked('10.0.0.1')).toBe(true);
    });

    it('should unblock an IP', () => {
      monitor.blockIP('10.0.0.1', { reason: 'Test', duration: 3600000 });
      monitor.unblockIP('10.0.0.1');
      expect(monitor.isIPBlocked('10.0.0.1')).toBe(false);
    });

    it('should return false for non-blocked IP', () => {
      expect(monitor.isIPBlocked('1.2.3.4')).toBe(false);
    });

    it('should emit ipBlocked event', () => {
      const handler = jest.fn();
      monitor.on('ipBlocked', handler);
      monitor.blockIP('10.0.0.1', { reason: 'Test', duration: 3600000 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should list all blocked IPs', () => {
      monitor.blockIP('10.0.0.1', { reason: 'A', duration: 1000 });
      monitor.blockIP('10.0.0.2', { reason: 'B', duration: 1000 });
      const blocked = monitor.getBlockedIPs();
      expect(blocked).toHaveLength(2);
      expect(blocked.map(b => b.ipAddress)).toContain('10.0.0.1');
    });
  });

  // ============ API Call Recording ============

  describe('recordAPICall', () => {
    it('should record API call by user', () => {
      monitor.recordAPICall({ userId: 'user1', endpoint: '/api/test', ipAddress: '10.0.0.1' });
      const rate = monitor.getRequestRate('user1');
      expect(rate.requestsPerMinute).toBe(1);
      expect(rate.endpoints).toContain('/api/test');
    });

    it('should record API call by IP', () => {
      monitor.recordAPICall({ userId: null, endpoint: '/api/test', ipAddress: '10.0.0.1' });
      const rate = monitor.getRequestRateByIP('10.0.0.1');
      expect(rate.requestsPerMinute).toBe(1);
    });

    it('should detect scraping when rate exceeds threshold', () => {
      for (let i = 0; i < 6; i++) {
        monitor.recordAPICall({ userId: 'scraper', endpoint: '/api/data', ipAddress: '10.0.0.1' });
      }

      const alerts = monitor.getActiveAlerts();
      const scrapingAlert = alerts.find(a => a.type === 'POTENTIAL_SCRAPING');
      expect(scrapingAlert).toBeDefined();
      expect(scrapingAlert.severity).toBe('MEDIUM');
    });
  });

  // ============ Access Attempt Recording ============

  describe('recordAccessAttempt', () => {
    it('should record allowed access without alert', () => {
      monitor.recordAccessAttempt({
        userId: 'user1',
        resource: '/admin',
        allowed: true,
        ipAddress: '10.0.0.1'
      });

      const alerts = monitor.getActiveAlerts();
      expect(alerts.filter(a => a.type === 'UNAUTHORIZED_ACCESS_ATTEMPT')).toHaveLength(0);
    });

    it('should create alert for denied access', () => {
      monitor.recordAccessAttempt({
        userId: 'user1',
        resource: '/admin/secrets',
        allowed: false,
        ipAddress: '10.0.0.1'
      });

      const alerts = monitor.getActiveAlerts();
      const unauthorizedAlert = alerts.find(a => a.type === 'UNAUTHORIZED_ACCESS_ATTEMPT');
      expect(unauthorizedAlert).toBeDefined();
      expect(unauthorizedAlert.resource).toBe('/admin/secrets');
    });

    it('should detect privilege escalation after multiple denials', () => {
      for (let i = 0; i < 5; i++) {
        monitor.recordAccessAttempt({
          userId: 'attacker',
          resource: '/admin/resource' + i,
          allowed: false,
          ipAddress: '10.0.0.1'
        });
      }

      const alerts = monitor.getActiveAlerts();
      const escalation = alerts.find(a => a.type === 'PRIVILEGE_ESCALATION_ATTEMPT');
      expect(escalation).toBeDefined();
      expect(escalation.severity).toBe('HIGH');
    });
  });

  // ============ Alert Management ============

  describe('Alert Management', () => {
    let alertId;

    beforeEach(() => {
      const alert = monitor.createAlert({
        type: 'TEST_ALERT',
        severity: 'MEDIUM',
        userId: 'user1',
        message: 'Test alert'
      });
      alertId = alert.id;
    });

    it('should create an alert with required fields', () => {
      const alert = monitor.getAlert(alertId);
      expect(alert.type).toBe('TEST_ALERT');
      expect(alert.severity).toBe('MEDIUM');
      expect(alert.acknowledged).toBe(false);
      expect(alert.resolved).toBe(false);
    });

    it('should list active (unresolved) alerts', () => {
      const active = monitor.getActiveAlerts();
      expect(active).toHaveLength(1);
    });

    it('should acknowledge an alert', () => {
      monitor.acknowledgeAlert(alertId, 'admin');
      const alert = monitor.getAlert(alertId);
      expect(alert.acknowledged).toBe(true);
      expect(alert.acknowledgedBy).toBe('admin');
      expect(alert.acknowledgedAt).toBeDefined();
    });

    it('should resolve an alert', () => {
      monitor.resolveAlert(alertId, { resolvedBy: 'admin', resolution: 'False positive' });
      const alert = monitor.getAlert(alertId);
      expect(alert.resolved).toBe(true);
      expect(alert.resolvedBy).toBe('admin');
      expect(alert.resolution).toBe('False positive');
    });

    it('should not include resolved alerts in active list', () => {
      monitor.resolveAlert(alertId, { resolvedBy: 'admin', resolution: 'Done' });
      expect(monitor.getActiveAlerts()).toHaveLength(0);
    });

    it('should emit alert event', () => {
      const handler = jest.fn();
      monitor.on('alert', handler);
      monitor.createAlert({
        type: 'EMIT_TEST',
        severity: 'LOW',
        message: 'Event test'
      });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should call the configured alert handler', () => {
      expect(monitor.config.alertHandler).toHaveBeenCalled();
    });
  });

  // ============ Threat Score ============

  describe('Threat Score', () => {
    it('should start at zero for unknown user', () => {
      expect(monitor.getThreatScore('nobody')).toBe(0);
    });

    it('should increase on failed login', () => {
      monitor.recordFailedLogin({ userId: 'u1', ipAddress: '1.1.1.1', reason: 'bad pw' });
      expect(monitor.getThreatScore('u1')).toBeGreaterThan(0);
    });

    it('should never go below zero', () => {
      monitor.updateThreatScore('u1', -100);
      expect(monitor.getThreatScore('u1')).toBe(0);
    });

    it('should apply time-based decay', () => {
      monitor.updateThreatScore('u1', 100);
      const data = monitor.userThreatScores.get('u1');
      data.lastUpdated = Date.now() - 10 * 60 * 60 * 1000;

      const decayed = monitor.getThreatScore('u1');
      expect(decayed).toBeLessThan(100);
    });
  });

  // ============ Request Rate ============

  describe('getRequestRate', () => {
    it('should return zero for user with no calls', () => {
      const rate = monitor.getRequestRate('nobody');
      expect(rate.requestsPerMinute).toBe(0);
      expect(rate.endpoints).toEqual([]);
    });

    it('should count recent API calls', () => {
      monitor.recordAPICall({ userId: 'u1', endpoint: '/a', ipAddress: '10.0.0.1' });
      monitor.recordAPICall({ userId: 'u1', endpoint: '/b', ipAddress: '10.0.0.1' });
      const rate = monitor.getRequestRate('u1');
      expect(rate.requestsPerMinute).toBe(2);
      expect(rate.endpoints).toHaveLength(2);
    });
  });

  describe('getRequestRateByIP', () => {
    it('should return zero for IP with no calls', () => {
      const rate = monitor.getRequestRateByIP('1.2.3.4');
      expect(rate.requestsPerMinute).toBe(0);
    });
  });

  // ============ Statistics ============

  describe('getStatistics', () => {
    it('should return correct aggregate statistics', () => {
      monitor.recordFailedLogin({ userId: 'u1', ipAddress: '10.0.0.1', reason: 'bad' });
      monitor.recordSuccessfulLogin({ userId: 'u2', ipAddress: '10.0.0.2', timestamp: new Date() });
      monitor.blockIP('10.0.0.99', { reason: 'test', duration: 3600000 });

      const stats = monitor.getStatistics();
      expect(stats.totalFailedLogins).toBeGreaterThanOrEqual(1);
      expect(stats.totalSuccessfulLogins).toBeGreaterThanOrEqual(1);
      expect(stats.blockedIPs).toBe(1);
    });

    it('should count locked accounts correctly', () => {
      monitor.lockAccount('u1');
      const stats = monitor.getStatistics();
      expect(stats.lockedAccounts).toBe(1);
    });
  });

  // ============ Distance Calculation ============

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = monitor.calculateDistance(40.7128, -74.0060, 51.5074, -0.1278);
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(6000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = monitor.calculateDistance(0, 0, 0, 0);
      expect(distance).toBe(0);
    });
  });

  // ============ Reset ============

  describe('reset', () => {
    it('should clear all data stores', () => {
      monitor.recordFailedLogin({ userId: 'u1', ipAddress: '10.0.0.1', reason: 'test' });
      monitor.blockIP('10.0.0.1', { reason: 'test', duration: 1000 });
      monitor.reset();

      expect(monitor.failedLoginsByUser.size).toBe(0);
      expect(monitor.blockedIPs.size).toBe(0);
      expect(monitor.alerts.size).toBe(0);
    });
  });

  // ============ generateId ============

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 10 }, () => monitor.generateId()));
      expect(ids.size).toBe(10);
    });
  });
});
