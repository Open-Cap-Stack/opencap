'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  FolderOpen,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';

const EXPORT_ACTIONS = [
  {
    id: 'cap-table-csv',
    label: 'Export Cap Table (CSV)',
    icon: FileSpreadsheet,
    endpoint: '/exports/cap-table',
    params: { format: 'csv' },
    filename: 'cap-table.csv',
    mime: 'text/csv',
  },
  {
    id: 'cap-table-xlsx',
    label: 'Export Cap Table (Excel)',
    icon: FileSpreadsheet,
    endpoint: '/exports/cap-table',
    params: { format: 'xlsx' },
    filename: 'cap-table.xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  {
    id: 'stakeholders-csv',
    label: 'Export Stakeholders (CSV)',
    icon: Users,
    endpoint: '/exports/stakeholders',
    params: { format: 'csv' },
    filename: 'stakeholders.csv',
    mime: 'text/csv',
  },
  {
    id: 'documents-csv',
    label: 'Export Documents Index (CSV)',
    icon: FolderOpen,
    endpoint: '/exports/documents',
    params: { format: 'csv' },
    filename: 'documents-index.csv',
    mime: 'text/csv',
  },
];

function StatusBadge({ status }) {
  const map = {
    completed: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Completed' },
    pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Pending' },
    failed: { icon: AlertCircle, color: 'text-red-600 bg-red-50', label: 'Failed' },
  };
  const cfg = map[status] || map.completed;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function ExportsPage() {
  const [downloading, setDownloading] = useState({});
  const [downloadError, setDownloadError] = useState({});
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await api.get('/exports');
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setHistory(data);
      } catch {
        // Endpoint may not exist yet — show empty state
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const triggerDownload = async (action) => {
    setDownloading((prev) => ({ ...prev, [action.id]: true }));
    setDownloadError((prev) => ({ ...prev, [action.id]: null }));

    try {
      const res = await api.get(action.endpoint, {
        params: action.params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: action.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = action.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`${action.label} downloaded successfully.`);
    } catch (err) {
      const msg =
        err?.response?.status === 404
          ? 'Export endpoint not available yet.'
          : err?.response?.data?.message || 'Download failed. Please try again.';
      setDownloadError((prev) => ({ ...prev, [action.id]: msg }));
      showToast(msg, 'error');
    } finally {
      setDownloading((prev) => ({ ...prev, [action.id]: false }));
    }
  };

  const downloadHistoryFile = async (item) => {
    const url = item.downloadUrl || item.url || item.fileUrl;
    if (!url) return;
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = item.fileName || item.name || 'export';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      showToast('Could not download this file.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 border rounded-lg px-4 py-3 shadow-md text-sm max-w-xs ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      <h1 className="text-2xl font-bold">Data Exports</h1>

      {/* Export buttons */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-base font-semibold mb-4">Generate exports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXPORT_ACTIONS.map((action) => {
            const Icon = action.icon;
            const isLoading = downloading[action.id];
            const err = downloadError[action.id];
            return (
              <div key={action.id}>
                <button
                  type="button"
                  onClick={() => triggerDownload(action)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="flex-1">{action.label}</span>
                  {!isLoading && <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {err && (
                  <p className="text-xs text-red-600 mt-1 ml-1">{err}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Export history */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">Export history</h2>
        </div>

        {historyLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!historyLoading && history.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No exports yet. Generate your first export above.</p>
          </div>
        )}

        {!historyLoading && history.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                  <th className="px-6 py-3">File name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((item, idx) => (
                  <tr key={item.id || item._id || idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-[180px]">
                      {item.fileName || item.name || 'Export'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {item.type || item.format || '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatBytes(item.size || item.fileSize)}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={item.status || 'completed'} />
                    </td>
                    <td className="px-6 py-3">
                      {(item.downloadUrl || item.url || item.fileUrl) && (
                        <button
                          type="button"
                          onClick={() => downloadHistoryFile(item)}
                          className="text-blue-600 hover:text-blue-700 hover:underline text-xs font-medium"
                        >
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
