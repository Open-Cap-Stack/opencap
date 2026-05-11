'use client';

import { useState } from 'react';
import { Mail, Edit2, Eye, Trash2, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = ['Email Templates', 'Send History', 'Settings'];

// ── Starter templates (shown when API returns none) ────────────────────────────

const STARTER_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Welcome Email',
    subject: 'Welcome to the cap table platform',
    lastEdited: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'tpl-2',
    name: 'Equity Grant Notification',
    subject: "You've received an equity grant",
    lastEdited: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 'tpl-3',
    name: 'Board Meeting Invite',
    subject: 'Upcoming Board Meeting — Action Required',
    lastEdited: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_META = {
  delivered: { icon: CheckCircle, color: 'text-green-600', label: 'Delivered' },
  failed:    { icon: XCircle,     color: 'text-red-500',   label: 'Failed' },
  pending:   { icon: Clock,       color: 'text-amber-500', label: 'Pending' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${meta.color}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

// ── Sub-tabs ───────────────────────────────────────────────────────────────────

function EmailTemplatesTab() {
  const [previewId, setPreviewId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      try {
        const res = await api.get('/email-templates');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        return list.length > 0 ? list : STARTER_TEMPLATES;
      } catch {
        return STARTER_TEMPLATES;
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/email-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-templates'] }),
    onError: (err) => alert(err.response?.data?.message || 'Failed to delete template'),
  });

  const templates = data ?? [];
  const previewing = templates.find((t) => (t.id ?? t._id) === previewId);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Mail size={32} className="mx-auto mb-3 text-gray-300 animate-pulse" />
        <p>Loading templates…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-2">Failed to load templates</p>
        <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Try again</button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-12 text-center">
        <Mail size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium text-gray-700">No email templates yet</p>
        <p className="text-sm text-gray-400 mt-1">Create your first template to get started</p>
      </div>
    );
  }

  return (
    <>
      {previewing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-semibold text-blue-800">{previewing.name}</p>
              <p className="text-xs text-blue-600 mt-0.5">Subject: {previewing.subject}</p>
            </div>
            <button onClick={() => setPreviewId(null)} className="text-blue-400 hover:text-blue-600 text-xs">Close</button>
          </div>
          {previewing.body ? (
            <div className="text-sm text-gray-700 mt-2 bg-white rounded p-3 border border-blue-100 whitespace-pre-wrap">{previewing.body}</div>
          ) : (
            <p className="text-sm text-gray-500 italic mt-1">No body content available for preview.</p>
          )}
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {templates.map((tpl) => {
          const id = tpl.id ?? tpl._id;
          return (
            <div key={id} className="flex items-center gap-4 py-4 px-1 hover:bg-gray-50 transition-colors rounded-md">
              <div className="flex-shrink-0 w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Mail size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{tpl.subject}</p>
              </div>
              <p className="hidden sm:block text-xs text-gray-400">Edited {formatDate(tpl.lastEdited ?? tpl.updatedAt)}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewId(previewId === id ? null : id)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  title="Preview"
                >
                  <Eye size={15} />
                </button>
                <button
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                  title="Edit"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => { if (confirm('Delete this template?')) deleteMut.mutate(id); }}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SendHistoryTab() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['email-send-history'],
    queryFn: async () => {
      try {
        const res = await api.get('/email-templates/history');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const history = data ?? [];

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Send size={32} className="mx-auto mb-3 text-gray-300 animate-pulse" />
        <p>Loading send history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-2">Failed to load send history</p>
        <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Try again</button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-12 text-center">
        <Send size={40} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium text-gray-700">No emails sent yet</p>
        <p className="text-sm text-gray-400 mt-1">Emails sent using templates will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">To</th>
            <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
            <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Sent</th>
            <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {history.map((row) => (
            <tr key={row.id ?? row._id} className="hover:bg-gray-50">
              <td className="py-3 px-2 text-gray-700 truncate max-w-[140px]">{row.to}</td>
              <td className="py-3 px-2 text-gray-700 truncate max-w-[200px]">{row.subject}</td>
              <td className="py-3 px-2 text-gray-500 hidden sm:table-cell">{formatDate(row.sentAt ?? row.createdAt)}</td>
              <td className="py-3 px-2"><StatusBadge status={row.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="py-6 space-y-6 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Sender Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Name</label>
            <input
              type="text"
              placeholder="OpenCap Stack"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reply-To Email</label>
            <input
              type="email"
              placeholder="noreply@yourcompany.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Notification Preferences</h3>
        {[
          'Send me a copy of every outgoing email',
          'Notify on email delivery failure',
          'Weekly send report',
        ].map((label) => (
          <label key={label} className="flex items-center gap-3 py-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-blue-600" />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
      <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
        Save settings
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState('Email Templates');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Communications</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow p-5">
        {activeTab === 'Email Templates' && <EmailTemplatesTab />}
        {activeTab === 'Send History'    && <SendHistoryTab />}
        {activeTab === 'Settings'        && <SettingsTab />}
      </div>
    </div>
  );
}
