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

// ─── summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ notes }) {
  const totalAmount = notes.reduce((sum, n) => sum + (Number(n.investmentAmount) || 0), 0);
  const count = notes.length;
  const caps = notes.filter((n) => Number(n.valuationCap) > 0).map((n) => Number(n.valuationCap));
  const avgCap = caps.length > 0 ? caps.reduce((a, b) => a + b, 0) / caps.length : 0;
  const uniqueInvestors = new Set(notes.map((n) => n.investorName).filter(Boolean)).size;

  const cards = [
    {
      label: 'Total SAFE Amount Raised',
      value: formatCurrency(totalAmount),
      sub: count === 0 ? 'No SAFEs yet' : `Across ${count} SAFE${count !== 1 ? 's' : ''}`,
      color: 'text-blue-600',
    },
    {
      label: 'Number of SAFEs',
      value: count.toString(),
      sub: `${notes.filter((n) => n.status === 'open').length} active`,
      color: 'text-indigo-600',
    },
    {
      label: 'Average Valuation Cap',
      value: avgCap > 0 ? formatCurrency(avgCap) : '-',
      sub: caps.length > 0 ? `Based on ${caps.length} capped SAFE${caps.length !== 1 ? 's' : ''}` : 'No caps set',
      color: 'text-purple-600',
    },
    {
      label: 'Total Investors',
      value: uniqueInvestors.toString(),
      sub: uniqueInvestors === 1 ? '1 unique investor' : `${uniqueInvestors} unique investors`,
      color: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── status filter ────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Active' },
  { value: 'converted', label: 'Converted' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ─── columns ─────────────────────────────────────────────────────────────────

const columns = [
  {
    key: 'investorName',
    label: 'Investor',
    render: (v) => <span className="font-medium text-gray-900">{v || '-'}</span>,
  },
  {
    key: 'investmentAmount',
    label: 'Amount',
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
    key: 'safeType',
    label: 'Type',
    render: (v) => {
      if (!v) return <span className="text-gray-400">-</span>;
      const label = v === 'post-money' ? 'Post-Money' : v === 'pre-money' ? 'Pre-Money' : v;
      const style = v === 'post-money' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700';
      return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style}`}>{label}</span>;
    },
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
  safeType: 'post-money',
  status: 'open',
  date: '',
};

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">No SAFE notes yet</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">
        Start tracking your SAFE agreements. Add your first SAFE note to see summary metrics and manage investor details.
      </p>
      <button
        onClick={onAdd}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
      >
        Add SAFE note
      </button>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SafeNotesPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
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
      safeType: row.safeType || 'post-money',
      status: row.status || 'open',
      date: row.date ? row.date.slice(0, 10) : '',
    });
    setMutationError(null);
    setModal({ open: true, editing: row });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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

  // ── data assembly ─────────────────────────────────────────────────────────

  const allNotes = Array.isArray(data) ? data : [];
  const filteredNotes = statusFilter
    ? allNotes.filter((n) => n.status === statusFilter)
    : allNotes;

  const rows = filteredNotes.map((r) => ({
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SAFE Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track Simple Agreements for Future Equity across all investors
          </p>
        </div>
        <button
          onClick={openCreate}
          className="self-start sm:self-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          New SAFE
        </button>
      </div>

      {/* Summary cards — always shown, zero-state when no data */}
      <SummaryCards notes={allNotes} />

      {/* Table section */}
      <div className="bg-white rounded-lg shadow">
        {/* Table header with filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">SAFE Agreements</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Filter:</label>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    statusFilter === f.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state when no SAFE notes at all */}
        {!isLoading && !error && allNotes.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            isLoading={isLoading}
            error={error?.message}
            onRetry={refetch}
            emptyMessage={
              statusFilter
                ? `No ${statusFilter} SAFE notes. Try a different filter.`
                : "No SAFE notes yet. Click 'New SAFE' to add one."
            }
          />
        )}
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
              SAFE Type
            </label>
            <select
              value={form.safeType}
              onChange={(e) => setForm({ ...form, safeType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="post-money">Post-Money SAFE</option>
              <option value="pre-money">Pre-Money SAFE</option>
              <option value="mfn">MFN SAFE</option>
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
