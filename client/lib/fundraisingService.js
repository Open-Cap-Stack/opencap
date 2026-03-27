import api from '@/lib/api';

export const fundraisingService = {
  async getRounds(params) {
    const { data } = await api.get('/fundraising-rounds', { params });
    return data;
  },
  async getRound(id) {
    const { data } = await api.get(`/fundraising-rounds/${id}`);
    return data;
  },
  async createRound(roundData) {
    const { data } = await api.post('/fundraising-rounds', roundData);
    return data;
  },
  async updateRound(id, updates) {
    const { data } = await api.put(`/fundraising-rounds/${id}`, updates);
    return data;
  },
  async deleteRound(id) {
    const { data } = await api.delete(`/fundraising-rounds/${id}`);
    return data;
  },
};
