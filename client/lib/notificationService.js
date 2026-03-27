import api from '@/lib/api';

export const notificationService = {
  async getNotifications(params) {
    const { data } = await api.get('/notifications', { params });
    return data;
  },
  async markRead(notificationIds) {
    const { data } = await api.put('/notifications/read', { ids: notificationIds });
    return data;
  },
  async markAllRead() {
    const { data } = await api.put('/notifications/read-all');
    return data;
  },
};
