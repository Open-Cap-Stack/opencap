'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stakeholderService } from '@/lib/stakeholderService';
import { useAuth } from '@/lib/AuthContext';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Name', render: (v, row) => v || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A' },
  { key: 'email', label: 'Email' },
  { key: 'type', label: 'Type' },
  { key: 'role', label: 'Role' },
  { key: 'ownershipPercentage', label: 'Ownership %', render: (v) => v ? `${v}%` : '-' },
  { key: 'actions', label: '', render: (_, row) => row._actions },
];

const emptyForm = { name: '', email: '', type: 'Individual', role: 'stakeholder', ownershipPercentage: '' };
const emptyErrors = { name: '', email: '' };

export default function StakeholdersPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState(emptyErrors);
  const [deleteId, setDeleteId] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const qc = useQueryClient();
  const { profile } = useAuth();
  const companyId = profile?.companyId;

  // Auto-dismiss success banner after 3 seconds
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stakeholders', companyId],
    queryFn: () => stakeholderService.getStakeholders(companyId),
    enabled: !!companyId,
  });

  const createMut = useMutation({
    mutationFn: (d) => stakeholderService.createStakeholder({ ...d, companyId }),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
      setModal({ open: false, editing: null });
      setSuccessMessage('Stakeholder added successfully');
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to create stakeholder');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => stakeholderService.updateStakeholder(id, d),
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
      setModal({ open: false, editing: null });
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to update stakeholder');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => stakeholderService.deleteStakeholder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stakeholders'] });
      setDeleteId(null);
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to delete stakeholder');
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors(emptyErrors);
    setMutationError(null);
    setModal({ open: true, editing: null });
  };

  const openEdit = (row) => {
    setForm({
      name: row.name || '',
      email: row.email || '',
      type: row.type || 'Individual',
      role: row.role || '',
      ownershipPercentage: row.ownershipPercentage || '',
    });
    setFormErrors(emptyErrors);
    setMutationError(null);
    setModal({ open: true, editing: row });
  };

  const validateForm = () => {
    const errors = { name: '', email: '' };
    let valid = true;
    if (!form.name.trim()) {
      errors.name = 'Name is required';
      valid = false;
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required';
      valid = false;
    }
    setFormErrors(errors);
    return valid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (modal.editing) {
      updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form });
    } else {
      createMut.mutate(form);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Stakeholders</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add Stakeholder
        </button>
      </div>

      {successMessage && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          error={error?.message}
          onRetry={refetch}
          emptyMessage="No stakeholders yet"
        />
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => { setModal({ open: false, editing: null }); setMutationError(null); setFormErrors(emptyErrors); }}
        title={modal.editing ? 'Edit Stakeholder' : 'Add Stakeholder'}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors((prev) => ({ ...prev, name: '' })); }}
              className={`w-full px-3 py-2 border rounded-md ${formErrors.name ? 'border-red-400' : ''}`}
            />
            {formErrors.name && <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormErrors((prev) => ({ ...prev, email: '' })); }}
              className={`w-full px-3 py-2 border rounded-md ${formErrors.email ? 'border-red-400' : ''}`}
            />
            {formErrors.email && <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="Individual">Individual</option>
              <option value="Institution">Institution</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="stakeholder">Stakeholder</option>
              <option value="founder">Founder</option>
              <option value="investor">Investor</option>
              <option value="employee">Employee</option>
              <option value="advisor">Advisor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ownership %</label>
            <input
              type="number"
              step="0.01"
              value={form.ownershipPercentage}
              onChange={(e) => setForm({ ...form, ownershipPercentage: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setModal({ open: false, editing: null }); setMutationError(null); setFormErrors(emptyErrors); }}
              className="px-4 py-2 border rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
            >
              {isPending && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        title="Delete Stakeholder"
        message="Are you sure you want to delete this stakeholder?"
      />
    </div>
  );
}
