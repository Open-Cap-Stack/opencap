'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vestingScheduleService } from '@/lib/vestingScheduleService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatNumber(value) {
  const num = Number(value);
  if (!value && value !== 0) return '-';
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString('en-US');
}

/**
 * Calculate the vested percentage for a schedule.
 *
 * Priority:
 *  1. If the record has explicit `vestedShares` and `totalShares`, use the ratio.
 *  2. Otherwise derive from dates: linear vesting after cliff, full after end.
 */
function calcVestedPercent(record) {
  const total = Number(record.totalShares);

  // Case 1: explicit vestedShares provided by the API
  if (record.vestedShares !== undefined && record.vestedShares !== null && total > 0) {
    const vested = Number(record.vestedShares);
    return Math.min(100, Math.max(0, (vested / total) * 100));
  }

  // Case 2: derive from dates
  if (!record.startDate || !record.vestingMonths) return 0;

  const now = Date.now();
  const start = new Date(record.startDate).getTime();
  const cliffMonths = Number(record.cliffMonths) || 0;
  const vestingMonths = Number(record.vestingMonths);

  const cliffMs = cliffMonths * 30.44 * 24 * 60 * 60 * 1000;
  const totalMs = vestingMonths * 30.44 * 24 * 60 * 60 * 1000;

  // Before cliff: 0%
  if (now < start + cliffMs) return 0;

  // After full vesting period: 100%
  if (now >= start + totalMs) return 100;

  // Linear interpolation between cliff and end
  const elapsed = now - start;
  return Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
}

// ─── sub-components ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
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

function VestingProgressBar({ percent }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const label = `${clamped.toFixed(1)}%`;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-10 text-right shrink-0">{label}</span>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

// ─── empty form state ─────────────────────────────────────────────────────────

const emptyForm = {
  granteeName: '',
  totalShares: '',
  cliffMonths: '12',
  vestingMonths: '48',
  startDate: '',
  status: 'active',
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function VestingSchedulesPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  // ── queries & mutations ────────────────────────────────────────────────────

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['vestingSchedules'],
    queryFn: () => vestingScheduleService.getVestingSchedules(),
  });

  const createMut = useMutation({
    mutationFn: (d) => vestingScheduleService.createVestingSchedule(d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['vestingSchedules'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to create vesting schedule');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => vestingScheduleService.updateVestingSchedule(id, d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['vestingSchedules'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to update vesting schedule');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => vestingScheduleService.deleteVestingSchedule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vestingSchedules'] });
      setDeleteId(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete vesting schedule');
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
      granteeName: row.granteeName || '',
      totalShares: row.totalShares ?? '',
      cliffMonths: row.cliffMonths ?? '12',
      vestingMonths: row.vestingMonths ?? '48',
      startDate: row.startDate ? row.startDate.slice(0, 10) : '',
      status: row.status || 'active',
    });
    setMutationError(null);
    setModal({ open: true, editing: row });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      totalShares: form.totalShares !== '' ? Number(form.totalShares) : undefined,
      cliffMonths: form.cliffMonths !== '' ? Number(form.cliffMonths) : undefined,
      vestingMonths: form.vestingMonths !== '' ? Number(form.vestingMonths) : undefined,
    };
    if (modal.editing) {
      updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  // ── columns ────────────────────────────────────────────────────────────────

  const columns = [
    {
      key: 'granteeName',
      label: 'Grantee',
      render: (v) => <span className="font-medium text-gray-900">{v || '-'}</span>,
    },
    {
      key: 'totalShares',
      label: 'Total Shares',
      render: (v) => formatNumber(v),
    },
    {
      key: 'vestedShares',
      label: 'Vested Shares',
      render: (v, row) => {
        if (v !== undefined && v !== null) return formatNumber(v);
        // Derive from dates when not explicitly provided
        const pct = calcVestedPercent(row);
        const total = Number(row.totalShares);
        if (!total) return '-';
        return formatNumber(Math.round((pct / 100) * total));
      },
    },
    {
      key: '_progress',
      label: 'Vested %',
      render: (_, row) => <VestingProgressBar percent={calcVestedPercent(row)} />,
    },
    {
      key: 'cliffDate',
      label: 'Cliff Date',
      render: (v, row) => {
        // Accept explicit cliffDate or derive from startDate + cliffMonths
        if (v) return formatDate(v);
        if (row.startDate && row.cliffMonths) {
          const cliff = new Date(row.startDate);
          cliff.setMonth(cliff.getMonth() + Number(row.cliffMonths));
          return formatDate(cliff.toISOString());
        }
        return '-';
      },
    },
    {
      key: 'endDate',
      label: 'End Date',
      render: (v, row) => {
        if (v) return formatDate(v);
        if (row.startDate && row.vestingMonths) {
          const end = new Date(row.startDate);
          end.setMonth(end.getMonth() + Number(row.vestingMonths));
          return formatDate(end.toISOString());
        }
        return '-';
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: '_actions',
      label: '',
      render: (_, row) => row._actions,
    },
  ];

  // ── row assembly ───────────────────────────────────────────────────────────

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

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vesting Schedules</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track equity grants, cliff periods, and vesting progress for each grantee.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          New Schedule
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
          emptyMessage="No vesting schedules yet. Click 'New Schedule' to create one."
        />
      </div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modal.open}
        onClose={closeModal}
        title={modal.editing ? 'Edit Vesting Schedule' : 'New Vesting Schedule'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}

          <FormField label="Grantee Name" required>
            <input
              required
              type="text"
              value={form.granteeName}
              onChange={(e) => setForm({ ...form, granteeName: e.target.value })}
              placeholder="e.g. Jane Smith"
              className={inputClass}
            />
          </FormField>

          <FormField label="Total Shares" required>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.totalShares}
              onChange={(e) => setForm({ ...form, totalShares: e.target.value })}
              placeholder="e.g. 10000"
              className={inputClass}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Cliff (months)">
              <input
                type="number"
                min="0"
                step="1"
                value={form.cliffMonths}
                onChange={(e) => setForm({ ...form, cliffMonths: e.target.value })}
                placeholder="12"
                className={inputClass}
              />
            </FormField>

            <FormField label="Vesting period (months)">
              <input
                type="number"
                min="1"
                step="1"
                value={form.vestingMonths}
                onChange={(e) => setForm({ ...form, vestingMonths: e.target.value })}
                placeholder="48"
                className={inputClass}
              />
            </FormField>
          </div>

          <FormField label="Start Date" required>
            <input
              required
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className={inputClass}
            />
          </FormField>

          <FormField label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputClass}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </FormField>

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
        title="Delete Vesting Schedule"
        message="Are you sure you want to delete this vesting schedule? This action cannot be undone."
      />
    </div>
  );
}
