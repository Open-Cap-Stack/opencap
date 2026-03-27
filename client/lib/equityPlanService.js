import api from '@/lib/api';

export const equityPlanService = {
  async getEquityPlans(params) {
    const { data } = await api.get('/equity-plans', { params });
    return data;
  },
  async getEquityPlan(id) {
    const { data } = await api.get(`/equity-plans/${id}`);
    return data;
  },
  async createEquityPlan(planData) {
    const { data } = await api.post('/equity-plans', planData);
    return data;
  },
  async updateEquityPlan(id, updates) {
    const { data } = await api.put(`/equity-plans/${id}`, updates);
    return data;
  },
  async deleteEquityPlan(id) {
    const { data } = await api.delete(`/equity-plans/${id}`);
    return data;
  },
};
