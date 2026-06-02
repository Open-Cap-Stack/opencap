'use strict';

/**
 * Mercury Statement Import Controller Tests
 * Issue #675: Bank statement import endpoint
 * TDD: RED phase — tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Set encryption key for token decryption in mercuryService
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// Mock auth middleware
jest.mock('../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    if (req.headers.authorization === 'Bearer founder-token') {
      req.user = {
        userId: 'user-1',
        role: 'founder',
        companyId: 'company-1',
      };
    } else if (req.headers.authorization === 'Bearer no-company') {
      req.user = { userId: 'user-2', role: 'founder' };
    }
    // No token => no req.user
    next();
  },
}));

jest.mock('../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      message: 'Access denied: Insufficient role permissions',
    });
  },
  hasPermission: () => (req, res, next) => next(),
}));

// Mock mercuryService
const mockGetStatements = jest.fn();
const mockDownloadStatementPdf = jest.fn();
jest.mock('../../../services/mercuryService', () => ({
  getStatements: mockGetStatements,
  downloadStatementPdf: mockDownloadStatementPdf,
}));

// Mock zerodbService
const mockInsertRow = jest.fn();
const mockQueryRows = jest.fn();
jest.mock('../../../services/zerodbService', () => ({
  insertRow: mockInsertRow,
  queryRows: mockQueryRows,
}));

// Build Express app with routes
let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  const mercuryRoutes = require('../../../routes/v1/mercuryRoutes');
  app.use('/api/v1/integrations/mercury', mercuryRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/v1/integrations/mercury/import-statements', () => {
  const ENDPOINT = '/api/v1/integrations/mercury/import-statements';

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .send({ accountId: 'acc_1', startDate: '2026-01-01', endDate: '2026-03-31' });

    expect(res.status).toBe(401);
  });

  it('should return 400 when accountId is missing', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({ startDate: '2026-01-01', endDate: '2026-03-31' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/accountId/i);
  });

  it('should return 400 when startDate is missing', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({ accountId: 'acc_1', endDate: '2026-03-31' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/startDate/i);
  });

  it('should return 400 when endDate is missing', async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({ accountId: 'acc_1', startDate: '2026-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/endDate/i);
  });

  it('should import statements and return document IDs', async () => {
    // Mock Mercury API returning statements
    mockGetStatements.mockResolvedValue({
      statements: [
        { id: 'stmt_1', month: '2026-01', url: 'https://mercury.com/stmt1.pdf' },
        { id: 'stmt_2', month: '2026-02', url: 'https://mercury.com/stmt2.pdf' },
      ],
    });

    // Mock PDF download
    const fakePdfBuffer = Buffer.from('fake-pdf-content');
    mockDownloadStatementPdf.mockResolvedValue(fakePdfBuffer);

    // Mock company name lookup
    mockQueryRows.mockResolvedValue({
      data: [{
        row_id: 'comp_1',
        row_data: { name: 'Acme Corp' },
      }],
    });

    // Mock document creation
    mockInsertRow
      .mockResolvedValueOnce({ data: [{ row_id: 'doc_1' }] })
      .mockResolvedValueOnce({ data: [{ row_id: 'doc_2' }] });

    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({
        accountId: 'acc_1',
        startDate: '2026-01-01',
        endDate: '2026-02-28',
      });

    expect(res.status).toBe(200);
    expect(res.body.imported).toHaveLength(2);
    expect(res.body.imported[0]).toHaveProperty('documentId');
    expect(res.body.imported[0]).toHaveProperty('month', '2026-01');

    // Verify mercuryService.getStatements was called with correct params
    expect(mockGetStatements).toHaveBeenCalledWith(
      'user-1', 'acc_1', '2026-01-01', '2026-02-28'
    );

    // Verify PDF download was called for each statement
    expect(mockDownloadStatementPdf).toHaveBeenCalledTimes(2);

    // Verify document records were created in ZeroDB
    expect(mockInsertRow).toHaveBeenCalledTimes(2);
    const firstDocCall = mockInsertRow.mock.calls[0];
    expect(firstDocCall[0]).toBe('documents');
    expect(firstDocCall[1]).toMatchObject({
      category: 'financial',
      type: 'bank_statement',
      documentType: 'bank_statement',
      source: 'mercury',
      companyId: 'company-1',
    });
    // Verify naming convention: Mercury_Statement_YYYY-MM_CompanyName.pdf
    expect(firstDocCall[1].name).toMatch(/Mercury_Statement_2026-01_Acme Corp\.pdf/);
    // Verify base64 content
    expect(firstDocCall[1].fileContentBase64).toBe(fakePdfBuffer.toString('base64'));
  });

  it('should handle empty statements list from Mercury', async () => {
    mockGetStatements.mockResolvedValue({ statements: [] });

    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({
        accountId: 'acc_1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

    expect(res.status).toBe(200);
    expect(res.body.imported).toHaveLength(0);
  });

  it('should return 502 when Mercury API fails', async () => {
    mockGetStatements.mockRejectedValue(new Error('Mercury API error'));

    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({
        accountId: 'acc_1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/Mercury/i);
  });

  it('should filter statements by date range', async () => {
    // Mercury returns statements for Jan, Feb, March
    mockGetStatements.mockResolvedValue({
      statements: [
        { id: 'stmt_1', month: '2026-01', url: 'https://mercury.com/stmt1.pdf' },
        { id: 'stmt_2', month: '2026-02', url: 'https://mercury.com/stmt2.pdf' },
        { id: 'stmt_3', month: '2026-03', url: 'https://mercury.com/stmt3.pdf' },
      ],
    });

    const fakePdf = Buffer.from('pdf');
    mockDownloadStatementPdf.mockResolvedValue(fakePdf);
    mockQueryRows.mockResolvedValue({
      data: [{ row_id: 'c1', row_data: { name: 'TestCo' } }],
    });
    mockInsertRow.mockResolvedValue({ data: [{ row_id: 'doc_x' }] });

    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({
        accountId: 'acc_1',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });

    expect(res.status).toBe(200);
    // All 3 should be imported since they fall in range
    expect(res.body.imported).toHaveLength(3);
  });

  it('should use fallback company name when company lookup fails', async () => {
    mockGetStatements.mockResolvedValue({
      statements: [
        { id: 'stmt_1', month: '2026-04', url: 'https://mercury.com/stmt.pdf' },
      ],
    });
    mockDownloadStatementPdf.mockResolvedValue(Buffer.from('pdf'));
    mockQueryRows.mockResolvedValue({ data: [] }); // No company found
    mockInsertRow.mockResolvedValue({ data: [{ row_id: 'doc_1' }] });

    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({
        accountId: 'acc_1',
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      });

    expect(res.status).toBe(200);
    const docCall = mockInsertRow.mock.calls[0];
    // Should use fallback name
    expect(docCall[1].name).toMatch(/Mercury_Statement_2026-04_Company\.pdf/);
  });

  it('should continue importing remaining statements when one PDF download fails', async () => {
    mockGetStatements.mockResolvedValue({
      statements: [
        { id: 'stmt_1', month: '2026-01', url: 'https://mercury.com/stmt1.pdf' },
        { id: 'stmt_2', month: '2026-02', url: 'https://mercury.com/stmt2.pdf' },
      ],
    });

    // First download fails, second succeeds
    mockDownloadStatementPdf
      .mockRejectedValueOnce(new Error('Download failed'))
      .mockResolvedValueOnce(Buffer.from('pdf'));

    mockQueryRows.mockResolvedValue({
      data: [{ row_id: 'c1', row_data: { name: 'TestCo' } }],
    });
    mockInsertRow.mockResolvedValue({ data: [{ row_id: 'doc_1' }] });

    const res = await request(app)
      .post(ENDPOINT)
      .set('Authorization', 'Bearer founder-token')
      .send({
        accountId: 'acc_1',
        startDate: '2026-01-01',
        endDate: '2026-02-28',
      });

    expect(res.status).toBe(200);
    // Only the second statement should be imported
    expect(res.body.imported).toHaveLength(1);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0]).toMatchObject({
      month: '2026-01',
      error: expect.stringContaining('Download failed'),
    });
  });
});
