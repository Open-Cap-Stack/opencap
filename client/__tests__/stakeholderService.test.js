jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = require('@/lib/api').default;
const { stakeholderService } = require('@/lib/stakeholderService');

describe('stakeholderService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getStakeholders calls GET /stakeholders', async () => {
    api.get.mockResolvedValue({ data: [{ id: '1', name: 'Alice' }] });
    const result = await stakeholderService.getStakeholders();
    expect(api.get).toHaveBeenCalledWith('/stakeholders', { params: undefined });
    expect(result).toHaveLength(1);
  });

  it('createStakeholder calls POST /stakeholders', async () => {
    api.post.mockResolvedValue({ data: { id: '2', name: 'Bob' } });
    const result = await stakeholderService.createStakeholder({ name: 'Bob' });
    expect(api.post).toHaveBeenCalledWith('/stakeholders', { name: 'Bob' });
    expect(result.name).toBe('Bob');
  });

  it('updateStakeholder calls PUT /stakeholders/:id', async () => {
    api.put.mockResolvedValue({ data: { id: '1', name: 'Updated' } });
    await stakeholderService.updateStakeholder('1', { name: 'Updated' });
    expect(api.put).toHaveBeenCalledWith('/stakeholders/1', { name: 'Updated' });
  });

  it('deleteStakeholder calls DELETE /stakeholders/:id', async () => {
    api.delete.mockResolvedValue({ data: { message: 'deleted' } });
    await stakeholderService.deleteStakeholder('1');
    expect(api.delete).toHaveBeenCalledWith('/stakeholders/1');
  });
});
