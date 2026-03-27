'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equityPlanService } from '@/lib/equityPlanService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Plan Name' },
  { key: 'type', label: 'Type' },
  { key: 'totalShares', label: 'Total Shares', render: (v) => v ? Number(v).toLocaleString() : '-' },
  { key: 'status', label: 'Status', render: (v) => <span className={`px-2 py-1 rounded text-xs ${v === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{v || 'draft'}</span> },
  { key: 'actions', label: '' },
];

const emptyForm = { name: '', type: 'stock_option', totalShares: '', status: 'active' };

export default function EquityPlansPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['equityPlans'], queryFn: () => equityPlanService.getEquityPlans() });
  const createMut = useMutation({ mutationFn: (d) => equityPlanService.createEquityPlan(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['equityPlans'] }); setModal({ open: false, editing: null }); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => equityPlanService.updateEquityPlan(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['equityPlans'] }); setModal({ open: false, editing: null }); } });
  const deleteMut = useMutation({ mutationFn: (id) => equityPlanService.deleteEquityPlan(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['equityPlans'] }); setDeleteId(null); } });

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, editing: null }); };
  const openEdit = (row) => { setForm({ name: row.name || '', type: row.type || 'stock_option', totalShares: row.totalShares || '', status: row.status || 'active' }); setModal({ open: true, editing: row }); };
  const handleSubmit = (e) => { e.preventDefault(); modal.editing ? updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form }) : createMut.mutate(form); };

  const rows = (Array.isArray(data) ? data : []).map((r) => ({ ...r, actions: (<div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-blue-600 text-sm hover:underline">Edit</button><button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }} className="text-red-600 text-sm hover:underline">Delete</button></div>) }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Equity Plans</h1><button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Plan</button></div>
      <div className="bg-white rounded-lg shadow"><DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No equity plans" /></div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit Equity Plan' : 'Add Equity Plan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Plan Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="stock_option">Stock Option</option><option value="rsu">RSU</option><option value="espp">ESPP</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Total Shares</label><input type="number" value={form.totalShares} onChange={(e) => setForm({ ...form, totalShares: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="active">Active</option><option value="draft">Draft</option><option value="closed">Closed</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 border rounded-md">Cancel</button><button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Equity Plan" message="This will permanently delete this equity plan." />
    </div>
  );
}
