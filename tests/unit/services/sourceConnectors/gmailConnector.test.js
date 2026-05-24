/**
 * Gmail Connector Tests
 * Issue #628: OAuth connector stub for Gmail
 */

const { connect, fetchDocuments } = require('../../../../services/sourceConnectors/gmailConnector');

describe('gmailConnector', () => {
  // ── connect() ──────────────────────────────────────────────────────────────

  describe('connect()', () => {
    it('returns connected: true and source: gmail', () => {
      const result = connect('mock-oauth-code');
      expect(result).toEqual({ connected: true, source: 'gmail' });
    });

    it('returns connected even without an oauth code', () => {
      const result = connect(null);
      expect(result.connected).toBe(true);
    });
  });

  // ── fetchDocuments() ───────────────────────────────────────────────────────

  describe('fetchDocuments()', () => {
    let result;

    beforeAll(async () => {
      result = await fetchDocuments(null, 'AINative Studio', 'founder@example.com');
    });

    it('returns status: success', () => {
      expect(result.status).toBe('success');
    });

    it('returns source: gmail', () => {
      expect(result.source).toBe('gmail');
    });

    it('returns error: null', () => {
      expect(result.error).toBeNull();
    });

    it('returns 4 mock documents', () => {
      expect(result.documents).toHaveLength(4);
    });

    it('all documents have source: gmail', () => {
      expect(result.documents.every(d => d.source === 'gmail')).toBe(true);
    });

    it('all documents have uuid ids', () => {
      result.documents.forEach(d => {
        expect(d.id).toBeDefined();
        expect(typeof d.id).toBe('string');
        expect(d.id.length).toBeGreaterThan(0);
      });
    });

    it('includes Brex Invoice document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Brex'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$45,000');
    });

    it('includes Stripe Revenue Summary document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Stripe'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$750,000');
    });

    it('includes Tax Documents', () => {
      const doc = result.documents.find(d => d.originalName.includes('Tax'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('2023');
    });

    it('includes Seed Round LOI', () => {
      const doc = result.documents.find(d => d.originalName.includes('LOI'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$500,000');
    });

    it('all documents have the required AgentInputDocument fields', () => {
      result.documents.forEach(doc => {
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('source');
        expect(doc).toHaveProperty('originalName');
        expect(doc).toHaveProperty('mimeType');
        expect(doc).toHaveProperty('textContent');
        expect(doc).toHaveProperty('metadata');
      });
    });

    it('returns mock data even when token is null', async () => {
      const noTokenResult = await fetchDocuments(null, 'Co', 'founder@co.com');
      expect(noTokenResult.status).toBe('success');
      expect(noTokenResult.documents.length).toBeGreaterThan(0);
    });

    it('generates fresh uuid ids on each call', async () => {
      const firstCall  = await fetchDocuments(null, 'Co', 'founder@co.com');
      const secondCall = await fetchDocuments(null, 'Co', 'founder@co.com');
      const firstIds  = firstCall.documents.map(d => d.id);
      const secondIds = secondCall.documents.map(d => d.id);
      // IDs should be different across calls
      expect(firstIds).not.toEqual(secondIds);
    });
  });
});
