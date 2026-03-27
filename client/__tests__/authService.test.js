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
});
