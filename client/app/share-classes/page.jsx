'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shareClassService } from '@/lib/shareClassService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Class Name', render: (v, row) => v || row.className || 'Unnamed' },
  { key: 'authorizedShares', label: 'Authorized', render: (v) => v ? Number(v).toLocaleString() : '-' },
  { key: 'pricePerShare', label: 'Price/Share', render: (v) => v ? `$${v}` : '-' },
  { key: 'type', label: 'Type' },
  { key: 'actions', label: '' },
];

const emptyForm = { name: '', authorizedShares: '', pricePerShare: '', type: 'common' };

export default function ShareClassesPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['shareClasses'], queryFn: () => shareClassService.getShareClasses() });
  const createMut = useMutation({ mutationFn: (d) => shareClassService.createShareClass(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['shareClasses'] }); setModal({ open: false, editing: null }); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => shareClassService.updateShareClass(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['shareClasses'] }); setModal({ open: false, editing: null }); } });
  const deleteMut = useMutation({ mutationFn: (id) => shareClassService.deleteShareClass(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['shareClasses'] }); setDeleteId(null); } });

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, editing: null }); };
  const openEdit = (row) => { setForm({ name: row.name || row.className || '', authorizedShares: row.authorizedShares || '', pricePerShare: row.pricePerShare || '', type: row.type || 'common' }); setModal({ open: true, editing: row }); };
  const handleSubmit = (e) => { e.preventDefault(); modal.editing ? updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form }) : createMut.mutate(form); };

  const rows = (Array.isArray(data) ? data : []).map((r) => ({ ...r, actions: (<div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-blue-600 text-sm hover:underline">Edit</button><button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }} className="text-red-600 text-sm hover:underline">Delete</button></div>) }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Share Classes</h1><button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add Share Class</button></div>
      <div className="bg-white rounded-lg shadow"><DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No share classes" /></div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit Share Class' : 'Add Share Class'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Authorized Shares</label><input type="number" value={form.authorizedShares} onChange={(e) => setForm({ ...form, authorizedShares: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Price per Share</label><input type="number" step="0.01" value={form.pricePerShare} onChange={(e) => setForm({ ...form, pricePerShare: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="common">Common</option><option value="preferred">Preferred</option><option value="convertible">Convertible</option></select></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 border rounded-md">Cancel</button><button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Share Class" message="Are you sure?" />
    </div>
  );
}
