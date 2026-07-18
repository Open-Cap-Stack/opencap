/**
 * AnalyticsService Tests
 * Issue #725: GA4 Measurement Protocol server-side event tracking
 *
 * Tests configuration checks, event payload construction, fetch calls,
 * error handling, and all convenience methods.
 */

describe('AnalyticsService', () => {
  let analyticsService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so the constructor re-reads env vars
    jest.resetModules();

    // Set valid GA4 config by default
    process.env.GA4_MEASUREMENT_ID = 'G-TESTID123';
    process.env.GA4_API_SECRET = 'test-api-secret';

    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    analyticsService = require('../../../services/analyticsService');
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    delete global.fetch;
    jest.restoreAllMocks();
  });

  // ── isConfigured() ──────────────────────────────────────────────

  describe('isConfigured()', () => {
    it('should return true when both GA4_MEASUREMENT_ID and GA4_API_SECRET are set', () => {
      expect(analyticsService.isConfigured()).toBe(true);
    });

    it('should return false when GA4_MEASUREMENT_ID is missing', () => {
      jest.resetModules();
      delete process.env.GA4_MEASUREMENT_ID;
      const svc = require('../../../services/analyticsService');
      expect(svc.isConfigured()).toBe(false);
    });

    it('should return false when GA4_API_SECRET is missing', () => {
      jest.resetModules();
      delete process.env.GA4_API_SECRET;
      const svc = require('../../../services/analyticsService');
      expect(svc.isConfigured()).toBe(false);
    });

    it('should return false when both env vars are missing', () => {
      jest.resetModules();
      delete process.env.GA4_MEASUREMENT_ID;
      delete process.env.GA4_API_SECRET;
      const svc = require('../../../services/analyticsService');
      expect(svc.isConfigured()).toBe(false);
    });
  });

  // ── trackEvent() ────────────────────────────────────────────────

  describe('trackEvent()', () => {
    it('should send correct payload to GA4 Measurement Protocol URL', async () => {
      const result = await analyticsService.trackEvent('user-123', 'test_event', { foo: 'bar' });

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = global.fetch.mock.calls[0];

      // Verify URL includes measurement_id and api_secret
      expect(url).toContain('https://www.google-analytics.com/mp/collect');
      expect(url).toContain('measurement_id=G-TESTID123');
      expect(url).toContain('api_secret=test-api-secret');

      // Verify request options
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      // Verify body
      const body = JSON.parse(options.body);
      expect(body.client_id).toBe('user-123');
      expect(body.events).toHaveLength(1);
      expect(body.events[0].name).toBe('test_event');
      expect(body.events[0].params.foo).toBe('bar');
      expect(body.events[0].params.engagement_time_msec).toBe('100');
    });

    it('should return false and not call fetch when not configured', async () => {
      jest.resetModules();
      delete process.env.GA4_MEASUREMENT_ID;
      delete process.env.GA4_API_SECRET;
      const svc = require('../../../services/analyticsService');

      const result = await svc.trackEvent('user-123', 'test_event');

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should gracefully handle fetch failures and return false', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await analyticsService.trackEvent('user-123', 'test_event');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Analytics event 'test_event' failed:"),
        'Network error'
      );
      consoleSpy.mockRestore();
    });

    it('should return false when fetch response is not ok', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false });

      const result = await analyticsService.trackEvent('user-123', 'test_event');

      expect(result).toBe(false);
    });

    it('should never throw even on unexpected errors', async () => {
      global.fetch.mockImplementationOnce(() => { throw new Error('Sync throw'); });
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        analyticsService.trackEvent('user-123', 'test_event')
      ).resolves.toBe(false);
    });

    it('should include default engagement_time_msec when no params provided', async () => {
      await analyticsService.trackEvent('user-123', 'test_event');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.events[0].params.engagement_time_msec).toBe('100');
    });
  });

  // ── trackSignup() ───────────────────────────────────────────────

  describe('trackSignup()', () => {
    it('should send sign_up event with correct params', async () => {
      await analyticsService.trackSignup('user-456', 'test@example.com');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.client_id).toBe('user-456');
      expect(body.events[0].name).toBe('sign_up');
      expect(body.events[0].params.method).toBe('email');
      expect(body.events[0].params.user_id).toBe('user-456');
    });

    it('should support custom method parameter', async () => {
      await analyticsService.trackSignup('user-456', 'test@example.com', 'google');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.events[0].params.method).toBe('google');
    });
  });

  // ── trackLogin() ────────────────────────────────────────────────

  describe('trackLogin()', () => {
    it('should send login event with correct params', async () => {
      await analyticsService.trackLogin('user-789');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.client_id).toBe('user-789');
      expect(body.events[0].name).toBe('login');
      expect(body.events[0].params.method).toBe('email');
      expect(body.events[0].params.user_id).toBe('user-789');
    });

    it('should support custom method parameter', async () => {
      await analyticsService.trackLogin('user-789', 'github');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.events[0].params.method).toBe('github');
    });
  });

  // ── trackBeginCheckout() ────────────────────────────────────────

  describe('trackBeginCheckout()', () => {
    it('should send begin_checkout event with correct params', async () => {
      await analyticsService.trackBeginCheckout('user-100', 'pro-monthly', 49.99);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.client_id).toBe('user-100');
      expect(body.events[0].name).toBe('begin_checkout');
      expect(body.events[0].params.currency).toBe('USD');
      expect(body.events[0].params.value).toBe(49.99);

      const items = JSON.parse(body.events[0].params.items);
      expect(items).toHaveLength(1);
      expect(items[0].item_id).toBe('pro-monthly');
      expect(items[0].item_name).toBe('pro-monthly');
    });
  });

  // ── trackPurchase() ─────────────────────────────────────────────

  describe('trackPurchase()', () => {
    it('should send purchase event with correct params', async () => {
      await analyticsService.trackPurchase('user-200', 'enterprise', 299, 'sub_abc123');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.client_id).toBe('user-200');
      expect(body.events[0].name).toBe('purchase');
      expect(body.events[0].params.transaction_id).toBe('sub_abc123');
      expect(body.events[0].params.currency).toBe('USD');
      expect(body.events[0].params.value).toBe(299);

      const items = JSON.parse(body.events[0].params.items);
      expect(items).toHaveLength(1);
      expect(items[0].item_id).toBe('enterprise');
      expect(items[0].item_name).toBe('enterprise');
    });
  });

  // ── Integration: fire-and-forget safety ─────────────────────────

  describe('fire-and-forget safety', () => {
    it('should not block callers when fetch is slow', async () => {
      let fetchResolved = false;
      global.fetch.mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(() => {
          fetchResolved = true;
          resolve({ ok: true });
        }, 500);
      }));

      // Start tracking but do NOT await
      const promise = analyticsService.trackSignup('user-slow', 'slow@test.com');

      // The promise should be pending — fetchResolved should still be false
      expect(fetchResolved).toBe(false);

      // Caller can proceed immediately; the promise resolves eventually
      const result = await promise;
      expect(result).toBe(true);
      expect(fetchResolved).toBe(true);
    });

    it('should never propagate errors to callers using catch pattern', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Total failure'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // This mirrors how controllers use the service: fire-and-forget with .catch(() => {})
      let caughtError = false;
      try {
        await analyticsService.trackLogin('user-err').catch(() => {});
      } catch {
        caughtError = true;
      }

      expect(caughtError).toBe(false);
    });
  });

  // ── URL format verification ─────────────────────────────────────

  describe('URL format', () => {
    it('should construct URL with measurement_id and api_secret query params', async () => {
      await analyticsService.trackEvent('client-1', 'page_view');

      const url = global.fetch.mock.calls[0][0];
      expect(url).toBe(
        'https://www.google-analytics.com/mp/collect?measurement_id=G-TESTID123&api_secret=test-api-secret'
      );
    });
  });
});
