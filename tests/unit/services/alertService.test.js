/**
 * AlertService Tests
 *
 * Test suite for monitoring alert system
 * Tests threshold monitoring, alert generation, and notification delivery
 */

const AlertService = require('../../../services/alertService');
const MonitoringDashboard = require('../../../services/monitoringDashboard');

describe('AlertService', () => {
  let alertService;
  let monitoringDashboard;
  let mockNotificationHandler;

  beforeEach(() => {
    monitoringDashboard = new MonitoringDashboard();
    mockNotificationHandler = jest.fn();
    alertService = new AlertService(monitoringDashboard, {
      notificationHandler: mockNotificationHandler
    });
  });

  afterEach(() => {
    alertService.stop();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default thresholds', () => {
      expect(alertService.thresholds).toBeDefined();
      expect(alertService.thresholds.syncLag).toBe(5000);
      expect(alertService.thresholds.errorRate).toBe(1);
      expect(alertService.thresholds.dlqSize).toBe(100);
    });

    it('should initialize with custom thresholds', () => {
      const customAlertService = new AlertService(monitoringDashboard, {
        thresholds: {
          syncLag: 10000,
          errorRate: 2,
          dlqSize: 200
        }
      });

      expect(customAlertService.thresholds.syncLag).toBe(10000);
      expect(customAlertService.thresholds.errorRate).toBe(2);
      expect(customAlertService.thresholds.dlqSize).toBe(200);
    });

    it('should start monitoring when start is called', () => {
      jest.useFakeTimers();
      alertService.start();
      expect(alertService.isRunning).toBe(true);
      jest.useRealTimers();
    });
  });

  describe('checkSyncLag', () => {
    it('should trigger alert when sync lag exceeds threshold', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }] // >5 seconds
      };

      alertService.checkSyncLag();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SYNC_LAG_HIGH',
          severity: 'WARNING',
          metric: 'syncLag',
          value: 6000,
          threshold: 5000
        })
      );
    });

    it('should not trigger alert when sync lag is within threshold', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 3000 }] // <5 seconds
      };

      alertService.checkSyncLag();

      expect(mockNotificationHandler).not.toHaveBeenCalled();
    });

    it('should include trend information in alert', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [
          { timestamp: Date.now() - 10000, lag: 3000 },
          { timestamp: Date.now() - 5000, lag: 4500 },
          { timestamp: Date.now(), lag: 6000 }
        ]
      };

      alertService.checkSyncLag();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          trend: 'INCREASING'
        })
      );
    });
  });

  describe('checkErrorRate', () => {
    it('should trigger alert when error rate exceeds 1%', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        errorRate: 2.5 // 2.5%
      });

      alertService.checkErrorRate();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ERROR_RATE_HIGH',
          severity: 'CRITICAL',
          metric: 'errorRate',
          value: 2.5,
          threshold: 1
        })
      );
    });

    it('should not trigger alert when error rate is within threshold', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        errorRate: 0.5 // 0.5%
      });

      alertService.checkErrorRate();

      expect(mockNotificationHandler).not.toHaveBeenCalled();
    });

    it('should adjust severity based on error rate magnitude', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        errorRate: 10 // 10%
      });

      alertService.checkErrorRate();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'CRITICAL'
        })
      );
    });
  });

  describe('checkDeadLetterQueue', () => {
    it('should trigger alert when DLQ size exceeds 100', () => {
      monitoringDashboard.syncMetrics = {
        deadLetterQueueSize: 150
      };

      alertService.checkDeadLetterQueue();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DLQ_SIZE_HIGH',
          severity: 'CRITICAL',
          metric: 'deadLetterQueueSize',
          value: 150,
          threshold: 100
        })
      );
    });

    it('should not trigger alert when DLQ size is within threshold', () => {
      monitoringDashboard.syncMetrics = {
        deadLetterQueueSize: 50
      };

      alertService.checkDeadLetterQueue();

      expect(mockNotificationHandler).not.toHaveBeenCalled();
    });

    it('should include recommended action in alert', () => {
      monitoringDashboard.syncMetrics = {
        deadLetterQueueSize: 150
      };

      alertService.checkDeadLetterQueue();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.stringContaining('Review failed events')
        })
      );
    });
  });

  describe('checkCircuitBreaker', () => {
    it('should trigger alert when circuit breaker opens', () => {
      monitoringDashboard.syncMetrics = {
        circuitBreakerStatus: 'OPEN'
      };

      alertService.checkCircuitBreaker();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CIRCUIT_BREAKER_OPEN',
          severity: 'CRITICAL',
          metric: 'circuitBreakerStatus',
          value: 'OPEN'
        })
      );
    });

    it('should trigger info alert when circuit breaker moves to half-open', () => {
      monitoringDashboard.syncMetrics = {
        circuitBreakerStatus: 'HALF_OPEN'
      };

      alertService.checkCircuitBreaker();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CIRCUIT_BREAKER_HALF_OPEN',
          severity: 'INFO'
        })
      );
    });

    it('should not trigger alert when circuit breaker is closed', () => {
      monitoringDashboard.syncMetrics = {
        circuitBreakerStatus: 'CLOSED'
      };

      alertService.checkCircuitBreaker();

      expect(mockNotificationHandler).not.toHaveBeenCalled();
    });
  });

  describe('checkAPIRateLimit', () => {
    it('should trigger alert when API rate limit usage is high', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        apiTokenUsage: {
          limit: 1000,
          remaining: 50,
          usagePercentage: 95
        }
      });

      alertService.checkAPIRateLimit();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'API_RATE_LIMIT_HIGH',
          severity: 'WARNING',
          value: 95
        })
      );
    });

    it('should not trigger alert when rate limit usage is normal', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        apiTokenUsage: {
          limit: 1000,
          remaining: 700,
          usagePercentage: 30
        }
      });

      alertService.checkAPIRateLimit();

      expect(mockNotificationHandler).not.toHaveBeenCalled();
    });
  });

  describe('checkQueryLatency', () => {
    it('should trigger alert when p99 latency is too high', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        queryLatency: {
          p50: 50,
          p95: 200,
          p99: 1500 // >1000ms
        }
      });

      alertService.checkQueryLatency();

      expect(mockNotificationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QUERY_LATENCY_HIGH',
          severity: 'WARNING',
          metric: 'queryLatency.p99',
          value: 1500
        })
      );
    });

    it('should not trigger alert when latency is acceptable', () => {
      jest.spyOn(monitoringDashboard, 'getZeroDBMetrics').mockReturnValue({
        queryLatency: {
          p50: 20,
          p95: 100,
          p99: 500
        }
      });

      alertService.checkQueryLatency();

      expect(mockNotificationHandler).not.toHaveBeenCalled();
    });
  });

  describe('alert deduplication', () => {
    it('should not trigger duplicate alerts within cooldown period', () => {
      jest.useFakeTimers();

      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();
      expect(mockNotificationHandler).toHaveBeenCalledTimes(1);

      // Try to trigger same alert immediately
      alertService.checkSyncLag();
      expect(mockNotificationHandler).toHaveBeenCalledTimes(1); // Should still be 1

      // Advance time past cooldown period (5 minutes default)
      jest.advanceTimersByTime(6 * 60 * 1000);

      alertService.checkSyncLag();
      expect(mockNotificationHandler).toHaveBeenCalledTimes(2); // Should trigger again

      jest.useRealTimers();
    });

    it('should allow different alert types simultaneously', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }],
        deadLetterQueueSize: 150
      };

      alertService.checkSyncLag();
      alertService.checkDeadLetterQueue();

      expect(mockNotificationHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return list of currently active alerts', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }],
        deadLetterQueueSize: 150,
        circuitBreakerStatus: 'OPEN'
      };

      alertService.checkAll();

      const activeAlerts = alertService.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
      expect(activeAlerts.length).toBeGreaterThan(0);
    });

    it('should include alert timestamp and duration', () => {
      jest.useFakeTimers();

      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();
      jest.advanceTimersByTime(60000); // 1 minute

      const activeAlerts = alertService.getActiveAlerts();
      expect(activeAlerts[0]).toHaveProperty('timestamp');
      expect(activeAlerts[0]).toHaveProperty('duration');
      expect(activeAlerts[0].duration).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should mark alert as acknowledged', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();
      const activeAlerts = alertService.getActiveAlerts();
      const alertId = activeAlerts[0].id;

      alertService.acknowledgeAlert(alertId, 'admin@example.com');

      const acknowledgedAlert = alertService.getAlert(alertId);
      expect(acknowledgedAlert.acknowledged).toBe(true);
      expect(acknowledgedAlert.acknowledgedBy).toBe('admin@example.com');
    });

    it('should throw error for invalid alert ID', () => {
      expect(() => {
        alertService.acknowledgeAlert('invalid-id', 'admin@example.com');
      }).toThrow();
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history with time range', () => {
      jest.useFakeTimers();

      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();
      jest.advanceTimersByTime(60000);

      const history = alertService.getAlertHistory(3600000); // Last hour
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should include resolved alerts in history', () => {
      jest.useFakeTimers();

      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();

      // Resolve alert by fixing the issue
      monitoringDashboard.syncMetrics.syncLag = [{ timestamp: Date.now(), lag: 2000 }];
      jest.advanceTimersByTime(60000);
      alertService.checkSyncLag();

      const history = alertService.getAlertHistory();
      const resolvedAlerts = history.filter(a => a.resolved);
      expect(resolvedAlerts.length).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('checkAll', () => {
    it('should run all monitoring checks', () => {
      jest.spyOn(alertService, 'checkSyncLag');
      jest.spyOn(alertService, 'checkErrorRate');
      jest.spyOn(alertService, 'checkDeadLetterQueue');
      jest.spyOn(alertService, 'checkCircuitBreaker');
      jest.spyOn(alertService, 'checkAPIRateLimit');
      jest.spyOn(alertService, 'checkQueryLatency');

      alertService.checkAll();

      expect(alertService.checkSyncLag).toHaveBeenCalled();
      expect(alertService.checkErrorRate).toHaveBeenCalled();
      expect(alertService.checkDeadLetterQueue).toHaveBeenCalled();
      expect(alertService.checkCircuitBreaker).toHaveBeenCalled();
      expect(alertService.checkAPIRateLimit).toHaveBeenCalled();
      expect(alertService.checkQueryLatency).toHaveBeenCalled();
    });
  });

  describe('alert statistics', () => {
    it('should track alert statistics', () => {
      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }],
        deadLetterQueueSize: 150
      };

      alertService.checkAll();

      const stats = alertService.getStatistics();
      expect(stats).toHaveProperty('totalAlerts');
      expect(stats).toHaveProperty('alertsByType');
      expect(stats).toHaveProperty('alertsBySeverity');
      expect(stats.totalAlerts).toBeGreaterThan(0);
    });

    it('should calculate mean time to acknowledge (MTTA)', () => {
      jest.useFakeTimers();

      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();
      const alerts = alertService.getActiveAlerts();

      jest.advanceTimersByTime(120000); // 2 minutes
      alertService.acknowledgeAlert(alerts[0].id, 'admin@example.com');

      const stats = alertService.getStatistics();
      expect(stats).toHaveProperty('meanTimeToAcknowledge');
      expect(stats.meanTimeToAcknowledge).toBeGreaterThan(0);

      jest.useRealTimers();
    });

    it('should calculate mean time to resolution (MTTR)', () => {
      jest.useFakeTimers();

      monitoringDashboard.syncMetrics = {
        syncLag: [{ timestamp: Date.now(), lag: 6000 }]
      };

      alertService.checkSyncLag();
      jest.advanceTimersByTime(300000); // 5 minutes

      // Resolve by fixing issue
      monitoringDashboard.syncMetrics.syncLag = [{ timestamp: Date.now(), lag: 2000 }];
      alertService.checkSyncLag();

      const stats = alertService.getStatistics();
      expect(stats).toHaveProperty('meanTimeToResolution');

      jest.useRealTimers();
    });
  });
});
