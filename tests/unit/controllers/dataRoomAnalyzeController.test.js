'use strict';

/**
 * Tests for Data Room Gap Analysis Controller
 * Issue #615: POST /api/v1/data-rooms/:id/analyze
 */

const { analyzeDataRoom } = require('../../../controllers/dataRoomAnalyzeController');

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../../models/DataRoom', () => ({
  findByDataRoomId: jest.fn(),
}));

jest.mock('../../../models/Document', () => ({
  findOne: jest.fn(),
}));

jest.mock('../../../services/ainativeAgentService', () => ({
  ainativeChatWithRetry: jest.fn(),
}));

const DataRoom = require('../../../models/DataRoom');
const Document = require('../../../models/Document');
const { ainativeChatWithRetry } = require('../../../services/ainativeAgentService');

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockReqRes(params = {}, user = {}) {
  const req = {
    params: { id: 'dr_test-123', ...params },
    user: { userId: 'user_1', role: 'admin', ...user },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

const SAMPLE_DATA_ROOM = {
  dataRoomId: 'dr_test-123',
  name: 'Series A Data Room',
  ownerCompany: 'company_1',
  status: 'active',
  documents: [
    { documentId: 'doc_1', addedAt: '2026-01-01T00:00:00.000Z' },
    { documentId: 'doc_2', addedAt: '2026-01-02T00:00:00.000Z' },
  ],
};

const SAMPLE_DOCS = [
  { documentId: 'doc_1', name: 'Certificate of Incorporation', category: 'formation', content: 'Cert of Inc for TestCo' },
  { documentId: 'doc_2', name: 'Cap Table 2025', category: 'equity', content: 'Cap table spreadsheet data' },
];

const SAMPLE_AI_RESULT = {
  present: [
    { category: 'formation', item: 'Certificate of Incorporation', confidence: 0.95 },
    { category: 'equity', item: 'Cap table', confidence: 0.88 },
  ],
  missing: [
    { category: 'formation', item: 'Bylaws', priority: 'high' },
    { category: 'formation', item: 'EIN/Tax ID', priority: 'medium' },
    { category: 'equity', item: 'Option grants', priority: 'high' },
    { category: 'equity', item: 'SAFE agreements', priority: 'medium' },
    { category: 'equity', item: '409A valuation', priority: 'critical' },
    { category: 'compliance', item: 'Board minutes', priority: 'high' },
    { category: 'compliance', item: 'Shareholder agreements', priority: 'high' },
    { category: 'compliance', item: 'IP assignments', priority: 'medium' },
    { category: 'financials', item: 'Bank statements', priority: 'medium' },
    { category: 'financials', item: 'P&L', priority: 'high' },
    { category: 'financials', item: 'Balance sheet', priority: 'high' },
  ],
  score: 72,
  summary: 'Data room has basic formation and equity docs but is missing key compliance and financial documents.',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/v1/data-rooms/:id/analyze', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it('returns correct response shape on successful analysis', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(SAMPLE_DATA_ROOM);
    Document.findOne
      .mockResolvedValueOnce(SAMPLE_DOCS[0])
      .mockResolvedValueOnce(SAMPLE_DOCS[1]);
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(SAMPLE_AI_RESULT),
      parsed: SAMPLE_AI_RESULT,
    });

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const body = res.json.mock.calls[0][0];
    expect(body).toHaveProperty('dataRoomId', 'dr_test-123');
    expect(body).toHaveProperty('analyzedAt');
    expect(body).toHaveProperty('documentsAnalyzed', 2);
    expect(body).toHaveProperty('present');
    expect(body).toHaveProperty('missing');
    expect(body).toHaveProperty('score', 72);
    expect(body).toHaveProperty('summary');
    expect(Array.isArray(body.present)).toBe(true);
    expect(Array.isArray(body.missing)).toBe(true);

    // Verify each present item has category, item, confidence
    body.present.forEach((p) => {
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('item');
      expect(p).toHaveProperty('confidence');
    });

    // Verify each missing item has category, item, priority
    body.missing.forEach((m) => {
      expect(m).toHaveProperty('category');
      expect(m).toHaveProperty('item');
      expect(m).toHaveProperty('priority');
    });
  });

  it('passes document info to the AI service', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(SAMPLE_DATA_ROOM);
    Document.findOne
      .mockResolvedValueOnce(SAMPLE_DOCS[0])
      .mockResolvedValueOnce(SAMPLE_DOCS[1]);
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(SAMPLE_AI_RESULT),
      parsed: SAMPLE_AI_RESULT,
    });

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
    const callArgs = ainativeChatWithRetry.mock.calls[0];
    // First arg: messages array
    expect(Array.isArray(callArgs[0])).toBe(true);
    // Messages should mention document names
    const userMsg = callArgs[0].find((m) => m.role === 'user');
    expect(userMsg.content).toContain('Certificate of Incorporation');
    expect(userMsg.content).toContain('Cap Table 2025');
  });

  // ── Data room not found ─────────────────────────────────────────────────

  it('returns 404 when data room is not found', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(null);

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not found') })
    );
  });

  // ── Empty data room ─────────────────────────────────────────────────────

  it('handles data room with no documents gracefully', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue({
      ...SAMPLE_DATA_ROOM,
      documents: [],
    });

    const emptyResult = {
      present: [],
      missing: SAMPLE_AI_RESULT.missing,
      score: 0,
      summary: 'No documents found in data room.',
    };
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(emptyResult),
      parsed: emptyResult,
    });

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.documentsAnalyzed).toBe(0);
  });

  // ── AI service error ────────────────────────────────────────────────────

  it('returns 502 when AI service fails', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(SAMPLE_DATA_ROOM);
    Document.findOne
      .mockResolvedValueOnce(SAMPLE_DOCS[0])
      .mockResolvedValueOnce(SAMPLE_DOCS[1]);
    ainativeChatWithRetry.mockRejectedValue(new Error('AI service unavailable'));

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('analysis') })
    );
  });

  // ── Archived data room ──────────────────────────────────────────────────

  it('returns 400 when data room is archived', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue({
      ...SAMPLE_DATA_ROOM,
      status: 'archived',
    });

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('not active') })
    );
  });

  // ── Deleted data room ───────────────────────────────────────────────────

  it('returns 400 when data room is deleted', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue({
      ...SAMPLE_DATA_ROOM,
      status: 'deleted',
    });

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ── Document lookup failure (partial) ───────────────────────────────────

  it('skips documents that fail to load and analyzes the rest', async () => {
    DataRoom.findByDataRoomId.mockResolvedValue(SAMPLE_DATA_ROOM);
    Document.findOne
      .mockResolvedValueOnce(SAMPLE_DOCS[0])
      .mockResolvedValueOnce(null); // doc_2 not found

    const partialResult = {
      present: [{ category: 'formation', item: 'Certificate of Incorporation', confidence: 0.95 }],
      missing: SAMPLE_AI_RESULT.missing,
      score: 50,
      summary: 'Partial analysis with 1 document.',
    };
    ainativeChatWithRetry.mockResolvedValue({
      content: JSON.stringify(partialResult),
      parsed: partialResult,
    });

    const { req, res } = mockReqRes();
    await analyzeDataRoom(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    // Only 1 doc was loadable
    expect(body.documentsAnalyzed).toBe(1);
  });
});
