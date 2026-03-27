jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const api = require('@/lib/api').default;
const { equityPlanService } = require('@/lib/equityPlanService');

describe('equityPlanService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getEquityPlans calls GET /equity-plans', async () => {
    api.get.mockResolvedValue({ data: [] });
    await equityPlanService.getEquityPlans();
    expect(api.get).toHaveBeenCalledWith('/equity-plans', { params: undefined });
  });

  it('createEquityPlan calls POST /equity-plans', async () => {
    api.post.mockResolvedValue({ data: { id: '1' } });
    await equityPlanService.createEquityPlan({ name: 'Plan' });
    expect(api.post).toHaveBeenCalledWith('/equity-plans', { name: 'Plan' });
  });

  it('deleteEquityPlan calls DELETE /equity-plans/:id', async () => {
    api.delete.mockResolvedValue({ data: {} });
    await equityPlanService.deleteEquityPlan('1');
    expect(api.delete).toHaveBeenCalledWith('/equity-plans/1');
  });
});
