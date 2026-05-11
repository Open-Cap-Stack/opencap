import api from '@/lib/api';

export const spvService = {
  async getSpvs(params) {
    const { data } = await api.get('/spv', { params });
    // Backend returns { spvs: [...] } or a plain array
    return Array.isArray(data) ? data : (data.spvs ?? []);
  },
  async getSpv(id) {
    const { data } = await api.get(`/spv/${id}`);
    return data;
  },
  async createSpv(spvData) {
    const { data } = await api.post('/spv', spvData);
    return data;
  },
  async updateSpv(id, updates) {
    const { data } = await api.put(`/spv/${id}`, updates);
    return data;
  },
  async deleteSpv(id) {
    const { data } = await api.delete(`/spv/${id}`);
    return data;
  },
  async getSpvAssets(spvId) {
    const { data } = await api.get('/spv-assets', { params: { spvId } });
    return Array.isArray(data) ? data : (data.assets ?? []);
  },
};
