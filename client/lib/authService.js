import api from '@/lib/api';

// OAuth helpers — GitHub and LinkedIn use authorization code redirect flow
const OAUTH_STATE_KEY = 'oauth_state';
const OAUTH_PROVIDER_KEY = 'oauth_provider';
const PKCE_VERIFIER_KEY = 'pkce_code_verifier';

// PKCE helpers for AINative OAuth 2.1
async function generatePKCE() {
  const verifier = generateState() + generateState(); // 128 hex chars
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return { verifier, challenge };
}

// ── Cookie helpers ─────────────────────────────────────────────────────────────

const TOKEN_COOKIE = 'token';
// 7 days in seconds
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function setTokenCookie(token) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = [
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    'path=/',
    `max-age=${COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    secure,
  ].join('; ');
}

function clearTokenCookie() {
  if (typeof document === 'undefined') return;
  // Expire the cookie immediately by setting max-age=0
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export { setTokenCookie, clearTokenCookie };

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
      setTokenCookie(token);
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
      clearTokenCookie();
    }
  },

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const { data } = await api.post('/auth/token/refresh', { refreshToken });
    const token = data.token || data.accessToken;
    if (token) {
      localStorage.setItem('token', token);
      setTokenCookie(token);
    }
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

  // initiateAINativeLogin is intentionally a no-op redirect —
  // AINative OAuth 2.1 restricts redirect_uri to localhost only.
  // The login page handles AINative sign-in via ainativeCredentialLogin() instead.
  async initiateAINativeLogin() {
    // Signal the login page to show the AINative credentials modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-ainative-modal'));
    }
  },

  // Sign in with AINative email + password via server-side proxy
  async ainativeCredentialLogin(email, password) {
    const { data } = await api.post('/auth/ainative-login', { email, password });
    const token = data.accessToken || data.token;
    if (token) {
      localStorage.setItem('token', token);
      setTokenCookie(token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
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
      setTokenCookie(token);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  // Handle AINative OAuth 2.1 callback — exchanges auth code + PKCE verifier for tokens
  async handleAINativeCallback(code) {
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_PROVIDER_KEY);
    sessionStorage.removeItem(PKCE_VERIFIER_KEY);

    if (!verifier) throw new Error('Missing PKCE verifier — restart the login flow');

    // Exchange the AINative auth code for an AINative access token
    const ainativeApiBase = process.env.NEXT_PUBLIC_AINATIVE_API_URL || 'https://api.ainative.studio';
    const tokenRes = await fetch(`${ainativeApiBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri('ainative'),
        client_id: 'opencapstack',
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({}));
      throw new Error(err.error_description || err.detail || 'AINative token exchange failed');
    }
    const tokenData = await tokenRes.json();
    const ainativeToken = tokenData.access_token;

    // Exchange AINative token for OpenCap Stack session
    const { data } = await api.post('/auth/exchange-token', { ainativeToken });

    const resolvedToken = data.token || data.accessToken;
    if (resolvedToken) {
      localStorage.setItem('token', resolvedToken);
      setTokenCookie(resolvedToken);
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
