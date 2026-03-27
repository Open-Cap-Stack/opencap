import api from '@/lib/api';

export const documentService = {
  async getDocuments(params) {
    const { data } = await api.get('/documents', { params });
    return data;
  },
  async getDocument(id) {
    const { data } = await api.get(`/documents/${id}`);
    return data;
  },
  async createDocument(docData) {
    const { data } = await api.post('/documents', docData);
    return data;
  },
  async uploadDocument(formData) {
    const { data } = await api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  async updateDocument(id, updates) {
    const { data } = await api.put(`/documents/${id}`, updates);
    return data;
  },
  async deleteDocument(id) {
    const { data } = await api.delete(`/documents/${id}`);
    return data;
  },
};
