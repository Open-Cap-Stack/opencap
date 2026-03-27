import api from '@/lib/api';

export const shareClassService = {
  async getShareClasses(params) {
    const { data } = await api.get('/share-classes', { params });
    return data;
  },
  async getShareClass(id) {
    const { data } = await api.get(`/share-classes/${id}`);
    return data;
  },
  async createShareClass(classData) {
    const { data } = await api.post('/share-classes', classData);
    return data;
  },
  async updateShareClass(id, updates) {
    const { data } = await api.put(`/share-classes/${id}`, updates);
    return data;
  },
  async deleteShareClass(id) {
    const { data } = await api.delete(`/share-classes/${id}`);
    return data;
  },
};
