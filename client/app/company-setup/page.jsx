'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import OCSLogo from '@/components/OCSLogo';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

const COMPANY_TYPES = [
  { value: '', label: 'Select company type' },
  { value: 'Delaware C-Corp', label: 'Delaware C-Corp' },
  { value: 'LLC', label: 'LLC' },
  { value: 'Other', label: 'Other' },
];

const EMPTY_FORM = {
  legalName: '',
  companyType: '',
  incorporationState: '',
  foundedDate: '',
  website: '',
  numberOfFounders: '',
};

/**
 * Step 1 of 2 in the onboarding flow.
 * Collects basic company details, POSTs to /api/v1/companies, then updates
 * the auth profile and redirects to the dashboard.
 */
export default function CompanySetupPage() {
  const { isAuthenticated, isLoading, updateProfile } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Redirect unauthenticated visitors before rendering the form.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?redirect=/company-setup');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.legalName.trim()) {
      setError('Company legal name is required.');
      return;
    }
    if (!form.companyType) {
      setError('Please select a company type.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.legalName.trim(),
        companyType: form.companyType,
        incorporationState: form.incorporationState.trim() || undefined,
        foundedDate: form.foundedDate || undefined,
        website: form.website.trim() || undefined,
        numberOfFounders: form.numberOfFounders
          ? parseInt(form.numberOfFounders, 10)
          : undefined,
      };

      const response = await api.post('/companies', payload);
      const company = response.data?.company || response.data;

      // Persist profile completion to localStorage via the auth context.
      updateProfile({
        companyId: company?.id ?? company?._id ?? null,
        profileCompleted: true,
        onboardingCompleted: true,
      });

      // Optionally persist to the server profile endpoint (best-effort).
      try {
        await api.put('/auth/profile', {
          companyId: company?.id ?? company?._id,
          profileCompleted: true,
          onboardingCompleted: true,
        });
      } catch {
        // Non-fatal — profile is already saved to localStorage.
      }

      router.replace('/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="mb-8">
        <OCSLogo variant="full" color="dark" height={40} />
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-gray-200 px-10 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center">
              1
            </span>
            <span className="text-sm font-semibold text-gray-900">Company details</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-semibold flex items-center justify-center">
              2
            </span>
            <span className="text-sm text-gray-400">You&apos;re ready</span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Set up your company</h1>
        <p className="text-sm text-gray-500 mb-7">
          This information is used to configure your cap table and generate reports.
        </p>

        {/* Inline error */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Company legal name */}
          <div>
            <label
              htmlFor="legalName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Company legal name <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="legalName"
              name="legalName"
              type="text"
              required
              autoComplete="organization"
              placeholder="Acme, Inc."
              value={form.legalName}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Company type */}
          <div>
            <label
              htmlFor="companyType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Company type <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="companyType"
              name="companyType"
              required
              value={form.companyType}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white appearance-none"
            >
              {COMPANY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Incorporation state + Founded date — two-column on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="incorporationState"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Incorporation state
              </label>
              <input
                id="incorporationState"
                name="incorporationState"
                type="text"
                autoComplete="address-level1"
                placeholder="Delaware"
                value={form.incorporationState}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="foundedDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Founded date
              </label>
              <input
                id="foundedDate"
                name="foundedDate"
                type="date"
                value={form.foundedDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Website */}
          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Website{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="website"
              name="website"
              type="url"
              autoComplete="url"
              placeholder="https://yourcompany.com"
              value={form.website}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Number of founders */}
          <div>
            <label
              htmlFor="numberOfFounders"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Number of founders
            </label>
            <input
              id="numberOfFounders"
              name="numberOfFounders"
              type="number"
              min="1"
              max="20"
              placeholder="2"
              value={form.numberOfFounders}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-6 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {submitting ? 'Setting up your company...' : 'Set up my company'}
          </button>
        </form>

        {/* Back / skip */}
        <div className="mt-5 flex items-center justify-between">
          <Link
            href="/onboarding"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Back
          </Link>
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
