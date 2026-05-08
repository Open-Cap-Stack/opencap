'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { authService } from '@/lib/authService';
import {
  trackLoginStart, trackLoginComplete, trackLoginFailed,
  trackOAuthClick,
} from '@/lib/analytics';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    trackLoginStart('email');
    try {
      await login(email, password);
      trackLoginComplete('email');
      router.push('/');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      trackLoginFailed('email', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    setError('');
    trackOAuthClick(provider);
    trackLoginStart(provider);
    try {
      switch (provider) {
        case 'google': authService.initiateGoogleLogin(); break;
        case 'linkedin': authService.initiateLinkedInLogin(); break;
        case 'github': authService.initiateGitHubLogin(); break;
        case 'ainative': authService.initiateAINativeLogin(); break;
      }
    } catch (err) {
      trackLoginFailed(provider, err.message);
      setError(err.message);
    }
  };

  const anyOAuthAvailable =
    authService.isOAuthAvailable('google') ||
    authService.isOAuthAvailable('linkedin') ||
    authService.isOAuthAvailable('github') ||
    authService.isOAuthAvailable('ainative');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">OpenCap Stack</h1>
        <h2 className="text-lg text-gray-600 text-center mb-8">Sign in to your account</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {anyOAuthAvailable && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {authService.isOAuthAvailable('google') && (
                <button onClick={() => handleOAuth('google')}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <GoogleIcon />Google
                </button>
              )}

              {authService.isOAuthAvailable('linkedin') && (
                <button onClick={() => handleOAuth('linkedin')}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <LinkedInIcon />LinkedIn
                </button>
              )}

              {authService.isOAuthAvailable('github') && (
                <button onClick={() => handleOAuth('github')}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <GitHubIcon />GitHub
                </button>
              )}

              {authService.isOAuthAvailable('ainative') && (
                <button onClick={() => handleOAuth('ainative')}
                  className="col-span-2 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  <span className="mr-2 font-bold">AI</span>Sign in with AINative
                </button>
              )}
            </div>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
