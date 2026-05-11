import api from '@/lib/api';

export const safeNoteService = {
  async getSafeNotes(params) {
    const { data } = await api.get('/safe', { params });
    // Backend returns { safes: [...] } or a plain array
    return Array.isArray(data) ? data : (data.safes ?? []);
  },
  async getSafeNote(id) {
    const { data } = await api.get(`/safe/${id}`);
    return data;
  },
  async createSafeNote(noteData) {
    const { data } = await api.post('/safe', noteData);
    return data;
  },
  async updateSafeNote(id, updates) {
    const { data } = await api.put(`/safe/${id}`, updates);
    return data;
  },
  async deleteSafeNote(id) {
    const { data } = await api.delete(`/safe/${id}`);
    return data;
  },
};
