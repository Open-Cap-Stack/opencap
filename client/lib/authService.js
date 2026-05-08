import api from '@/lib/api';

// OAuth helpers — GitHub and LinkedIn use authorization code redirect flow
const OAUTH_STATE_KEY = 'oauth_state';
const OAUTH_PROVIDER_KEY = 'oauth_provider';

function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function getRedirectUri(provider) {
  return `${window.location.origin}/auth/${provider}/callback`;
}

export const authService = {
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    const token = data.token || data.accessToken;
    if (token) {
      localStorage.setItem('token', token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(userData) {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const { data } = await api.post('/auth/token/refresh', { refreshToken });
    const token = data.token || data.accessToken;
    if (token) localStorage.setItem('token', token);
    return data;
  },

  async getProfile() {
    const { data } = await api.get('/auth/profile');
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },

  async updateProfile(updates) {
    const { data } = await api.put('/auth/profile', updates);
    return data;
  },

  getToken() {
    return localStorage.getItem('token');
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // ── OAuth helpers ──────────────────────────────────────────────────────────

  initiateGitHubLogin() {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) throw new Error('GitHub OAuth not configured');
    const state = generateState();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_PROVIDER_KEY, 'github');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri('github'),
      scope: 'read:user user:email',
      state,
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  },

  initiateLinkedInLogin() {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    if (!clientId) throw new Error('LinkedIn OAuth not configured');
    const state = generateState();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_PROVIDER_KEY, 'linkedin');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri('linkedin'),
      scope: 'openid profile email',
      state,
      response_type: 'code',
    });
    window.location.href = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  },

  initiateGoogleLogin() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('Google OAuth not configured');
    const state = generateState();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_PROVIDER_KEY, 'google');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri('google'),
      scope: 'openid profile email',
      state,
      response_type: 'code',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  initiateAINativeLogin() {
    const state = generateState();
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_PROVIDER_KEY, 'ainative');
    const redirectUri = getRedirectUri('ainative');
    const ainativeBase = process.env.NEXT_PUBLIC_AINATIVE_URL || 'https://ainative.studio';
    const params = new URLSearchParams({ redirect_uri: redirectUri, state });
    window.location.href = `${ainativeBase}/login?${params}`;
  },

  // Handle callback for GitHub/LinkedIn/Google (authorization code flow)
  async handleOAuthCallback(provider, code, state) {
    const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    const storedProvider = sessionStorage.getItem(OAUTH_PROVIDER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_PROVIDER_KEY);

    if (storedProvider !== provider) {
      throw new Error('OAuth provider mismatch');
    }
    if (storedState && storedState !== state) {
      throw new Error('Invalid OAuth state — possible CSRF attack');
    }

    const { data } = await api.post('/auth/oauth-login', {
      code,
      provider,
      redirect_uri: getRedirectUri(provider),
    });

    const token = data.token || data.accessToken;
    if (token) {
      localStorage.setItem('token', token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  // Handle AINative SSO callback — exchanges AINative JWT for OCS JWT
  async handleAINativeCallback(token) {
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_PROVIDER_KEY);

    const { data } = await api.post('/auth/exchange-token', { token });

    const resolvedToken = data.token || data.accessToken;
    if (resolvedToken) {
      localStorage.setItem('token', resolvedToken);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  isOAuthAvailable(provider) {
    switch (provider) {
      case 'github': return !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
      case 'linkedin': return !!process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
      case 'google': return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      case 'ainative': return true;
      default: return false;
    }
  },
};
