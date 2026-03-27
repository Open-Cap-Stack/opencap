import api from '@/lib/api';

export const financialReportService = {
  async getReports(params) {
    const { data } = await api.get('/financial-reports', { params });
    return data;
  },
  async getReport(id) {
    const { data } = await api.get(`/financial-reports/${id}`);
    return data;
  },
  async createReport(reportData) {
    const { data } = await api.post('/financial-reports', reportData);
    return data;
  },
  async updateReport(id, updates) {
    const { data } = await api.put(`/financial-reports/${id}`, updates);
    return data;
  },
  async deleteReport(id) {
    const { data } = await api.delete(`/financial-reports/${id}`);
    return data;
  },
};
