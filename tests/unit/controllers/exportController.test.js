/**
 * Export Controller — Unit Tests
 *
 * Tests CSV/XLSX export endpoints for cap table, stakeholders, and documents.
 */

const databaseAdapter = require('../../../services/databaseAdapter');

// Mock databaseAdapter before requiring the controller
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
}));

const {
  exportCapTable,
  exportStakeholders,
  exportDocuments,
} = require('../../../controllers/exportController');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
  return res;
}

function mockReq(overrides = {}) {
  return {
    user: { companyId: 'comp-1' },
    query: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// exportCapTable
// ---------------------------------------------------------------------------

describe('exportCapTable', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a CSV file with correct headers and content-disposition', async () => {
    databaseAdapter.find
      .mockResolvedValueOnce([
        { name: 'Alice', email: 'alice@example.com', role: 'founder', type: 'individual', shareClassId: 'sc-1', sharesHeld: 6000 },
        { name: 'Bob', email: 'bob@example.com', role: 'investor', type: 'entity', shareClassId: 'sc-2', sharesHeld: 4000 },
      ])
      .mockResolvedValueOnce([
        { _id: 'sc-1', name: 'Common' },
        { _id: 'sc-2', name: 'Series A' },
      ]);

    const req = mockReq({ query: { format: 'csv' } });
    const res = mockRes();

    await exportCapTable(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="cap-table.csv"');
    expect(res.status).toHaveBeenCalledWith(200);

    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('Stakeholder,Email,Role,Type,Share Class,Shares Held,Ownership %,Fully Diluted %');
    expect(csv).toContain('Alice');
    expect(csv).toContain('Common');
    expect(csv).toContain('60.00');
    expect(csv).toContain('40.00');
  });

  it('returns xlsx content-type when format=xlsx', async () => {
    databaseAdapter.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = mockReq({ query: { format: 'xlsx' } });
    const res = mockRes();

    await exportCapTable(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="cap-table.xlsx"');
  });

  it('defaults to csv when format is invalid', async () => {
    databaseAdapter.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = mockReq({ query: { format: 'pdf' } });
    const res = mockRes();

    await exportCapTable(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
  });

  it('handles zero stakeholders gracefully', async () => {
    databaseAdapter.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = mockReq();
    const res = mockRes();

    await exportCapTable(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const csv = res.send.mock.calls[0][0];
    // Should only have the header row
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(1);
  });

  it('returns 500 when databaseAdapter throws', async () => {
    databaseAdapter.find.mockRejectedValueOnce(new Error('DB down'));

    const req = mockReq();
    const res = mockRes();

    await exportCapTable(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to export cap table' })
    );
  });

  it('queries with companyId from authenticated user', async () => {
    databaseAdapter.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = mockReq({ user: { companyId: 'comp-42' } });
    const res = mockRes();

    await exportCapTable(req, res);

    expect(databaseAdapter.find).toHaveBeenCalledWith('Stakeholder', { companyId: 'comp-42' });
    expect(databaseAdapter.find).toHaveBeenCalledWith('ShareClass', { companyId: 'comp-42' });
  });

  it('escapes CSV special characters in values', async () => {
    databaseAdapter.find
      .mockResolvedValueOnce([
        { name: 'Alice, Inc.', email: 'a@b.com', role: 'founder', type: 'entity', sharesHeld: 100 },
      ])
      .mockResolvedValueOnce([]);

    const req = mockReq();
    const res = mockRes();

    await exportCapTable(req, res);

    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('"Alice, Inc."');
  });
});

// ---------------------------------------------------------------------------
// exportStakeholders
// ---------------------------------------------------------------------------

describe('exportStakeholders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns correct CSV columns for stakeholders', async () => {
    databaseAdapter.find.mockResolvedValueOnce([
      {
        name: 'Carol', email: 'carol@co.com', role: 'employee', type: 'individual',
        status: 'active', sharesHeld: 500, vestedShares: 300, unvestedShares: 200, equityValue: 50000,
      },
    ]);

    const req = mockReq();
    const res = mockRes();

    await exportStakeholders(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('Name,Email,Role,Type,Status,Shares Held,Ownership %,Vested,Unvested,Equity Value');
    expect(csv).toContain('Carol');
    expect(csv).toContain('300');
    expect(csv).toContain('200');
    expect(csv).toContain('50000');
  });

  it('returns 500 on database error', async () => {
    databaseAdapter.find.mockRejectedValueOnce(new Error('timeout'));

    const req = mockReq();
    const res = mockRes();

    await exportStakeholders(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to export stakeholders' })
    );
  });
});

// ---------------------------------------------------------------------------
// exportDocuments
// ---------------------------------------------------------------------------

describe('exportDocuments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns correct CSV columns for documents', async () => {
    databaseAdapter.find.mockResolvedValueOnce([
      { title: 'SAFE Agreement', type: 'legal', category: 'investment', createdAt: '2026-01-15', size: '2MB', status: 'signed' },
    ]);

    const req = mockReq();
    const res = mockRes();

    await exportDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const csv = res.send.mock.calls[0][0];
    expect(csv).toContain('Title,Type,Category,Uploaded Date,Size,Status');
    expect(csv).toContain('SAFE Agreement');
    expect(csv).toContain('signed');
  });

  it('handles empty document list', async () => {
    databaseAdapter.find.mockResolvedValueOnce([]);

    const req = mockReq();
    const res = mockRes();

    await exportDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const csv = res.send.mock.calls[0][0];
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('returns 500 on database error', async () => {
    databaseAdapter.find.mockRejectedValueOnce(new Error('connection lost'));

    const req = mockReq();
    const res = mockRes();

    await exportDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Failed to export documents' })
    );
  });
});
