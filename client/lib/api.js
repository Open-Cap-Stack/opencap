import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (error.response?.status === 403 && error.response?.data?.message === 'Account is not active') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?error=verify-email';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
