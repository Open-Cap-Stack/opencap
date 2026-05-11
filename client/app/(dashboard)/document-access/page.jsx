'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  X,
  Trash2,
  Search,
  ChevronDown,
  User,
  FileText,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

function levelBadge(level) {
  const map = {
    view: 'bg-blue-100 text-blue-700',
    edit: 'bg-amber-100 text-amber-700',
    download: 'bg-green-100 text-green-700',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[level] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {level ?? 'view'}
    </span>
  );
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ── Grant Access Modal ────────────────────────────────────────────────────────

function GrantAccessModal({ onClose, onGranted }) {
  const [fields, setFields] = useState({
    documentId: '',
    documentName: '',
    email: '',
    level: 'view',
    expiryDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    api.get('/documents')
      .then((res) => setDocuments(Array.isArray(res.data) ? res.data : []))
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, []);

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fields.email.trim()) { setError('Email is required'); return; }
    if (!fields.documentId && !fields.documentName.trim()) {
      setError('Select or enter a document');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        documentId: fields.documentId || undefined,
        documentName: fields.documentName.trim() || undefined,
        email: fields.email.trim(),
        accessLevel: fields.level,
        ...(fields.expiryDate ? { expiryDate: fields.expiryDate } : {}),
      };
      const res = await api.post('/document-access', payload);
      onGranted(res.data);
    } catch (err) {
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        // Graceful degradation when API not yet available
        const selectedDoc = documents.find((d) => d.id === fields.documentId || d._id === fields.documentId);
        onGranted({
          id: `local-${Date.now()}`,
          documentId: fields.documentId,
          documentName: selectedDoc?.name ?? selectedDoc?.title ?? fields.documentName,
          email: fields.email.trim(),
          accessLevel: fields.level,
          grantedBy: 'You',
          grantedAt: new Date().toISOString(),
          expiryDate: fields.expiryDate || null,
          _local: true,
        });
      } else {
        setError(err.response?.data?.message || 'Failed to grant access');
        setSaving(false);
      }
    }
  };

  const handleDocSelect = (e) => {
    const id = e.target.value;
    const doc = documents.find((d) => d.id === id || d._id === id);
    setFields((f) => ({
      ...f,
      documentId: id,
      documentName: doc?.name ?? doc?.title ?? '',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Grant document access</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document <span className="text-red-500">*</span>
            </label>
            {docsLoading ? (
              <p className="text-xs text-gray-400">Loading documents...</p>
            ) : documents.length > 0 ? (
              <div className="relative">
                <select
                  value={fields.documentId}
                  onChange={handleDocSelect}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  <option value="">Select a document...</option>
                  {documents.map((d) => (
                    <option key={d.id ?? d._id} value={d.id ?? d._id}>
                      {d.name ?? d.title ?? 'Untitled'}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <input
                value={fields.documentName}
                onChange={set('documentName')}
                placeholder="Enter document name"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={fields.email}
              onChange={set('email')}
              placeholder="user@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access level</label>
            <div className="relative">
              <select
                value={fields.level}
                onChange={set('level')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="view">View only</option>
                <option value="download">View + Download</option>
                <option value="edit">Edit</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access expiry (optional)
            </label>
            <input
              type="date"
              value={fields.expiryDate}
              onChange={set('expiryDate')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Granting...' : 'Grant access'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function DocumentAccessPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGrant, setShowGrant] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [filterDoc, setFilterDoc] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchAccess = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/document-access');
      setEntries(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        setEntries([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load access records');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccess(); }, [fetchAccess]);

  const handleGranted = (entry) => {
    setEntries((prev) => [entry, ...prev]);
    setShowGrant(false);
  };

  const handleRevoke = async (id) => {
    setRevoking(id);
    try {
      await api.delete(`/document-access/${id}`);
    } catch {
      // Best-effort
    }
    setEntries((prev) => prev.filter((e) => e.id !== id && e._id !== id));
    setRevoking(null);
  };

  // Derive unique values for filter dropdowns
  const uniqueDocs = [...new Set(entries.map((e) => e.documentName ?? e.document?.name ?? '').filter(Boolean))];
  const uniqueUsers = [...new Set(entries.map((e) => e.email ?? e.user?.email ?? '').filter(Boolean))];

  const filtered = entries.filter((e) => {
    const docName = (e.documentName ?? e.document?.name ?? '').toLowerCase();
    const userEmail = (e.email ?? e.user?.email ?? '').toLowerCase();
    const matchDoc = !filterDoc || docName.includes(filterDoc.toLowerCase());
    const matchUser = !filterUser || userEmail.includes(filterUser.toLowerCase());
    return matchDoc && matchUser;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage who can view, edit, or download your documents
          </p>
        </div>
        <button
          onClick={() => setShowGrant(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          <Plus size={16} />
          Grant access
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[
          { label: 'Documents', href: '/documents' },
          { label: 'Data Rooms', href: '/data-rooms' },
          { label: 'Access Control', href: '/document-access' },
          { label: 'Templates', href: '/templates' },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab.href === '/document-access'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filterDoc}
            onChange={(e) => setFilterDoc(e.target.value)}
            placeholder="Filter by document"
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Filter by user"
            className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
        {(filterDoc || filterUser) && (
          <button
            onClick={() => { setFilterDoc(''); setFilterUser(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={fetchAccess} className="text-sm text-red-700 underline hover:no-underline">
            Try again
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <ShieldCheck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium mb-1">No access records yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Grant access to documents to control who can view, edit, or download them
          </p>
          <button
            onClick={() => setShowGrant(true)}
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Plus size={14} />
            Grant first access
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No records match your filters.</p>
          <button
            onClick={() => { setFilterDoc(''); setFilterUser(''); }}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    <span className="flex items-center gap-1"><FileText size={14} /> Document</span>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    <span className="flex items-center gap-1"><User size={14} /> Who has access</span>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Granted by</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    <span className="flex items-center gap-1"><Clock size={14} /> Granted</span>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Expiry</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((entry, i) => {
                  const id = entry.id ?? entry._id;
                  const docName = entry.documentName ?? entry.document?.name ?? entry.document?.title ?? '—';
                  const userEmail = entry.email ?? entry.user?.email ?? '—';
                  const grantedBy = entry.grantedBy ?? entry.grantor?.email ?? '—';
                  const expired = isExpired(entry.expiryDate);
                  return (
                    <tr key={id ?? i} className={expired ? 'opacity-60' : ''}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="flex items-center gap-1">
                          <FileText size={14} className="text-gray-400 shrink-0" />
                          {docName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{userEmail}</td>
                      <td className="px-4 py-3 text-sm">{levelBadge(entry.accessLevel ?? entry.level)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{grantedBy}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{fmt(entry.grantedAt ?? entry.createdAt)}</td>
                      <td className="px-4 py-3 text-sm">
                        {entry.expiryDate ? (
                          <span className={expired ? 'text-red-500' : 'text-amber-600'}>
                            {expired ? 'Expired ' : ''}{fmt(entry.expiryDate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">No expiry</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => handleRevoke(id)}
                          disabled={revoking === id}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-40"
                          title="Revoke access"
                        >
                          <Trash2 size={13} />
                          {revoking === id ? 'Revoking...' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grant access modal */}
      {showGrant && (
        <GrantAccessModal
          onClose={() => setShowGrant(false)}
          onGranted={handleGranted}
        />
      )}
    </div>
  );
}
