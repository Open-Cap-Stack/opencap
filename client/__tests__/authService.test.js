jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
  },
}));

const api = require('@/lib/api').default;
const { authService } = require('@/lib/authService');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('login stores token and returns data', async () => {
    api.post.mockResolvedValue({ data: { token: 'jwt123', user: { id: 1, email: 'test@test.com' } } });
    const result = await authService.login('test@test.com', 'pass');
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'test@test.com', password: 'pass' });
    expect(localStorage.getItem('token')).toBe('jwt123');
    expect(result.user.email).toBe('test@test.com');
  });

  it('register calls correct endpoint', async () => {
    api.post.mockResolvedValue({ data: { message: 'registered' } });
    await authService.register({ email: 'a@b.com', password: '123' });
    expect(api.post).toHaveBeenCalledWith('/auth/register', { email: 'a@b.com', password: '123' });
  });

  it('logout clears localStorage', async () => {
    localStorage.setItem('token', 'xyz');
    api.post.mockResolvedValue({ data: {} });
    await authService.logout();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('getMe calls /auth/me', async () => {
    api.get.mockResolvedValue({ data: { id: 1 } });
    const result = await authService.getMe();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(result.id).toBe(1);
  });

  it('isAuthenticated returns true when token exists', () => {
    localStorage.setItem('token', 'abc');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when no token', () => {
    expect(authService.isAuthenticated()).toBe(false);
  });

  // Issue #512: token fallback — server may return accessToken instead of token

  it('login prefers data.token over data.accessToken when both are present', async () => {
    api.post.mockResolvedValue({ data: { token: 'primary-jwt', accessToken: 'fallback-jwt', user: { id: 10 } } });
    await authService.login('a@b.com', 'pass');
    // token field takes precedence because `data.token || data.accessToken` short-circuits on truthy token
    expect(localStorage.getItem('token')).toBe('primary-jwt');
  });

  it('logout clears token, refreshToken, and user from localStorage', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('refreshToken', 'ref-tok');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));
    api.post.mockResolvedValue({ data: {} });
    await authService.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('isAuthenticated returns false when no token is stored', () => {
    // localStorage is cleared in beforeEach — this verifies the falsy path explicitly
    expect(localStorage.getItem('token')).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('login stores accessToken when token field is absent', async () => {
    api.post.mockResolvedValue({ data: { accessToken: 'access-jwt', user: { id: 2 } } });
    await authService.login('a@b.com', 'pass');
    expect(localStorage.getItem('token')).toBe('access-jwt');
  });

  it('login stores nothing when both token and accessToken are absent', async () => {
    api.post.mockResolvedValue({ data: { user: { id: 3 } } });
    await authService.login('a@b.com', 'pass');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('refreshToken stores token fallback from accessToken', async () => {
    localStorage.setItem('refreshToken', 'refresh-tok');
    api.post.mockResolvedValue({ data: { accessToken: 'new-access-jwt' } });
    await authService.refreshToken();
    expect(localStorage.getItem('token')).toBe('new-access-jwt');
  });

  it('refreshToken stores token when token field is present', async () => {
    localStorage.setItem('refreshToken', 'refresh-tok');
    api.post.mockResolvedValue({ data: { token: 'new-jwt' } });
    await authService.refreshToken();
    expect(localStorage.getItem('token')).toBe('new-jwt');
  });

  it('handleOAuthCallback stores token fallback from accessToken', async () => {
    sessionStorage.setItem('oauth_state', 'state123');
    sessionStorage.setItem('oauth_provider', 'github');
    api.post.mockResolvedValue({ data: { accessToken: 'oauth-access-jwt', user: { id: 4 } } });
    await authService.handleOAuthCallback('github', 'code123', 'state123');
    expect(localStorage.getItem('token')).toBe('oauth-access-jwt');
  });

  it('handleAINativeCallback stores token fallback from accessToken', async () => {
    api.post.mockResolvedValue({ data: { accessToken: 'ainative-access-jwt', user: { id: 5 } } });
    await authService.handleAINativeCallback('ainative-tok');
    expect(localStorage.getItem('token')).toBe('ainative-access-jwt');
  });
});
