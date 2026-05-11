import api from '@/lib/api';

export const vestingScheduleService = {
  async getVestingSchedules(params) {
    const { data } = await api.get('/vesting-schedules', { params });
    // Backend returns { vestingSchedules: [...] } or a plain array
    return Array.isArray(data) ? data : (data.vestingSchedules ?? []);
  },
  async getVestingSchedule(id) {
    const { data } = await api.get(`/vesting-schedules/${id}`);
    return data;
  },
  async createVestingSchedule(scheduleData) {
    const { data } = await api.post('/vesting-schedules', scheduleData);
    return data;
  },
  async updateVestingSchedule(id, updates) {
    const { data } = await api.put(`/vesting-schedules/${id}`, updates);
    return data;
  },
  async deleteVestingSchedule(id) {
    const { data } = await api.delete(`/vesting-schedules/${id}`);
    return data;
  },
};
