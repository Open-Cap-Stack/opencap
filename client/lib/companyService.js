import api from '@/lib/api';

export const companyService = {
  async getCompanies(params) {
    const { data } = await api.get('/companies', { params });
    return data;
  },
  async getCompany(id) {
    const { data } = await api.get(`/companies/${id}`);
    return data;
  },
  async createCompany(companyData) {
    const { data } = await api.post('/companies', companyData);
    return data;
  },
  async updateCompany(id, updates) {
    const { data } = await api.put(`/companies/${id}`, updates);
    return data;
  },
  async deleteCompany(id) {
    const { data } = await api.delete(`/companies/${id}`);
    return data;
  },
};
