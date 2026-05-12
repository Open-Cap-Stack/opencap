'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import OCSLogo from '@/components/OCSLogo';
import api from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found. Please check your email link and try again.');
      return;
    }

    api
      .get(`/auth/verify/${token}`)
      .then(() => {
        setStatus('success');
      })
      .catch((err) => {
        const msg =
          err.response?.data?.message ||
          'Your verification link is invalid or has expired.';
        setErrorMessage(msg);
        setStatus('error');
      });
  }, [searchParams]);

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified</h2>
        <p className="text-gray-600 mb-6">
          Your account is now active. You can sign in to get started.
        </p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          Sign in
        </Link>
      </div>
    );
  }

  // status === 'error'
  return (
    <div className="text-center">
      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
      <p className="text-gray-600 mb-6">{errorMessage}</p>
      <div className="space-y-3">
        <p className="text-sm text-gray-500">
          Need a new link?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Sign in to request another
          </Link>
        </p>
        <p className="text-sm text-gray-500">
          Already verified?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            Go to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <OCSLogo variant="full" color="dark" height={36} />
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="text-center">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading...</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
