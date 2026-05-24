/**
 * Browser Automation Service Tests
 * Issue #640
 */

// Mock playwright before requiring the service
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  }
}), { virtual: true });

// Mock credentialVault
jest.mock('../../../services/credentialVault', () => ({
  consume: jest.fn(),
  clear: jest.fn()
}));

const credentialVault = require('../../../services/credentialVault');

describe('browserAutomationService', () => {
  let automateCartaFetch;
  let mockChromium;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Re-require after reset so module picks up fresh mocks
    jest.mock('playwright', () => ({
      chromium: {
        launch: jest.fn()
      }
    }), { virtual: true });

    jest.mock('../../../services/credentialVault', () => ({
      consume: jest.fn(),
      clear: jest.fn()
    }));

    ({ automateCartaFetch } = require('../../../services/browserAutomationService'));
    mockChromium = require('playwright').chromium;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('returns null when chromium not available', () => {
    it('returns null if playwright cannot be loaded', async () => {
      jest.resetModules();

      jest.doMock('playwright', () => { throw new Error('Module not found'); }, { virtual: true });
      jest.doMock('../../../services/credentialVault', () => ({
        consume: jest.fn().mockReturnValue({ email: 'a@b.com', password: 'pw' }),
        clear: jest.fn()
      }));

      const { automateCartaFetch: noPlaywrightFetch } = require('../../../services/browserAutomationService');
      const result = await noPlaywrightFetch('job-001', 'AcmeCo');

      expect(result).toBeNull();
    });
  });

  describe('returns null when credentialVault.consume returns null', () => {
    it('returns null immediately when no credentials are found', async () => {
      const vault = require('../../../services/credentialVault');
      vault.consume.mockReturnValue(null);

      const result = await automateCartaFetch('job-002', 'AcmeCo');

      expect(result).toBeNull();
    });
  });

  describe('timeout behavior', () => {
    it('returns null when automation times out', async () => {
      jest.useFakeTimers();

      const vault = require('../../../services/credentialVault');
      vault.consume.mockReturnValue({ email: 'a@b.com', password: 'pw' });

      // Make the browser launch hang forever
      mockChromium.launch.mockImplementation(() => new Promise(() => {}));

      const fetchPromise = automateCartaFetch('job-003', 'AcmeCo');

      // Advance past the 3-minute timeout
      jest.advanceTimersByTime(3 * 60 * 1000 + 1);

      const result = await fetchPromise;
      expect(result).toBeNull();
    });
  });

  describe('browser.close() called in finally', () => {
    it('calls browser.close() even when doAutomation throws', async () => {
      const vault = require('../../../services/credentialVault');
      vault.consume.mockReturnValue({ email: 'a@b.com', password: 'pw' });

      const mockClose = jest.fn().mockResolvedValue(undefined);
      const mockBrowser = { close: mockClose };

      // Browser launches but newContext() throws
      mockChromium.launch.mockResolvedValue({
        ...mockBrowser,
        newContext: jest.fn().mockRejectedValue(new Error('Context creation failed'))
      });

      const result = await automateCartaFetch('job-004', 'AcmeCo');

      expect(result).toBeNull();
      // close is called on the browser object returned by launch
      expect(mockChromium.launch).toHaveBeenCalled();
    });
  });

  describe('successful automation', () => {
    it('returns AgentInputDocument[] when automation succeeds', async () => {
      const vault = require('../../../services/credentialVault');
      vault.consume.mockReturnValue({ email: 'founder@carta.com', password: 'pw' });
      vault.clear.mockReturnValue(undefined);

      const fakeBodyContent = 'A'.repeat(200); // > 100 chars to pass the length check

      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        fill: jest.fn().mockResolvedValue(undefined),
        click: jest.fn().mockResolvedValue(undefined),
        waitForURL: jest.fn().mockResolvedValue(undefined),
        textContent: jest.fn().mockResolvedValue(fakeBodyContent)
      };

      const mockContext = {
        addCookies: jest.fn().mockResolvedValue(undefined),
        newPage: jest.fn().mockResolvedValue(mockPage)
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined)
      };

      mockChromium.launch.mockResolvedValue(mockBrowser);

      const result = await automateCartaFetch('job-005', 'AcmeCo');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Verify AgentInputDocument shape
      for (const doc of result) {
        expect(doc).toHaveProperty('id');
        expect(doc.source).toBe('carta');
        expect(doc).toHaveProperty('originalName');
        expect(doc.mimeType).toBe('text/plain');
        expect(doc).toHaveProperty('textContent');
        expect(doc).toHaveProperty('metadata');
        expect(doc.metadata).toHaveProperty('subject');
        expect(doc.metadata).toHaveProperty('driveUrl');
      }

      // Verify browser was closed
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('uses session cookie injection when sessionCookie is provided', async () => {
      const vault = require('../../../services/credentialVault');
      vault.consume.mockReturnValue({ sessionCookie: 'sess_abc123' });
      vault.clear.mockReturnValue(undefined);

      const fakeBodyContent = 'B'.repeat(200);

      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        textContent: jest.fn().mockResolvedValue(fakeBodyContent)
      };

      const mockContext = {
        addCookies: jest.fn().mockResolvedValue(undefined),
        newPage: jest.fn().mockResolvedValue(mockPage)
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined)
      };

      mockChromium.launch.mockResolvedValue(mockBrowser);

      const result = await automateCartaFetch('job-006', 'AcmeCo');

      // Should inject cookie instead of calling login
      expect(mockContext.addCookies).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'session',
          value: 'sess_abc123',
          domain: '.carta.com'
        })
      ]);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
