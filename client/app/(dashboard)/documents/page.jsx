'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/lib/documentService';
import DataTable from '@/components/ui/DataTable';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const columns = [
  { key: 'name', label: 'Document', render: (v, row) => v || row.title || row.fileName || 'Untitled' },
  { key: 'type', label: 'Type', render: (v) => v || '-' },
  { key: 'createdAt', label: 'Uploaded', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
  { key: 'size', label: 'Size', render: (v) => v ? `${(v / 1024).toFixed(1)} KB` : '-' },
  { key: '_actions', label: '', render: (_, row) => row._actions },
];

export default function DocumentsPage() {
  const [deleteId, setDeleteId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['documents'], queryFn: () => documentService.getDocuments() });
  const deleteMut = useMutation({
    mutationFn: (id) => documentService.deleteDocument(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); setDeleteId(null); },
    onError: (err) => { alert(err.response?.data?.message || 'Failed to delete document'); },
  });

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      await documentService.uploadDocument(formData);
      qc.invalidateQueries({ queryKey: ['documents'] });
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    ...r,
    _actions: (<button onClick={(e) => { e.stopPropagation(); setDeleteId(r.id || r._id); }} className="text-red-600 text-sm hover:underline">Delete</button>),
  }));

  const docTabs = [
    { label: 'Documents', href: '/documents' },
    { label: 'Data Rooms', href: '/data-rooms' },
    { label: 'Access Control', href: '/document-access' },
    { label: 'Templates', href: '/templates' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div>
          <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" id="file-upload" />
          <label
            htmlFor="file-upload"
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </label>
        </div>
      </div>

      {/* Section tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {docTabs.map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab.href === '/documents'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No documents uploaded" />
      </div>
      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => deleteMut.mutate(deleteId)} title="Delete Document" message="Are you sure you want to delete this document?" />
    </div>
  );
}
