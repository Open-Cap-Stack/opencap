'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { trackSignUpStart, trackSignUpComplete } from '@/lib/analytics';
import OCSLogo from '@/components/OCSLogo';

const features = [
  { icon: '📊', text: 'Cap table management aligned with OCTA v2.0 schema' },
  { icon: '📄', text: 'SAFE notes, convertible notes, and equity grant tracking' },
  { icon: '💧', text: 'Dilution modeling and waterfall analysis' },
  { icon: '🔢', text: '409A valuation support and vesting schedule automation' },
  { icon: '🤖', text: 'MCP server — manage your cap table from any AI chat' },
  { icon: '📁', text: 'Document storage with version control and audit trail' },
];

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { register } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    trackSignUpStart('email');
    try {
      await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, password: form.password });
      trackSignUpComplete('email');
      setRegisteredEmail(form.email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We sent a verification link to <strong>{registeredEmail}</strong>. Click the link to activate your account, then sign in.
          </p>
          <Link href="/login" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — value prop */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 text-white flex-col justify-center px-12 py-16">
        <Link href="/" className="inline-block mb-12">
          <OCSLogo variant="full" color="light" height={36} />
        </Link>

        <h1 className="text-3xl font-bold mb-4 leading-tight">
          Cap table management built for the way startups actually work
        </h1>
        <p className="text-blue-100 text-lg mb-10">
          Issue equity, model dilution, track SAFEs, and manage documents — all in one place. Free to start.
        </p>

        <ul className="space-y-4">
          {features.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{f.icon}</span>
              <span className="text-blue-100 text-sm leading-relaxed">{f.text}</span>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-blue-200 text-sm">
          Free plan · No credit card required · Cancel anytime
        </p>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-8 py-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/">
              <OCSLogo variant="full" color="dark" height={36} />
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
            <p className="text-sm text-gray-500 mb-6">Free forever on the base plan.</p>

            {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input id="firstName" name="firstName" required value={form.firstName} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input id="lastName" name="lastName" required value={form.lastName} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Work email</label>
                <input id="email" name="email" type="email" required value={form.email} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="you@company.com" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input id="password" name="password" type="password" required value={form.password} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Creating account...' : 'Get started free'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            By signing up you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-600">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
