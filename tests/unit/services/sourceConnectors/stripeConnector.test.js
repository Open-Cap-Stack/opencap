/**
 * Stripe Connector Tests
 * Issue #628: OAuth connector stub for Stripe
 */

const { connect, fetchDocuments } = require('../../../../services/sourceConnectors/stripeConnector');

describe('stripeConnector', () => {
  describe('connect()', () => {
    it('returns connected: true and source: stripe', () => {
      expect(connect('code')).toEqual({ connected: true, source: 'stripe' });
    });
  });

  describe('fetchDocuments()', () => {
    let result;

    beforeAll(async () => {
      result = await fetchDocuments(null, 'AINative Studio', 'founder@example.com');
    });

    it('returns status: success', () => {
      expect(result.status).toBe('success');
    });

    it('returns source: stripe', () => {
      expect(result.source).toBe('stripe');
    });

    it('returns 2 mock documents', () => {
      expect(result.documents).toHaveLength(2);
    });

    it('all documents have source: stripe', () => {
      expect(result.documents.every(d => d.source === 'stripe')).toBe(true);
    });

    it('includes Stripe MRR Report document', () => {
      const doc = result.documents.find(d => d.originalName.includes('MRR'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$250,000');
    });

    it('includes Ramp Expense Report document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Ramp'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$126,000');
    });

    it('all documents have required AgentInputDocument fields', () => {
      result.documents.forEach(doc => {
        expect(doc).toHaveProperty('id');
        expect(doc).toHaveProperty('source');
        expect(doc).toHaveProperty('originalName');
        expect(doc).toHaveProperty('mimeType');
        expect(doc).toHaveProperty('textContent');
        expect(doc).toHaveProperty('metadata');
      });
    });
  });
});
