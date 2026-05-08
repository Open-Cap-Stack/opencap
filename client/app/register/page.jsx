'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { trackSignUpStart, trackSignUpComplete } from '@/lib/analytics';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

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
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label><input id="firstName" name="firstName" required value={form.firstName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <div><label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label><input id="lastName" name="lastName" required value={form.lastName} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          </div>
          <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input id="email" name="email" type="email" required value={form.email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label><input id="password" name="password" type="password" required value={form.password} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><input id="confirmPassword" name="confirmPassword" type="password" required value={form.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
