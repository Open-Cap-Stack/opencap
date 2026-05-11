'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';

const RESOLUTION_TYPES = ['Written Consent', 'Meeting Vote', 'Unanimous Consent'];
const RESOLUTION_STATUSES = ['pending', 'passed', 'rejected'];

const STATUS_STYLES = {
  passed: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
};

const columns = [
  { key: 'title', label: 'Resolution', render: (v) => v || 'Untitled Resolution' },
  { key: 'type', label: 'Type', render: (v) => v || '-' },
  {
    key: 'date',
    label: 'Date',
    render: (v) => (v ? new Date(v).toLocaleDateString() : '-'),
  },
  {
    key: 'status',
    label: 'Status',
    render: (v) => {
      const style = STATUS_STYLES[v] || 'bg-gray-100 text-gray-700';
      const label = v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Pending';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
          {label}
        </span>
      );
    },
  },
  {
    key: 'votes',
    label: 'Votes',
    render: (_, row) => {
      const { votesFor, votesAgainst, votesAbstain } = row;
      if (votesFor == null && votesAgainst == null) return '-';
      return (
        <span className="text-xs text-gray-600">
          {votesFor ?? 0} for / {votesAgainst ?? 0} against
          {votesAbstain ? ` / ${votesAbstain} abstain` : ''}
        </span>
      );
    },
  },
];

const emptyForm = {
  title: '',
  type: 'Written Consent',
  date: '',
  status: 'pending',
  description: '',
  votesFor: '',
  votesAgainst: '',
  votesAbstain: '',
};

async function fetchResolutions() {
  try {
    const res = await api.get('/board-resolutions');
    return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  } catch {
    return [];
  }
}

async function createResolution(data) {
  const res = await api.post('/board-resolutions', {
    ...data,
    votesFor: data.votesFor ? Number(data.votesFor) : undefined,
    votesAgainst: data.votesAgainst ? Number(data.votesAgainst) : undefined,
    votesAbstain: data.votesAbstain ? Number(data.votesAbstain) : undefined,
  });
  return res.data;
}

export default function ResolutionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['board-resolutions'],
    queryFn: fetchResolutions,
  });

  const createMut = useMutation({
    mutationFn: createResolution,
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['board-resolutions'] });
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => {
      setMutationError(
        err.response?.data?.message || 'Failed to create resolution. The endpoint may not be available yet.'
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setMutationError(null);
    createMut.mutate(form);
  };

  const rows = Array.isArray(data) ? data : [];

  const passed = rows.filter((r) => r.status === 'passed').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const rejected = rows.filter((r) => r.status === 'rejected').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Resolutions</h2>
        <button
          onClick={() => { setForm(emptyForm); setMutationError(null); setModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Add Resolution
        </button>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Passed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{passed}</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow px-4 py-3">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Rejected</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{rejected}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          onRetry={refetch}
          emptyMessage="No resolutions recorded yet"
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setMutationError(null); }}
        title="Add Resolution"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Approval of Option Pool Increase"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RESOLUTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RESOLUTION_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date <span className="text-red-500">*</span></label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the resolution..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Vote Counts</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">For</label>
                <input
                  type="number"
                  min="0"
                  value={form.votesFor}
                  onChange={(e) => setForm({ ...form, votesFor: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Against</label>
                <input
                  type="number"
                  min="0"
                  value={form.votesAgainst}
                  onChange={(e) => setForm({ ...form, votesAgainst: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Abstain</label>
                <input
                  type="number"
                  min="0"
                  value={form.votesAbstain}
                  onChange={(e) => setForm({ ...form, votesAbstain: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setMutationError(null); }}
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              {createMut.isPending ? 'Saving...' : 'Add Resolution'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
