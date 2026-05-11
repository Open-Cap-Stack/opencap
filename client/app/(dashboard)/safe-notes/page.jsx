'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { safeNoteService } from '@/lib/safeNoteService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value) {
  const num = Number(value);
  if (!value && value !== 0) return '-';
  if (Number.isNaN(num)) return '-';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-700',
  converted: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
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

// ─── columns ─────────────────────────────────────────────────────────────────

const columns = [
  {
    key: 'investorName',
    label: 'Investor',
    render: (v) => v || '-',
  },
  {
    key: 'investmentAmount',
    label: 'Investment Amount',
    render: (v) => formatCurrency(v),
  },
  {
    key: 'valuationCap',
    label: 'Valuation Cap',
    render: (v) => formatCurrency(v),
  },
  {
    key: 'discountRate',
    label: 'Discount Rate',
    render: (v) => (v !== undefined && v !== null && v !== '' ? `${v}%` : '-'),
  },
  {
    key: 'status',
    label: 'Status',
    render: (v) => <StatusBadge status={v} />,
  },
  {
    key: 'date',
    label: 'Date',
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
  investorName: '',
  investmentAmount: '',
  valuationCap: '',
  discountRate: '',
  status: 'open',
  date: '',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SafeNotesPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  // ── queries & mutations ──────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['safeNotes'],
    queryFn: () => safeNoteService.getSafeNotes(),
  });

  const createMut = useMutation({
    mutationFn: (d) => safeNoteService.createSafeNote(d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['safeNotes'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to create SAFE note');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => safeNoteService.updateSafeNote(id, d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['safeNotes'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to update SAFE note');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => safeNoteService.deleteSafeNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['safeNotes'] });
      setDeleteId(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete SAFE note');
    },
  });

  // ── handlers ─────────────────────────────────────────────────────────────

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
      investorName: row.investorName || '',
      investmentAmount: row.investmentAmount ?? '',
      valuationCap: row.valuationCap ?? '',
      discountRate: row.discountRate ?? '',
      status: row.status || 'open',
      // Normalize ISO date string to YYYY-MM-DD for the date input
      date: row.date ? row.date.slice(0, 10) : '',
    });
    setMutationError(null);
    setModal({ open: true, editing: row });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Coerce numeric strings to numbers before sending
    const payload = {
      ...form,
      investmentAmount: form.investmentAmount !== '' ? Number(form.investmentAmount) : undefined,
      valuationCap: form.valuationCap !== '' ? Number(form.valuationCap) : undefined,
      discountRate: form.discountRate !== '' ? Number(form.discountRate) : undefined,
    };
    if (modal.editing) {
      updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // ── row assembly ──────────────────────────────────────────────────────────

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    ...r,
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

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">SAFE Notes</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          New SAFE
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
          emptyMessage="No SAFE notes yet. Click 'New SAFE' to add one."
        />
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.editing ? 'Edit SAFE Note' : 'New SAFE Note'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Investor Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.investorName}
              onChange={(e) => setForm({ ...form, investorName: e.target.value })}
              placeholder="e.g. Acme Ventures"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Investment Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.investmentAmount}
              onChange={(e) => setForm({ ...form, investmentAmount: e.target.value })}
              placeholder="e.g. 500000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valuation Cap ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valuationCap}
              onChange={(e) => setForm({ ...form, valuationCap: e.target.value })}
              placeholder="e.g. 10000000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discountRate}
              onChange={(e) => setForm({ ...form, discountRate: e.target.value })}
              placeholder="e.g. 20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              <option value="open">Open</option>
              <option value="converted">Converted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        title="Delete SAFE Note"
        message="Are you sure you want to delete this SAFE note? This action cannot be undone."
      />
    </div>
  );
}
