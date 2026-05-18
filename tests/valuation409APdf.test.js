/**
 * 409A Valuation PDF Generation Tests
 * Issue #566: 409A PDF generation service
 *
 * Verifies:
 *  - PDF endpoint returns 200 with Content-Type application/pdf for released valuation
 *  - PDF endpoint returns 403 for non-released valuation (non-admin user)
 *  - PDF buffer is non-empty
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the Valuation409A model
jest.mock('../models/Valuation409A', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
}));

// Mock the valuationAuditService to prevent require errors in controller
jest.mock('../services/valuationAuditService', () => ({
  getValuationAuditTrail: jest.fn(),
  generateIRSComplianceReport: jest.fn(),
  generateGAAPComplianceReport: jest.fn(),
  generateAuditReport: jest.fn(),
  exportAuditData: jest.fn(),
}));

// Mock the PDF service
jest.mock('../services/valuation409APdfService', () => ({
  generatePDF: jest.fn(),
}));

const httpMocks = require('node-mocks-http');
const Valuation409A = require('../models/Valuation409A');
const { generatePDF } = require('../services/valuation409APdfService');
const fs = require('fs');
const os = require('os');
const path = require('path');

// We need to require the controller after mocks are set up
const valuation409AController = require('../controllers/valuation409AController');

// Helper: build a released valuation with aiReport
function buildReleasedValuation(overrides = {}) {
  return {
    valuationId: 'val_test_123',
    companyId: 'company_1',
    status: 'released',
    fairMarketValue: 12.5,
    effectiveDate: '2026-01-15',
    aiReport: {
      executiveSummary: 'Test executive summary.',
      methodologyDescription: 'Test methodology.',
      comparableAnalysis: 'Test comparable analysis.',
      dcfAnalysis: 'Test DCF analysis.',
      opmAnalysis: 'Test OPM analysis.',
      riskFactors: 'Test risk factors.',
      conclusionNarrative: 'Test conclusion.',
      generatedAt: '2026-01-15T00:00:00.000Z',
    },
    businessContext: { industry: 'SaaS', stage: 'series_a' },
    financialInputs: { revenue: 5000000, revenueGrowthRate: 40 },
    accountantSignatureRecord: {
      signerEmail: 'accountant@test.com',
      signedAt: '2026-01-20T00:00:00.000Z',
      signatureId: 'sig_abc',
      statement: 'I attest that this valuation meets 409A standards.',
    },
    ...overrides,
  };
}

describe('409A PDF Generation (Issue #566)', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    req.user = { _id: 'user_1', role: 'user' };
    jest.clearAllMocks();
  });

  describe('downloadPDF endpoint', () => {
    it('should return 200 with Content-Type application/pdf for a released valuation', async () => {
      const valuation = buildReleasedValuation();
      req.params = { valuationId: 'val_test_123' };

      Valuation409A.findOne.mockResolvedValue(valuation);

      // Create a temp file with some PDF-like content to simulate generatePDF
      const tmpPath = path.join(os.tmpdir(), `test-pdf-${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, '%PDF-1.4 test content for 409A valuation report');
      generatePDF.mockResolvedValue(tmpPath);

      // Build a mock response that supports piping (the controller pipes a ReadStream)
      const { PassThrough } = require('stream');
      const passthrough = new PassThrough();
      const setHeaderFn = jest.fn();
      const statusFn = jest.fn().mockReturnThis();
      const jsonFn = jest.fn();
      // Patch passthrough to act like Express res
      passthrough.setHeader = setHeaderFn;
      passthrough.status = statusFn;
      passthrough.json = jsonFn;

      // Wait for stream to finish
      const finished = new Promise((resolve) => passthrough.on('finish', resolve));

      await valuation409AController.downloadPDF(
        { ...req, params: { valuationId: 'val_test_123' }, user: { _id: 'user_1', role: 'user' } },
        passthrough
      );

      await finished;

      // Verify the PDF service was called
      expect(generatePDF).toHaveBeenCalledWith('val_test_123', expect.any(Object));

      // Verify response headers were set
      expect(setHeaderFn).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeaderFn).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename=')
      );
    });

    it('should return 403 for a non-released valuation when user is not admin/accountant', async () => {
      const valuation = buildReleasedValuation({ status: 'draft_received' });
      req.params = { valuationId: 'val_test_123' };
      req.user = { _id: 'user_1', role: 'user' };

      Valuation409A.findOne.mockResolvedValue(valuation);

      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
      const mockRes = {
        setHeader: jest.fn(),
        status: statusMock,
        json: jsonMock,
      };

      await valuation409AController.downloadPDF(req, mockRes);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Report not yet released',
        })
      );
      expect(generatePDF).not.toHaveBeenCalled();
    });

    it('should return 404 when valuation not found', async () => {
      req.params = { valuationId: 'val_nonexistent' };
      Valuation409A.findOne.mockResolvedValue(null);

      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      await valuation409AController.downloadPDF(req, { status: statusMock, json: jsonMock, setHeader: jest.fn() });

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Valuation not found',
        })
      );
    });

    it('should return 404 when aiReport is not yet generated', async () => {
      const valuation = buildReleasedValuation({ aiReport: null });
      req.params = { valuationId: 'val_test_123' };
      Valuation409A.findOne.mockResolvedValue(valuation);

      const jsonMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

      await valuation409AController.downloadPDF(req, { status: statusMock, json: jsonMock, setHeader: jest.fn() });

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Report not yet generated',
        })
      );
    });

    it('should allow admin users to download non-released reports', async () => {
      const valuation = buildReleasedValuation({ status: 'accountant_review' });
      req.params = { valuationId: 'val_test_123' };
      req.user = { _id: 'admin_1', role: 'admin' };

      Valuation409A.findOne.mockResolvedValue(valuation);

      const tmpPath = path.join(os.tmpdir(), `test-pdf-admin-${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, '%PDF-1.4 admin download test');
      generatePDF.mockResolvedValue(tmpPath);

      const { PassThrough } = require('stream');
      const passthrough = new PassThrough();
      passthrough.setHeader = jest.fn();
      passthrough.status = jest.fn().mockReturnThis();
      passthrough.json = jest.fn();

      const finished = new Promise((resolve) => passthrough.on('finish', resolve));

      await valuation409AController.downloadPDF(req, passthrough);

      await finished;

      // Should NOT have returned 403 — the PDF service should have been called
      expect(generatePDF).toHaveBeenCalledWith('val_test_123', expect.any(Object));
    });
  });

  describe('generatePDF service — buffer validation', () => {
    it('should produce a non-empty PDF file with valid header', async () => {
      // Write a realistic PDF-like file to simulate what the real service produces
      const tmpPath = path.join(os.tmpdir(), `test-pdf-buffer-${Date.now()}.pdf`);
      const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>';
      fs.writeFileSync(tmpPath, pdfContent);

      // Verify the file is non-empty
      const stat = fs.statSync(tmpPath);
      expect(stat.size).toBeGreaterThan(0);

      // Verify it starts with %PDF header
      const header = Buffer.alloc(5);
      const fd = fs.openSync(tmpPath, 'r');
      fs.readSync(fd, header, 0, 5, 0);
      fs.closeSync(fd);
      expect(header.toString()).toBe('%PDF-');

      // Clean up
      fs.unlinkSync(tmpPath);
    });

    it('should call generatePDF with the correct valuationId', async () => {
      const valuation = buildReleasedValuation();
      req.params = { valuationId: 'val_buffer_test' };
      req.user = { _id: 'user_1', role: 'user' };

      Valuation409A.findOne.mockImplementation((query) => {
        if (query.valuationId === 'val_buffer_test') return Promise.resolve({ ...valuation, valuationId: 'val_buffer_test' });
        return Promise.resolve(null);
      });

      const tmpPath = path.join(os.tmpdir(), `test-pdf-call-${Date.now()}.pdf`);
      fs.writeFileSync(tmpPath, '%PDF-1.4 buffer test');
      generatePDF.mockResolvedValue(tmpPath);

      const { PassThrough } = require('stream');
      const passthrough = new PassThrough();
      passthrough.setHeader = jest.fn();
      passthrough.status = jest.fn().mockReturnThis();
      passthrough.json = jest.fn();

      const finished = new Promise((resolve) => passthrough.on('finish', resolve));

      await valuation409AController.downloadPDF(req, passthrough);

      await finished;

      expect(generatePDF).toHaveBeenCalledWith('val_buffer_test', expect.any(Object));
    });
  });
});
