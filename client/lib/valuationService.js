import api from '@/lib/api';

export const valuationService = {
  async getValuations(params) {
    const { data } = await api.get('/valuations', { params });
    return data;
  },
  async getValuation(id) {
    const { data } = await api.get(`/valuations/${id}`);
    return data;
  },
  async createValuation(valData) {
    const { data } = await api.post('/valuations', valData);
    return data;
  },
  async updateValuation(id, updates) {
    const { data } = await api.put(`/valuations/${id}`, updates);
    return data;
  },
  async deleteValuation(id) {
    const { data } = await api.delete(`/valuations/${id}`);
    return data;
  },
  async getCompanyValuations(companyId) {
    const { data } = await api.get(`/valuations/company/${companyId}`);
    return data;
  },
};
