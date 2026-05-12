'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { authService, setTokenCookie, clearTokenCookie } from '@/lib/authService';
import { setRefreshHandler } from '@/lib/api';

// ── JWT helpers ────────────────────────────────────────────────────────────────

/**
 * Decode the payload of a JWT without any library.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token) {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    // Base64url → Base64 → binary string → JSON
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Returns true when the JWT is present and its `exp` claim is in the past.
 * Tokens without an `exp` claim are treated as non-expired.
 */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  // exp is in seconds; Date.now() is in milliseconds.
  return Date.now() >= payload.exp * 1000;
}

// ── Profile helpers ────────────────────────────────────────────────────────────

const PROFILE_KEY = 'ocs_profile';

const DEFAULT_PROFILE = {
  companyId: null,
  role: null,
  plan: null,
  profileCompleted: false,
  onboardingCompleted: false,
};

function loadProfileFromStorage() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfileToStorage(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors (e.g. private browsing quota)
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  // Mutex: when a refresh is already in flight, every other caller awaits the
  // same promise instead of firing its own request.
  const refreshPromiseRef = useRef(null);

  // ── Core refresh logic ─────────────────────────────────────────────────────

  /**
   * Performs a token refresh.  If a refresh is already in flight (from another
   * concurrent request), the caller awaits that same promise.
   *
   * Resolves with the new access token string on success.
   * Rejects (and calls logout) when the refresh token is absent or the server
   * rejects the request.
   */
  const doRefresh = useCallback(async () => {
    // Return the existing in-flight promise to all concurrent callers.
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      // Nothing to refresh with — hard logout.
      await performLogout();
      throw new Error('No refresh token available');
    }

    const promise = authService
      .refreshToken()
      .then((data) => {
        const newToken = data.token || data.accessToken;
        if (!newToken) throw new Error('Refresh returned no token');
        return newToken;
      })
      .catch(async (err) => {
        await performLogout();
        throw err;
      })
      .finally(() => {
        // Clear the mutex so the next genuine expiry triggers a fresh refresh.
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = promise;
    return promise;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: performLogout is defined below but stable; the empty dep array is
  // intentional — doRefresh is never reassigned.

  // ── Logout (extracted so doRefresh can call it) ────────────────────────────

  const performLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails, clear local state.
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      clearTokenCookie();
    }
    localStorage.removeItem(PROFILE_KEY);
    setUser(null);
    setProfile({ ...DEFAULT_PROFILE });
  }, []);

  // ── Register the refresh handler with the axios instance ───────────────────

  useEffect(() => {
    setRefreshHandler(doRefresh);
    // Unregister on unmount so a torn-down provider doesn't intercept requests.
    return () => setRefreshHandler(null);
  }, [doRefresh]);

  // ── Startup: restore session ───────────────────────────────────────────────

  useEffect(() => {
    async function restoreSession() {
      const token = authService.getToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      // Ensure the Edge Middleware cookie is in sync with localStorage.
      // If the user had a token from a previous session but the cookie was
      // cleared (e.g. browser cookie expiry), re-set it so the middleware
      // does not redirect them back to /login on every request.
      const cookiePresent =
        typeof document !== 'undefined' &&
        document.cookie.split(';').some((c) => c.trim().startsWith('token='));
      if (!cookiePresent) {
        setTokenCookie(token);
      }

      // If the token is expired, try to silently refresh before fetching /me.
      if (isTokenExpired(token)) {
        try {
          await doRefresh();
        } catch {
          // Refresh failed — doRefresh already called performLogout.
          setIsLoading(false);
          return;
        }
      }

      try {
        const userData = await authService.getMe();
        setUser(userData);
        // Restore profile from localStorage; it was persisted on the last login.
        setProfile(loadProfileFromStorage());
      } catch {
        // /me failed even after a fresh token — clear everything.
        await performLogout();
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public actions ─────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password);
    const userData = data.user || data;
    setUser(userData);

    // Seed profile from the login response when available.
    const serverProfile = {
      companyId: userData.companyId ?? null,
      role: userData.role ?? null,
      plan: userData.plan ?? null,
      profileCompleted: userData.profileCompleted ?? false,
      onboardingCompleted: userData.onboardingCompleted ?? false,
    };
    const merged = { ...DEFAULT_PROFILE, ...serverProfile };
    setProfile(merged);
    saveProfileToStorage(merged);

    return data;
  }, []);

  const register = useCallback(async (userData) => {
    const data = await authService.register(userData);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await performLogout();
  }, [performLogout]);

  const setUserFromOAuth = useCallback((userData) => {
    setUser(userData);

    const serverProfile = {
      companyId: userData.companyId ?? null,
      role: userData.role ?? null,
      plan: userData.plan ?? null,
      profileCompleted: userData.profileCompleted ?? false,
      onboardingCompleted: userData.onboardingCompleted ?? false,
    };
    const merged = { ...DEFAULT_PROFILE, ...serverProfile };
    setProfile(merged);
    saveProfileToStorage(merged);
  }, []);

  /**
   * Merge partial updates into the profile state and persist to localStorage.
   * Consumers call this after completing onboarding steps, plan upgrades, etc.
   */
  const updateProfile = useCallback((updates) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      saveProfileToStorage(next);
      return next;
    });
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  const value = {
    // Existing exports (unchanged API)
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    setUserFromOAuth,

    // New exports
    profile,
    updateProfile,
    isNewUser: !profile.profileCompleted,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
