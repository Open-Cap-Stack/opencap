'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spvService } from '@/lib/spvService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-yellow-100 text-yellow-700',
  dissolved: 'bg-gray-100 text-gray-600',
};

function StatusBadge({ status }) {
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  const classes = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

// ─── columns ──────────────────────────────────────────────────────────────────

const columns = [
  {
    key: 'name',
    label: 'Name',
    render: (v) => v || '-',
  },
  {
    key: 'type',
    label: 'Type',
    render: (v) => v ? v.toUpperCase() : '-',
  },
  {
    key: 'status',
    label: 'Status',
    render: (v) => <StatusBadge status={v} />,
  },
  {
    key: '_assetCount',
    label: 'Total Assets',
    render: (v) => (v !== undefined && v !== null ? v : '-'),
  },
  {
    key: 'formationDate',
    label: 'Formation Date',
    render: (v) => formatDate(v),
  },
  {
    key: '_actions',
    label: '',
    render: (_, row) => row._actions,
  },
];

// ─── form defaults ────────────────────────────────────────────────────────────

const emptyForm = {
  name: '',
  type: 'LLC',
  status: 'active',
  formationDate: '',
  description: '',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SpvPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  // ── queries & mutations ────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['spvs'],
    queryFn: () => spvService.getSpvs(),
  });

  const createMut = useMutation({
    mutationFn: (d) => spvService.createSpv(d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['spvs'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to create SPV');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => spvService.updateSpv(id, d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['spvs'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to update SPV');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => spvService.deleteSpv(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spvs'] });
      setDeleteId(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete SPV');
    },
  });

  // ── handlers ───────────────────────────────────────────────────────────────

  const closeModal = () => {
    setModal({ open: false, editing: null });
    setMutationError(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setMutationError(null);
    setModal({ open: true, editing: null });
  };

  const openEdit = (row) => {
    setForm({
      name: row.name || '',
      type: row.type || 'LLC',
      status: row.status || 'active',
      formationDate: row.formationDate ? row.formationDate.slice(0, 10) : '',
      description: row.description || '',
    });
    setMutationError(null);
    setModal({ open: true, editing: row });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal.editing) {
      updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // ── row assembly ───────────────────────────────────────────────────────────

  const spvList = Array.isArray(data) ? data : [];

  const rows = spvList.map((r) => ({
    ...r,
    // Surface asset count from either a nested array or a pre-computed field
    _assetCount:
      r.assetCount ??
      (Array.isArray(r.assets) ? r.assets.length : undefined),
    _actions: (
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          className="text-blue-600 text-sm hover:underline"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }}
          className="text-red-600 text-sm hover:underline"
        >
          Delete
        </button>
      </div>
    ),
  }));

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SPV Management</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          New SPV
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          error={error?.message}
          onRetry={refetch}
          emptyMessage="No SPVs yet. Click 'New SPV' to add one."
        />
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.editing ? 'Edit SPV' : 'New SPV'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Acme SPV I"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="LLC">LLC</option>
              <option value="LP">LP</option>
              <option value="Corp">Corp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="dissolved">Dissolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Formation Date
            </label>
            <input
              type="date"
              value={form.formationDate}
              onChange={(e) => setForm({ ...form, formationDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional notes about this SPV"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        title="Delete SPV"
        message="Are you sure you want to delete this SPV? This action cannot be undone."
      />
    </div>
  );
}
