/**
 * Tests for SPV Document Management
 * Issue #269: SPV Document & Timeline Backend Endpoints
 *
 * Covers all 4 document endpoints:
 *   GET    /api/v1/spv/:id/documents
 *   POST   /api/v1/spv/:id/documents
 *   DELETE /api/v1/spv/:id/documents/:docId
 *   POST   /api/v1/spv/:id/documents/:docId/remind
 */

// Mock the SPV model (for ownership checks)
jest.mock('../models/SPV', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  VALID_STATUSES: ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview']
}));

// Mock the SPVDocument model
jest.mock('../models/SPVDocument', () => {
  const VALID_CATEGORIES = ['Deal documents', 'Data room', 'LP documents', 'Compliance'];
  const VALID_STATUSES = ['draft', 'pending', 'signed', 'executed'];
  return {
    VALID_CATEGORIES,
    VALID_STATUSES,
    validators: {
      isValidCategory: (cat) => VALID_CATEGORIES.includes(cat),
      isValidStatus: (s) => VALID_STATUSES.includes(s)
    },
    findBySPV: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    deleteOne: jest.fn()
  };
});

// Mock the SPVTimeline model (used for audit logging in document controller)
jest.mock('../models/SPVTimeline', () => ({
  create: jest.fn()
}));

const SPV = require('../models/SPV');
const SPVDocument = require('../models/SPVDocument');
const SPVTimeline = require('../models/SPVTimeline');
const controller = require('../controllers/SPVDocument');

// Helper to build mock req/res
function mockReqRes(overrides = {}) {
  const req = {
    params: {},
    body: {},
    query: {},
    user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'admin', name: 'Test User' },
    file: null,
    ...overrides
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return { req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: SPV exists and belongs to the user's company
  SPV.findOne.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'comp_1' });
  SPVTimeline.create.mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// GET /api/v1/spv/:id/documents
// ---------------------------------------------------------------------------
describe('listDocuments', () => {
  it('returns documents for a given SPV', async () => {
    const documents = [
      { _id: 'doc_1', spvId: 'spv_1', name: 'Operating Agreement', category: 'Deal documents', status: 'draft' },
      { _id: 'doc_2', spvId: 'spv_1', name: 'Subscription Docs', category: 'LP documents', status: 'pending' }
    ];
    SPVDocument.findBySPV.mockResolvedValue(documents);

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listDocuments(req, res);

    expect(SPVDocument.findBySPV).toHaveBeenCalledWith('spv_1', { companyId: 'comp_1' });
    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.documents).toHaveLength(2);
  });

  it('returns empty array when no documents exist', async () => {
    SPVDocument.findBySPV.mockResolvedValue([]);

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].documents).toHaveLength(0);
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({ params: { id: '  ' } });
    await controller.listDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when SPV does not exist', async () => {
    SPV.findOne.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: 'spv_nonexistent' } });
    await controller.listDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when SPV belongs to another company', async () => {
    SPV.findOne.mockResolvedValue({ SPVID: 'spv_1', ParentCompanyID: 'other_comp' });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      user: { _id: 'user_1', userId: 'user_1', companyId: 'comp_1', role: 'founder' }
    });
    await controller.listDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 500 on unexpected error', async () => {
    SPVDocument.findBySPV.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({ params: { id: 'spv_1' } });
    await controller.listDocuments(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/spv/:id/documents
// ---------------------------------------------------------------------------
describe('uploadDocument', () => {
  it('creates a document record with file metadata', async () => {
    SPVDocument.create.mockImplementation(async (data) => ({
      _id: 'doc_new',
      ...data
    }));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { name: 'Term Sheet', category: 'Deal documents' },
      file: { originalname: 'term-sheet.pdf', path: '/uploads/spv-docs/123.pdf' }
    });
    await controller.uploadDocument(req, res);

    expect(SPVDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spvId: 'spv_1',
        companyId: 'comp_1',
        name: 'Term Sheet',
        category: 'Deal documents',
        fileName: 'term-sheet.pdf',
        status: 'draft',
        uploaderId: 'user_1'
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    // Should also log a timeline event
    expect(SPVTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        spvId: 'spv_1',
        type: 'document',
        description: expect.stringContaining('Term Sheet')
      })
    );
  });

  it('creates a document record without file', async () => {
    SPVDocument.create.mockImplementation(async (data) => ({
      _id: 'doc_new',
      ...data
    }));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { name: 'Draft Agreement', category: 'LP documents' }
    });
    await controller.uploadDocument(req, res);

    expect(SPVDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Draft Agreement',
        category: 'LP documents',
        fileName: '',
        fileUrl: ''
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('defaults category to Deal documents', async () => {
    SPVDocument.create.mockImplementation(async (data) => ({ _id: 'doc_new', ...data }));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { name: 'Some Doc' }
    });
    await controller.uploadDocument(req, res);

    expect(SPVDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Deal documents' })
    );
  });

  it('returns 400 when document name is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: {}
    });
    await controller.uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Document name is required' })
    );
  });

  it('returns 400 for invalid category', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { name: 'Doc', category: 'Invalid Category' }
    });
    await controller.uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid category') })
    );
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: '  ' },
      body: { name: 'Doc' }
    });
    await controller.uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when SPV does not exist', async () => {
    SPV.findOne.mockResolvedValue(null);
    SPV.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_nonexistent' },
      body: { name: 'Doc' }
    });
    await controller.uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 on unexpected error', async () => {
    SPVDocument.create.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1' },
      body: { name: 'Doc' }
    });
    await controller.uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/spv/:id/documents/:docId
