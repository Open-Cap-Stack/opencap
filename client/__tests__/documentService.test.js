jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = require('@/lib/api').default;
const { documentService } = require('@/lib/documentService');

describe('documentService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getDocuments calls GET /documents', async () => {
    api.get.mockResolvedValue({ data: [] });
    await documentService.getDocuments();
    expect(api.get).toHaveBeenCalledWith('/documents', { params: undefined });
  });

  it('deleteDocument calls DELETE /documents/:id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await documentService.deleteDocument('1');
    expect(api.delete).toHaveBeenCalledWith('/documents/1');
  });
});
