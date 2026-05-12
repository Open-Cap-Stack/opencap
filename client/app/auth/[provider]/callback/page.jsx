'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { authService } from '@/lib/authService';

function OAuthCallbackInner() {
  const { provider } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUserFromOAuth } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (provider === 'ainative') {
          const code = searchParams.get('code');
          if (!code) throw new Error('Missing authorization code in AINative callback');
          const data = await authService.handleAINativeCallback(code);
          if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            setUserFromOAuth(data.user);
          }
          router.replace('/dashboard');
          return;
        }

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const oauthError = searchParams.get('error');

        if (oauthError) {
          throw new Error(`${provider} denied access: ${searchParams.get('error_description') || oauthError}`);
        }

        if (!code) {
          throw new Error(`Missing authorization code from ${provider}`);
        }

        const data = await authService.handleOAuthCallback(provider, code, state);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          setUserFromOAuth(data.user);
        }
        router.replace('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    processCallback();
  }, [provider, searchParams, router, setUserFromOAuth]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing {provider} sign-in...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <OAuthCallbackInner />
    </Suspense>
  );
}
