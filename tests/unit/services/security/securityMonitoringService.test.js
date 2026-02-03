/**
 * SecurityMonitoringService Tests
 *
 * Test suite for threat detection and security monitoring
 * Tests failed login tracking, brute force detection, suspicious activity alerts
 */

const SecurityMonitoringService = require('../../../../services/security/securityMonitoringService');

describe('SecurityMonitoringService', () => {
  let securityService;
  let mockAlertHandler;

  beforeEach(() => {
    mockAlertHandler = jest.fn();
    securityService = new SecurityMonitoringService({
      alertHandler: mockAlertHandler
    });
  });

  afterEach(() => {
    securityService.reset();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(securityService).toBeDefined();
      expect(securityService.config).toBeDefined();
    });

    it('should accept custom thresholds', () => {
      const customService = new SecurityMonitoringService({
        thresholds: {
          maxFailedLogins: 10,
          bruteForceWindow: 600000,
          suspiciousActivityScore: 100
        }
      });
      expect(customService.config.thresholds.maxFailedLogins).toBe(10);
    });

    it('should have default max failed logins of 5', () => {
      expect(securityService.config.thresholds.maxFailedLogins).toBe(5);
    });

    it('should have default brute force window of 5 minutes', () => {
      expect(securityService.config.thresholds.bruteForceWindow).toBe(300000);
    });
  });

  describe('failed login tracking', () => {
    it('should track failed login attempts', () => {
      securityService.recordFailedLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        reason: 'Invalid password'
      });

      const attempts = securityService.getFailedLoginAttempts('user123');
      expect(attempts.length).toBe(1);
      expect(attempts[0].reason).toBe('Invalid password');
    });

    it('should track multiple failed attempts for same user', () => {
      for (let i = 0; i < 3; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const attempts = securityService.getFailedLoginAttempts('user123');
      expect(attempts.length).toBe(3);
    });

    it('should track failed attempts by IP address', () => {
      securityService.recordFailedLogin({
        userId: 'user1',
        ipAddress: '192.168.1.100',
        reason: 'Invalid password'
      });
      securityService.recordFailedLogin({
        userId: 'user2',
        ipAddress: '192.168.1.100',
        reason: 'Invalid password'
      });

      const attempts = securityService.getFailedLoginsByIP('192.168.1.100');
      expect(attempts.length).toBe(2);
    });

    it('should clear failed attempts on successful login', () => {
      securityService.recordFailedLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        reason: 'Invalid password'
      });

      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      const attempts = securityService.getFailedLoginAttempts('user123');
      expect(attempts.length).toBe(0);
    });

    it('should expire old failed login attempts', () => {
      jest.useFakeTimers();

      securityService.recordFailedLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        reason: 'Invalid password'
      });

      // Fast forward past window (default 5 minutes + 1 minute)
      jest.advanceTimersByTime(6 * 60 * 1000);

      const attempts = securityService.getFailedLoginAttempts('user123');
      expect(attempts.length).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('brute force detection', () => {
    it('should detect brute force attack after threshold exceeded', () => {
      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BRUTE_FORCE_DETECTED',
          severity: 'HIGH',
          userId: 'user123'
        })
      );
    });

    it('should not trigger brute force alert below threshold', () => {
      for (let i = 0; i < 4; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      expect(mockAlertHandler).not.toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BRUTE_FORCE_DETECTED'
        })
      );
    });

    it('should detect brute force by IP across multiple users', () => {
      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: `user${i}`,
          ipAddress: '192.168.1.100',
          reason: 'Invalid password'
        });
      }

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BRUTE_FORCE_IP_DETECTED',
          severity: 'HIGH',
          ipAddress: '192.168.1.100'
        })
      );
    });

    it('should trigger account lockout recommendation', () => {
      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const isLocked = securityService.isAccountLocked('user123');
      expect(isLocked).toBe(true);
    });

    it('should unlock account after lockout period', () => {
      jest.useFakeTimers();

      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      expect(securityService.isAccountLocked('user123')).toBe(true);

      // Default lockout is 15 minutes
      jest.advanceTimersByTime(16 * 60 * 1000);

      expect(securityService.isAccountLocked('user123')).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('suspicious activity detection', () => {
    it('should detect login from new IP address', () => {
      // Record normal activity
      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1'
      });

      // Login from new IP
      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '10.0.0.100'
      });

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_IP_LOGIN',
          severity: 'MEDIUM',
          userId: 'user123',
          ipAddress: '10.0.0.100'
        })
      );
    });

    it('should detect login from new geographic location', () => {
      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        location: { country: 'US', city: 'New York' }
      });

      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '10.0.0.100',
        location: { country: 'CN', city: 'Beijing' }
      });

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'NEW_LOCATION_LOGIN',
          severity: 'HIGH'
        })
      );
    });

    it('should detect impossible travel scenario', () => {
      jest.useFakeTimers();

      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        location: { country: 'US', city: 'New York', lat: 40.7128, lon: -74.0060 }
      });

      // 30 minutes later, login from very far location
      jest.advanceTimersByTime(30 * 60 * 1000);

      securityService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '10.0.0.100',
        location: { country: 'JP', city: 'Tokyo', lat: 35.6762, lon: 139.6503 }
      });

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IMPOSSIBLE_TRAVEL',
          severity: 'CRITICAL'
        })
      );

      jest.useRealTimers();
    });

    it('should detect unusual login times', () => {
      const customService = new SecurityMonitoringService({
        alertHandler: mockAlertHandler,
        normalLoginHours: { start: 8, end: 18 } // 8 AM to 6 PM
      });

      // Mock a login at 3 AM
      const loginTime = new Date();
      loginTime.setHours(3, 0, 0, 0);

      customService.recordSuccessfulLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        timestamp: loginTime
      });

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UNUSUAL_LOGIN_TIME',
          severity: 'LOW'
        })
      );
    });

    it('should detect rapid successive API calls (potential scraping)', () => {
      for (let i = 0; i < 100; i++) {
        securityService.recordAPICall({
          userId: 'user123',
          endpoint: '/api/v1/data',
          ipAddress: '192.168.1.1'
        });
      }

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'POTENTIAL_SCRAPING',
          severity: 'MEDIUM'
        })
      );
    });

    it('should detect attempts to access restricted resources', () => {
      securityService.recordAccessAttempt({
        userId: 'user123',
        resource: '/admin/settings',
        allowed: false,
        ipAddress: '192.168.1.1'
      });

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          severity: 'MEDIUM'
        })
      );
    });

    it('should detect multiple unauthorized access attempts', () => {
      for (let i = 0; i < 5; i++) {
        securityService.recordAccessAttempt({
          userId: 'user123',
          resource: `/admin/resource${i}`,
          allowed: false,
          ipAddress: '192.168.1.1'
        });
      }

      expect(mockAlertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PRIVILEGE_ESCALATION_ATTEMPT',
          severity: 'HIGH'
        })
      );
    });
  });

  describe('IP blocking', () => {
    it('should block IP after threshold exceeded', () => {
      // IP is blocked after 2x the user threshold (default 5 * 2 = 10)
      for (let i = 0; i < 12; i++) {
        securityService.recordFailedLogin({
          userId: `user${i}`,
          ipAddress: '192.168.1.100',
          reason: 'Invalid password'
        });
      }

      expect(securityService.isIPBlocked('192.168.1.100')).toBe(true);
    });

    it('should allow manual IP blocking', () => {
      securityService.blockIP('192.168.1.200', {
        reason: 'Manual block - suspicious activity',
        duration: 3600000
      });

      expect(securityService.isIPBlocked('192.168.1.200')).toBe(true);
    });

    it('should allow manual IP unblocking', () => {
      securityService.blockIP('192.168.1.200', {
        reason: 'Test block'
      });

      securityService.unblockIP('192.168.1.200');

      expect(securityService.isIPBlocked('192.168.1.200')).toBe(false);
    });

    it('should expire IP blocks after duration', () => {
      jest.useFakeTimers();

      securityService.blockIP('192.168.1.200', {
        reason: 'Test block',
        duration: 3600000 // 1 hour
      });

      expect(securityService.isIPBlocked('192.168.1.200')).toBe(true);

      jest.advanceTimersByTime(3600001);

      expect(securityService.isIPBlocked('192.168.1.200')).toBe(false);

      jest.useRealTimers();
    });

    it('should return list of blocked IPs', () => {
      securityService.blockIP('192.168.1.100', { reason: 'Test 1' });
      securityService.blockIP('192.168.1.101', { reason: 'Test 2' });

      const blocked = securityService.getBlockedIPs();
      expect(blocked.length).toBe(2);
    });
  });

  describe('security alerts', () => {
    it('should return all active alerts', () => {
      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const alerts = securityService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should allow acknowledging alerts', () => {
      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const alerts = securityService.getActiveAlerts();
      const alertId = alerts[0].id;

      securityService.acknowledgeAlert(alertId, 'admin@example.com');

      const updatedAlert = securityService.getAlert(alertId);
      expect(updatedAlert.acknowledged).toBe(true);
      expect(updatedAlert.acknowledgedBy).toBe('admin@example.com');
    });

    it('should allow resolving alerts', () => {
      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const alerts = securityService.getActiveAlerts();
      const alertId = alerts[0].id;

      securityService.resolveAlert(alertId, {
        resolvedBy: 'admin@example.com',
        resolution: 'False positive - legitimate user'
      });

      const updatedAlert = securityService.getAlert(alertId);
      expect(updatedAlert.resolved).toBe(true);
      expect(updatedAlert.resolution).toBe('False positive - legitimate user');
    });
  });

  describe('threat score calculation', () => {
    it('should calculate threat score for user', () => {
      securityService.recordFailedLogin({
        userId: 'user123',
        ipAddress: '192.168.1.1',
        reason: 'Invalid password'
      });

      const score = securityService.getThreatScore('user123');
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThan(0);
    });

    it('should increase threat score with multiple violations', () => {
      const initialScore = securityService.getThreatScore('user123');

      for (let i = 0; i < 3; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const newScore = securityService.getThreatScore('user123');
      expect(newScore).toBeGreaterThan(initialScore);
    });

    it('should decay threat score over time', () => {
      jest.useFakeTimers();

      for (let i = 0; i < 3; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }

      const initialScore = securityService.getThreatScore('user123');

      // Fast forward 1 hour
      jest.advanceTimersByTime(60 * 60 * 1000);

      const decayedScore = securityService.getThreatScore('user123');
      expect(decayedScore).toBeLessThan(initialScore);

      jest.useRealTimers();
    });
  });

  describe('security statistics', () => {
    it('should return security statistics', () => {
      securityService.recordFailedLogin({
        userId: 'user1',
        ipAddress: '192.168.1.1',
        reason: 'Invalid password'
      });
      securityService.recordSuccessfulLogin({
        userId: 'user2',
        ipAddress: '192.168.1.2'
      });

      const stats = securityService.getStatistics();
      expect(stats).toHaveProperty('totalFailedLogins');
      expect(stats).toHaveProperty('totalSuccessfulLogins');
      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('blockedIPs');
      expect(stats).toHaveProperty('lockedAccounts');
    });

    it('should return statistics for time period', () => {
      const stats = securityService.getStatistics({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(stats).toBeDefined();
    });
  });

  describe('event listeners', () => {
    it('should emit events on security alerts', (done) => {
      let alertReceived = false;
      securityService.on('alert', (alert) => {
        if (!alertReceived && alert.type === 'BRUTE_FORCE_DETECTED') {
          alertReceived = true;
          expect(alert.type).toBe('BRUTE_FORCE_DETECTED');
          done();
        }
      });

      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }
    });

    it('should emit events on account lockout', (done) => {
      let lockEventReceived = false;
      securityService.on('accountLocked', (data) => {
        if (!lockEventReceived) {
          lockEventReceived = true;
          expect(data.userId).toBe('user123');
          done();
        }
      });

      for (let i = 0; i < 6; i++) {
        securityService.recordFailedLogin({
          userId: 'user123',
          ipAddress: '192.168.1.1',
          reason: 'Invalid password'
        });
      }
    });

    it('should emit events on IP block', (done) => {
      securityService.on('ipBlocked', (data) => {
        expect(data.ipAddress).toBe('192.168.1.100');
        done();
      });

      securityService.blockIP('192.168.1.100', { reason: 'Test' });
    });
  });

  describe('rate limiting integration', () => {
    it('should track request rates per user', () => {
      for (let i = 0; i < 50; i++) {
        securityService.recordAPICall({
          userId: 'user123',
          endpoint: '/api/v1/data',
          ipAddress: '192.168.1.1'
        });
      }

      const rate = securityService.getRequestRate('user123');
      expect(rate.requestsPerMinute).toBeGreaterThan(0);
    });

    it('should track request rates per IP', () => {
      for (let i = 0; i < 50; i++) {
        securityService.recordAPICall({
          userId: `user${i % 5}`,
          endpoint: '/api/v1/data',
          ipAddress: '192.168.1.100'
        });
      }

      const rate = securityService.getRequestRateByIP('192.168.1.100');
      expect(rate.requestsPerMinute).toBeGreaterThan(0);
    });
  });
});
