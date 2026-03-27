jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = require('@/lib/api').default;
const { valuationService } = require('@/lib/valuationService');

describe('valuationService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getValuations calls GET /valuations', async () => {
    api.get.mockResolvedValue({ data: [] });
    await valuationService.getValuations();
    expect(api.get).toHaveBeenCalledWith('/valuations', { params: undefined });
  });

  it('createValuation calls POST /valuations', async () => {
    api.post.mockResolvedValue({ data: { id: '1' } });
    await valuationService.createValuation({ name: '409A' });
    expect(api.post).toHaveBeenCalledWith('/valuations', { name: '409A' });
  });

  it('getCompanyValuations calls correct endpoint', async () => {
    api.get.mockResolvedValue({ data: [] });
    await valuationService.getCompanyValuations('c1');
    expect(api.get).toHaveBeenCalledWith('/valuations/company/c1');
  });
});
