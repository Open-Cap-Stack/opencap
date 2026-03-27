import api from '@/lib/api';

export const activityService = {
  async getActivities(params) {
    const { data } = await api.get('/activities', { params });
    return data;
  },
  async getActivity(id) {
    const { data } = await api.get(`/activities/${id}`);
    return data;
  },
};
