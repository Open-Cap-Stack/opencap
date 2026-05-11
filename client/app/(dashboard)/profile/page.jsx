'use client';

import { useState, useEffect } from 'react';
import { User, Camera, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const colors =
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800';

  return (
    <div
      className={`fixed top-6 right-6 z-50 border rounded-lg px-4 py-3 shadow-md text-sm max-w-xs animate-slide-in ${colors}`}
      role="alert"
    >
      {message}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [toast, setToast] = useState(null);

  // Pre-fill form from auth context
  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        email: user.email || '',
        role: user.role || '',
      });
    }
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await api.put('/auth/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        role: profileForm.role,
      });
      const updated = res.data?.user || res.data || {};
      updateProfile({ role: updated.role || profileForm.role });
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update profile.';
      showToast(msg, 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update password.';
      showToast(msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const initials = [profileForm.firstName, profileForm.lastName]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || (user?.email?.[0]?.toUpperCase() ?? 'U');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Avatar section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-semibold select-none">
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              <Camera className="w-3.5 h-3.5 text-gray-500" />
            </div>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {profileForm.firstName} {profileForm.lastName}
            </p>
            <p className="text-sm text-gray-500 mb-2">{profileForm.email}</p>
            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              onClick={() => showToast('Photo upload coming soon.', 'error')}
            >
              Upload photo
            </button>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold">Personal information</h2>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First name
              </label>
              <input
                type="text"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last name
              </label>
              <input
                type="text"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={profileForm.email}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here. Contact support.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={profileForm.role}
              onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="founder">Founder</option>
              <option value="investor">Investor</option>
              <option value="employee">Employee</option>
              <option value="legal">Legal</option>
              <option value="accountant">Accountant</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {profileLoading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold">Change password</h2>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Repeat new password"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {passwordLoading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-lg shadow p-6 border border-red-100">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="text-base font-semibold text-red-700">Danger zone</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <div className="relative inline-block group">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="px-4 py-2 bg-red-100 text-red-400 text-sm font-medium rounded-md cursor-not-allowed"
          >
            Delete account
          </button>
          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
            <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 whitespace-nowrap shadow-lg">
              Contact support to delete your account
              <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
