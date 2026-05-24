/**
 * Credential Vault Tests
 * Issue #639
 */

const { store, consume, clear } = require('../../../services/credentialVault');

describe('credentialVault', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Spy on console.log to ensure credentials are never logged
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('store() + consume()', () => {
    it('consume returns the stored credentials', () => {
      const jobId = 'job-001';
      const creds = { email: 'founder@example.com', password: 'secret123' };

      store(jobId, creds);
      const result = consume(jobId);

      expect(result).toEqual(creds);
    });

    it('map is empty after consume', () => {
      const jobId = 'job-002';
      const creds = { email: 'a@b.com', password: 'pw' };

      store(jobId, creds);
      consume(jobId);

      // Second consume returns null — map entry was deleted
      expect(consume(jobId)).toBeNull();
    });
  });

  describe('TTL expiry', () => {
    it('consume returns null after TTL has elapsed', () => {
      const jobId = 'job-003';
      const creds = { sessionCookie: 'abc123' };
      const ttlMs = 300_000; // 5 minutes

      store(jobId, creds, ttlMs);

      // Advance time past the TTL
      jest.advanceTimersByTime(ttlMs + 1);

      expect(consume(jobId)).toBeNull();
    });
  });

  describe('double consume', () => {
    it('second consume returns null', () => {
      const jobId = 'job-004';
      const creds = { email: 'x@y.com', password: 'pass' };

      store(jobId, creds);
      consume(jobId); // first consume — gets creds
      const second = consume(jobId); // second consume — entry gone

      expect(second).toBeNull();
    });
  });

  describe('clear()', () => {
    it('removes the entry so consume returns null', () => {
      const jobId = 'job-005';
      const creds = { email: 'del@test.com', password: 'pw' };

      store(jobId, creds);
      clear(jobId);

      expect(consume(jobId)).toBeNull();
    });

    it('clear on non-existent jobId does not throw', () => {
      expect(() => clear('nonexistent-job')).not.toThrow();
    });
  });

  describe('security — no credential values in logs', () => {
    it('store and consume do not call console.log', () => {
      const jobId = 'job-006';
      const creds = { email: 'secret@example.com', password: 'topsecret' };

      store(jobId, creds);
      consume(jobId);

      expect(console.log).not.toHaveBeenCalled();
    });

    it('clear does not call console.log', () => {
      const jobId = 'job-007';
      store(jobId, { sessionCookie: 'xyz' });
      clear(jobId);

      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
