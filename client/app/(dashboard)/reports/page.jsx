'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialReportService } from '@/lib/financialReportService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Report', render: (v, row) => v || row.title || 'Untitled' },
  { key: 'type', label: 'Type' },
  { key: 'period', label: 'Period' },
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'actions', label: '' },
];

const emptyForm = { name: '', type: 'balance_sheet', period: '' };

export default function ReportsPage() {
  const [modal, setModal] = useState({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['reports'], queryFn: () => financialReportService.getReports() });
  const createMut = useMutation({ mutationFn: (d) => financialReportService.createReport(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); setModal({ open: false, editing: null }); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => financialReportService.updateReport(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); setModal({ open: false, editing: null }); } });
  const deleteMut = useMutation({ mutationFn: (id) => financialReportService.deleteReport(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['reports'] }); setDeleteId(null); } });

  const openCreate = () => { setForm(emptyForm); setModal({ open: true, editing: null }); };
  const openEdit = (row) => { setForm({ name: row.name || row.title || '', type: row.type || 'balance_sheet', period: row.period || '' }); setModal({ open: true, editing: row }); };
  const handleSubmit = (e) => { e.preventDefault(); modal.editing ? updateMut.mutate({ id: modal.editing.id || modal.editing._id, ...form }) : createMut.mutate(form); };

  const rows = (Array.isArray(data) ? data : []).map((r) => ({ ...r, actions: (<div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-blue-600 text-sm hover:underline">Edit</button><button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }} className="text-red-600 text-sm hover:underline">Delete</button></div>) }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Financial Reports</h1><button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Report</button></div>
      <div className="bg-white rounded-lg shadow"><DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No reports" /></div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit Report' : 'Create Report'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="balance_sheet">Balance Sheet</option><option value="income_statement">Income Statement</option><option value="cash_flow">Cash Flow</option><option value="cap_table">Cap Table</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Period</label><input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Q1 2026" className="w-full px-3 py-2 border rounded-md" /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 border rounded-md">Cancel</button><button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Report" message="This will permanently delete this report." />
    </div>
  );
}
