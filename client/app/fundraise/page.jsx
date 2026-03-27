'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fundraisingService } from '@/lib/fundraisingService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Round Name' },
  { key: 'type', label: 'Type' },
  { key: 'targetAmount', label: 'Target', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'amountRaised', label: 'Raised', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'status', label: 'Status', render: (v) => <span className={`px-2 py-1 rounded text-xs ${v === 'open' ? 'bg-green-100 text-green-800' : v === 'closed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{v || 'draft'}</span> },
  { key: 'actions', label: '' },
];

const emptyForm = { name: '', type: 'seed', targetAmount: '', status: 'open' };

export default function FundraisePage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['fundraising'], queryFn: () => fundraisingService.getRounds() });
  const createMut = useMutation({ mutationFn: (d) => fundraisingService.createRound(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fundraising'] }); setModal({ open: false, editing: null }); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => fundraisingService.updateRound(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fundraising'] }); setModal({ open: false, editing: null }); } });
  const deleteMut = useMutation({ mutationFn: (id) => fundraisingService.deleteRound(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['fundraising'] }); setDeleteId(null); } });

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, editing: null }); };
  const openEdit = (row) => { setForm({ name: row.name || '', type: row.type || 'seed', targetAmount: row.targetAmount || '', status: row.status || 'open' }); setModal({ open: true, editing: row }); };
  const handleSubmit = (e) => { e.preventDefault(); modal.editing ? updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form }) : createMut.mutate(form); };

  const rows = (Array.isArray(data) ? data : []).map((r) => ({ ...r, actions: (<div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-blue-600 text-sm hover:underline">Edit</button><button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }} className="text-red-600 text-sm hover:underline">Delete</button></div>) }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Fundraising Rounds</h1><button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Round</button></div>
      <div className="bg-white rounded-lg shadow"><DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No fundraising rounds" /></div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit Round' : 'Add Round'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Round Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="seed">Seed</option><option value="series_a">Series A</option><option value="series_b">Series B</option><option value="bridge">Bridge</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Target Amount</label><input type="number" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="open">Open</option><option value="closed">Closed</option><option value="draft">Draft</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 border rounded-md">Cancel</button><button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Round" message="This will permanently delete this fundraising round." />
    </div>
  );
}
