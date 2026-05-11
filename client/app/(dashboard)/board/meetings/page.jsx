'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';

const STATUS_LABELS = {
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

const columns = [
  { key: 'title', label: 'Title', render: (v) => v || 'Untitled Meeting' },
  {
    key: 'date',
    label: 'Date',
    render: (v) => (v ? new Date(v).toLocaleDateString() : '-'),
  },
  {
    key: 'time',
    label: 'Time',
    render: (v) => v || '-',
  },
  {
    key: 'status',
    label: 'Status',
    render: (v) => {
      const s = STATUS_LABELS[v] || { label: v || 'Scheduled', className: 'bg-gray-100 text-gray-700' };
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>
          {s.label}
        </span>
      );
    },
  },
  {
    key: 'attendees',
    label: 'Attendees',
    render: (v) => {
      const count = Array.isArray(v) ? v.length : (v ?? '-');
      return count;
    },
  },
];

const emptyForm = {
  title: '',
  date: '',
  time: '',
  agenda: '',
  status: 'scheduled',
};

async function fetchMeetings() {
  try {
    const res = await api.get('/board-meetings');
    return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  } catch {
    return [];
  }
}

async function createMeeting(data) {
  const res = await api.post('/board-meetings', data);
  return res.data;
}

export default function MeetingsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['board-meetings'],
    queryFn: fetchMeetings,
  });

  const createMut = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['board-meetings'] });
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => {
      setMutationError(
        err.response?.data?.message || 'Failed to schedule meeting. The endpoint may not be available yet.'
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setMutationError(null);
    createMut.mutate(form);
  };

  const openModal = () => {
    setForm(emptyForm);
    setMutationError(null);
    setModalOpen(true);
  };

  const rows = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Board Meetings</h2>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Schedule Meeting
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          onRetry={refetch}
          emptyMessage="No board meetings scheduled yet"
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setMutationError(null); }}
        title="Schedule Meeting"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Q2 Board Meeting"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Date <span className="text-red-500">*</span></label>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agenda</label>
            <textarea
              rows={4}
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
              placeholder="Enter meeting agenda items..."
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setMutationError(null); }}
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 hover:bg-blue-700"
            >
              {createMut.isPending ? 'Saving...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