// ---------------------------------------------------------------------------
describe('deleteDocument', () => {
  it('removes a document from the SPV', async () => {
    SPVDocument.findOne.mockResolvedValue({ _id: 'doc_1', spvId: 'spv_1', name: 'Old Doc' });
    SPVDocument.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_1' }
    });
    await controller.deleteDocument(req, res);

    expect(SPVDocument.deleteOne).toHaveBeenCalledWith({ _id: 'doc_1', spvId: 'spv_1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Document deleted successfully' });
    // Should also log a timeline event
    expect(SPVTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'document',
        description: expect.stringContaining('Old Doc')
      })
    );
  });

  it('returns 404 when document not found', async () => {
    SPVDocument.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_999' }
    });
    await controller.deleteDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when docId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: '  ' }
    });
    await controller.deleteDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: '  ', docId: 'doc_1' }
    });
    await controller.deleteDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected error', async () => {
    SPVDocument.findOne.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_1' }
    });
    await controller.deleteDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/spv/:id/documents/:docId/remind
// ---------------------------------------------------------------------------
describe('sendReminder', () => {
  it('sends a signature reminder and logs timeline event', async () => {
    SPVDocument.findOne.mockResolvedValue({
      _id: 'doc_1',
      spvId: 'spv_1',
      name: 'Subscription Agreement',
      signatories: [
        { id: 'sig_1', name: 'Alice', status: 'pending' },
        { id: 'sig_2', name: 'Bob', status: 'signed' }
      ]
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_1' },
      body: { signatoryId: 'sig_1' }
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const response = res.json.mock.calls[0][0];
    expect(response.message).toBe('Reminder sent successfully');
    expect(response.signatoryId).toBe('sig_1');
    expect(response.signatoryName).toBe('Alice');
    // Should log timeline event
    expect(SPVTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'document',
        description: expect.stringContaining('Subscription Agreement')
      })
    );
  });

  it('returns 400 when signatoryId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_1' },
      body: {}
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'signatoryId is required' })
    );
  });

  it('returns 404 when document not found', async () => {
    SPVDocument.findOne.mockResolvedValue(null);

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_999' },
      body: { signatoryId: 'sig_1' }
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Document not found' })
    );
  });

  it('returns 404 when signatory not found on document', async () => {
    SPVDocument.findOne.mockResolvedValue({
      _id: 'doc_1',
      spvId: 'spv_1',
      name: 'Doc',
      signatories: [{ id: 'sig_other', name: 'Other', status: 'pending' }]
    });

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_1' },
      body: { signatoryId: 'sig_1' }
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Signatory not found on this document' })
    );
  });

  it('returns 400 when docId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: '  ' },
      body: { signatoryId: 'sig_1' }
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when spvId is missing', async () => {
    const { req, res } = mockReqRes({
      params: { id: '  ', docId: 'doc_1' },
      body: { signatoryId: 'sig_1' }
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 500 on unexpected error', async () => {
    SPVDocument.findOne.mockRejectedValue(new Error('db down'));

    const { req, res } = mockReqRes({
      params: { id: 'spv_1', docId: 'doc_1' },
      body: { signatoryId: 'sig_1' }
    });
    await controller.sendReminder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
