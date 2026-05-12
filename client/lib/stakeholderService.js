import api from '@/lib/api';

export const stakeholderService = {
  async getStakeholders(companyId, params) {
    const { data } = await api.get('/stakeholders', { params: { companyId, ...params } });
    return data;
  },
  async getStakeholder(id) {
    const { data } = await api.get(`/stakeholders/${id}`);
    return data;
  },
  async createStakeholder(stakeholderData) {
    const { data } = await api.post('/stakeholders', stakeholderData);
    return data;
  },
  async updateStakeholder(id, updates) {
    const { data } = await api.put(`/stakeholders/${id}`, updates);
    return data;
  },
  async deleteStakeholder(id) {
    const { data } = await api.delete(`/stakeholders/${id}`);
    return data;
  },
};
