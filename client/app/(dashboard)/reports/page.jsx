'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialReportService } from '@/lib/financialReportService';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Wrench, Users2, BookOpen } from 'lucide-react';

const TABS = [
  { id: 'library', label: 'Report Library' },
  { id: 'custom', label: 'Custom Builder' },
  { id: 'investor', label: 'Investor Reports' },
];

const columns = [
  { key: 'name', label: 'Report', render: (v, row) => v || row.title || 'Untitled' },
  { key: 'type', label: 'Type' },
  { key: 'period', label: 'Period' },
  { key: 'createdAt', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'actions', label: '' },
];

const emptyForm = { name: '', type: 'balance_sheet', period: '' };

function ReportLibrary() {
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
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
          Create Report
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No reports" />
      </div>
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, editing: null })} title={modal.editing ? 'Edit Report' : 'Create Report'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-md" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-md"><option value="balance_sheet">Balance Sheet</option><option value="income_statement">Income Statement</option><option value="cash_flow">Cash Flow</option><option value="cap_table">Cap Table</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Period</label><input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Q1 2026" className="w-full px-3 py-2 border rounded-md" /></div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal({ open: false, editing: null })} className="px-4 py-2 border rounded-md">Cancel</button><button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50">Save</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Report" message="This will permanently delete this report." />
    </>
  );
}

function CustomBuilderTab() {
  return (
    <div className="bg-white rounded-lg shadow p-10 text-center">
      <Wrench className="w-10 h-10 mx-auto mb-4 text-gray-300" />
      <h3 className="text-base font-semibold text-gray-700 mb-2">Custom Report Builder</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Build custom reports by combining sections — stakeholder tables, cap table snapshots, SAFE summaries, and more.
      </p>
      <Link
        href="/reports/custom"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        <Wrench className="w-4 h-4" />
        Open Custom Builder
      </Link>
    </div>
  );
}

function InvestorReportsTab() {
  return (
    <div className="bg-white rounded-lg shadow p-10 text-center">
      <Users2 className="w-10 h-10 mx-auto mb-4 text-gray-300" />
      <h3 className="text-base font-semibold text-gray-700 mb-2">Investor Reports</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Generate 409A valuations, board packets, cap table snapshots, and investor update reports for your stakeholders.
      </p>
      <Link
        href="/reports/investor"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        <Users2 className="w-4 h-4" />
        View Investor Reports
      </Link>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Financial Reports</h1>
      </div>

      {/* Tab nav */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'library' && <ReportLibrary />}
      {activeTab === 'custom' && <CustomBuilderTab />}
      {activeTab === 'investor' && <InvestorReportsTab />}
    </div>
  );
}
