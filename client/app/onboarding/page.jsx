'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OCSLogo from '@/components/OCSLogo';
import { useAuth } from '@/lib/AuthContext';

/**
 * Post-registration onboarding welcome screen.
 * Shown after a user's first login. Guides them through the two-step setup
 * flow before they land on the main dashboard.
 */
export default function OnboardingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated visitors to login, preserving the intended destination.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/onboarding');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show nothing while auth state is being resolved.
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="mb-10">
        <OCSLogo variant="full" color="dark" height={40} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-200 px-10 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-3 text-center">
          Welcome to Open Cap Stack
        </h1>
        <p className="text-gray-500 text-center mb-10 leading-relaxed">
          Let&apos;s get your cap table set up. This takes about 2 minutes.
        </p>

        {/* Step indicator */}
        <ol className="flex flex-col gap-4 mb-10" aria-label="Setup steps">
          <li className="flex items-start gap-4">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center"
              aria-hidden="true"
            >
              1
            </span>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Company details</p>
              <p className="text-gray-500 text-sm mt-0.5">
                Tell us a bit about your company so we can configure your cap table.
              </p>
            </div>
          </li>

          <li className="flex items-start gap-4">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-400 text-sm font-semibold flex items-center justify-center"
              aria-hidden="true"
            >
              2
            </span>
            <div>
              <p className="font-semibold text-gray-400 text-sm">You&apos;re ready</p>
              <p className="text-gray-400 text-sm mt-0.5">
                Your dashboard will be ready to go.
              </p>
            </div>
          </li>
        </ol>

        {/* Primary CTA */}
        <Link
          href="/company-setup"
          className="block w-full text-center py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Get started
        </Link>

        {/* Skip link */}
        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline transition-colors"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}
