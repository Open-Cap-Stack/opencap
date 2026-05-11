import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Refresh handler ────────────────────────────────────────────────────────────
// AuthProvider registers a callback here during mount so the axios response
// interceptor can trigger a token refresh without importing React context.
let _refreshHandler = null;

export function setRefreshHandler(fn) {
  _refreshHandler = fn;
}

// ── Request interceptor — attach token ────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — handle 401 with refresh-and-retry ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (typeof window !== 'undefined') {
      const status = error.response?.status;

      // 401: attempt token refresh once, then retry.
      // _retry flag prevents an infinite loop if the retry itself returns 401.
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        if (_refreshHandler) {
          try {
            // The handler returns the new access token on success, or throws
            // (and handles logout internally) on failure.
            const newToken = await _refreshHandler();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return api(originalRequest);
            }
          } catch {
            // Refresh failed — handler already called logout; just reject.
            return Promise.reject(error);
          }
        } else {
          // No handler registered yet — fall through to hard redirect.
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }

      // 403 with inactive-account message — clear session and redirect.
      if (
        status === 403 &&
        error.response?.data?.message === 'Account is not active'
      ) {
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
