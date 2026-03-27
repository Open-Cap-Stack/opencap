'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import DataTable from '@/components/ui/DataTable';

const columns = [
  { key: 'name', label: 'Security', render: (v, row) => v || row.securityType || 'Unnamed' },
  { key: 'securityType', label: 'Type' },
  { key: 'shares', label: 'Shares', render: (v) => v ? Number(v).toLocaleString() : '-' },
  { key: 'status', label: 'Status', render: (v) => <span className={`px-2 py-1 rounded text-xs ${v === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{v || 'pending'}</span> },
  { key: 'issuedDate', label: 'Issued', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
];

export default function SecuritiesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['securities'],
    queryFn: async () => { const { data } = await api.get('/security-issuances'); return data; },
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-bold">Securities</h1></div>
      <div className="bg-white rounded-lg shadow"><DataTable columns={columns} data={rows} isLoading={isLoading} error={error?.message} onRetry={refetch} emptyMessage="No securities issued" /></div>
    </div>
  );
}
