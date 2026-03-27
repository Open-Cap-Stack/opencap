jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = require('@/lib/api').default;
const { fundraisingService } = require('@/lib/fundraisingService');

describe('fundraisingService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getRounds calls GET /fundraising-rounds', async () => {
    api.get.mockResolvedValue({ data: [] });
    await fundraisingService.getRounds();
    expect(api.get).toHaveBeenCalledWith('/fundraising-rounds', { params: undefined });
  });

  it('createRound calls POST /fundraising-rounds', async () => {
    api.post.mockResolvedValue({ data: { id: '1' } });
    await fundraisingService.createRound({ name: 'Seed' });
    expect(api.post).toHaveBeenCalledWith('/fundraising-rounds', { name: 'Seed' });
  });

  it('deleteRound calls DELETE /fundraising-rounds/:id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await fundraisingService.deleteRound('1');
    expect(api.delete).toHaveBeenCalledWith('/fundraising-rounds/1');
  });
});
