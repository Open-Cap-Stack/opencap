/**
 * Carta Connector Tests
 * Issue #628: OAuth connector stub for Carta
 */

const { connect, fetchDocuments } = require('../../../../services/sourceConnectors/cartaConnector');

describe('cartaConnector', () => {
  describe('connect()', () => {
    it('returns connected: true and source: carta', () => {
      expect(connect('code')).toEqual({ connected: true, source: 'carta' });
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

    it('returns source: carta', () => {
      expect(result.source).toBe('carta');
    });

    it('returns 3 mock documents', () => {
      expect(result.documents).toHaveLength(3);
    });

    it('all documents have source: carta', () => {
      expect(result.documents.every(d => d.source === 'carta')).toBe(true);
    });

    it('includes Cap Table export document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Cap Table'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('Sequoia Capital');
    });

    it('includes Stock Option Grants document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Stock Option'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('847,000');
    });

    it('includes Valuations History document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Valuations'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$25M');
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
