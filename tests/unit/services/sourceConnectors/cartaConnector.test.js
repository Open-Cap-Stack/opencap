/**
 * Carta Connector Tests
 * Issue #628: OAuth connector stub for Carta
 * Issue #641: Browser automation mode with mock fallback
 */

jest.mock('../../../../services/browserAutomationService', () => ({
  automateCartaFetch: jest.fn()
}));

const { automateCartaFetch } = require('../../../../services/browserAutomationService');
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

  describe('fetchDocuments() — browser automation mode (#641)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('automationMode browser + service returns docs → returns real docs', async () => {
      const realDocs = [
        {
          id: 'doc-real-1',
          source: 'carta',
          originalName: 'carta_cap_table.txt',
          mimeType: 'text/plain',
          textContent: 'Real cap table data from Playwright',
          metadata: { fileSize: 500, pageCount: 1, sheetNames: [], subject: 'Cap Table', sender: 'carta', date: new Date().toISOString(), driveUrl: 'https://app.carta.com/captable/' }
        },
        {
          id: 'doc-real-2',
          source: 'carta',
          originalName: 'carta_option_grants.txt',
          mimeType: 'text/plain',
          textContent: 'Real option grants data from Playwright',
          metadata: { fileSize: 400, pageCount: 1, sheetNames: [], subject: 'Option Grants', sender: 'carta', date: new Date().toISOString(), driveUrl: 'https://app.carta.com/equity/grants/' }
        }
      ];

      automateCartaFetch.mockResolvedValue(realDocs);

      const result = await fetchDocuments(null, 'AcmeCo', 'founder@acme.com', {
        jobId: 'rj-browser-001',
        automationMode: 'browser'
      });

      expect(result.status).toBe('success');
      expect(result.source).toBe('carta');
      expect(result.documents).toBe(realDocs);
      expect(automateCartaFetch).toHaveBeenCalledWith('rj-browser-001', 'AcmeCo');
    });

    it('automationMode browser + service returns null → returns mock docs', async () => {
      automateCartaFetch.mockResolvedValue(null);

      const result = await fetchDocuments(null, 'AcmeCo', 'founder@acme.com', {
        jobId: 'rj-browser-002',
        automationMode: 'browser'
      });

      expect(result.status).toBe('success');
      expect(result.source).toBe('carta');
      expect(result.documents).toHaveLength(3); // mock documents
      expect(result.documents[0].originalName).toContain('Cap Table');
    });

    it('automationMode browser + service throws → returns mock docs', async () => {
      automateCartaFetch.mockRejectedValue(new Error('Playwright crashed'));

      const result = await fetchDocuments(null, 'AcmeCo', 'founder@acme.com', {
        jobId: 'rj-browser-003',
        automationMode: 'browser'
      });

      expect(result.status).toBe('success');
      expect(result.source).toBe('carta');
      expect(result.documents).toHaveLength(3); // mock documents
    });
  });
});
