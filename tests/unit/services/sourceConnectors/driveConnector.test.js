/**
 * Drive Connector Tests
 * Issue #628: OAuth connector stub for Google Drive
 */

const { connect, fetchDocuments } = require('../../../../services/sourceConnectors/driveConnector');

describe('driveConnector', () => {
  describe('connect()', () => {
    it('returns connected: true and source: drive', () => {
      expect(connect('code')).toEqual({ connected: true, source: 'drive' });
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

    it('returns source: drive', () => {
      expect(result.source).toBe('drive');
    });

    it('returns 5 mock documents', () => {
      expect(result.documents).toHaveLength(5);
    });

    it('all documents have source: drive', () => {
      expect(result.documents.every(d => d.source === 'drive')).toBe(true);
    });

    it('includes Financial Model document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Financial Model'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('$3M ARR');
    });

    it('includes Cap Table document', () => {
      const doc = result.documents.find(d => d.originalName.includes('Cap Table'));
      expect(doc).toBeDefined();
      expect(doc.textContent).toContain('10,000,000');
    });

    it('includes driveUrl in metadata for all documents', () => {
      expect(result.documents.every(d => d.metadata.driveUrl !== null)).toBe(true);
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
