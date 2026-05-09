'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { valuationService } from '@/lib/valuationService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Valuation', render: (v, row) => v || row.title || `409A - ${row.valuationDate || 'Draft'}` },
  { key: 'valuationDate', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'fairMarketValue', label: 'FMV', render: (v) => v ? `$${Number(v).toLocaleString()}` : '-' },
  { key: 'status', label: 'Status', render: (v) => <span className={`px-2 py-1 rounded text-xs ${v === 'approved' ? 'bg-green-100 text-green-800' : v === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{v || 'draft'}</span> },
  { key: 'actions', label: '' },
];

const emptyForm = { name: '', valuationDate: '', fairMarketValue: '', provider: '' };

export default function ValuationsPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['valuations'], queryFn: () => valuationService.getValuations() });
  const createMut = useMutation({ mutationFn: (d) => valuationService.createValuation(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['valuations'] }); setModal({ open: false, editing: null }); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => valuationService.updateValuation(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['valuations'] }); setModal({ open: false, editing: null }); } });
  const deleteMut = useMutation({ mutationFn: (id) => valuationService.deleteValuation(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['valuations'] }); setDeleteId(null); } });

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, editing: null }); };
  const openEdit = (row) => { setForm({ name: row.name || '', valuationDate: row.valuationDate?.split('T')[0] || '', fairMarketValue: row.fairMarketValue || '', provider: row.provider || '' }); setModal({ open: true, editing: row }); };
  const handleSubmit = (e) => { e.preventDefault(); modal.editing ? updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form }) : createMut.mutate(form); };

  const rows = (Array.isArray(data) ? data : []).map((r) => ({ ...r, actions: (<div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-blue-600 text-sm hover:underline">Edit</button><button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }} className="text-red-600 text-sm hover:underline">Delete</button></div>) }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">409A Valuations</h1><button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Request Valuation</button></div>
      <div className="bg-white rounded-lg shadow"><DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No valuations" /></div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit Valuation' : 'Request 409A Valuation'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Valuation Date</label><input type="date" value={form.valuationDate} onChange={(e) => setForm({ ...form, valuationDate: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Fair Market Value</label><input type="number" step="0.01" value={form.fairMarketValue} onChange={(e) => setForm({ ...form, fairMarketValue: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Provider</label><input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g., Carta, Shoobx" className="w-full px-3 py-2 border rounded-md" /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 border rounded-md">Cancel</button><button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Valuation" message="This will permanently delete this valuation record." />
    </div>
  );
}
