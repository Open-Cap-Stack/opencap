import api from '@/lib/api';

export const safeNoteService = {
  async getSafeNotes(params) {
    const { data } = await api.get('/safes', { params });
    // Backend returns { safes: [...] } or a plain array
    return Array.isArray(data) ? data : (data.safes ?? []);
  },
  async getSafeNote(id) {
    const { data } = await api.get(`/safes/${id}`);
    return data;
  },
  async createSafeNote(noteData) {
    const { data } = await api.post('/safes', noteData);
    return data;
  },
  async updateSafeNote(id, updates) {
    const { data } = await api.put(`/safes/${id}`, updates);
    return data;
  },
  async deleteSafeNote(id) {
    const { data } = await api.delete(`/safes/${id}`);
    return data;
  },
};
