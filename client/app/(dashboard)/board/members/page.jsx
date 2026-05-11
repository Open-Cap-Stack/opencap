'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';

const ROLES = ['Chairman', 'Director', 'Observer', 'Lead Director', 'Independent Director'];

const ROLE_STYLES = {
  Chairman: 'bg-purple-100 text-purple-700',
  Director: 'bg-blue-100 text-blue-700',
  Observer: 'bg-gray-100 text-gray-600',
  'Lead Director': 'bg-indigo-100 text-indigo-700',
  'Independent Director': 'bg-teal-100 text-teal-700',
};

const emptyForm = {
  name: '',
  email: '',
  role: 'Director',
  appointedDate: '',
};

async function fetchBoardMembers() {
  // Try stakeholders with board type first, fall back to shareholders
  const attempts = [
    () => api.get('/stakeholders', { params: { type: 'board' } }),
    () => api.get('/shareholders', { params: { type: 'board' } }),
  ];

  for (const attempt of attempts) {
    try {
      const res = await attempt();
      const items = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      // Filter for board-relevant roles if we got a broad list
      if (items.length > 0) {
        const boardRoles = ['Chairman', 'Director', 'Observer', 'Lead Director', 'Independent Director', 'board'];
        const boardItems = items.filter((s) =>
          boardRoles.some((r) => (s.role || '').toLowerCase().includes(r.toLowerCase()))
        );
        // Return filtered if we found any, otherwise return all (specific endpoint)
        return boardItems.length > 0 ? boardItems : items;
      }
    } catch {
      // Try next
    }
  }
  return [];
}

async function createBoardMember(data) {
  const res = await api.post('/stakeholders', { ...data, type: 'board' });
  return res.data;
}

function MemberCard({ member }) {
  const role = member.role || 'Director';
  const roleStyle = ROLE_STYLES[role] || 'bg-gray-100 text-gray-600';
  const name = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unknown';
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-start gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle}`}>
            {role}
          </span>
        </div>
        {member.email && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{member.email}</p>
        )}
        {member.appointedDate && (
          <p className="text-xs text-gray-400 mt-0.5">
            Appointed {new Date(member.appointedDate).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BoardMembersPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['board-members'],
    queryFn: fetchBoardMembers,
  });

  const createMut = useMutation({
    mutationFn: createBoardMember,
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['board-members'] });
      setModalOpen(false);
      setForm(emptyForm);
    },
    onError: (err) => {
      setMutationError(err.response?.data?.message || 'Failed to add board member.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setMutationError(null);
    createMut.mutate(form);
  };

  const members = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Board Members</h2>
        <button
          onClick={() => { setForm(emptyForm); setMutationError(null); setModalOpen(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
        >
          Add Board Member
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-500 text-sm">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-lg shadow px-4 py-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">No board members yet</p>
          <p className="text-gray-400 text-xs mt-1">Add directors, observers, and other board members.</p>
          <button
            onClick={() => { setForm(emptyForm); setMutationError(null); setModalOpen(true); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Add Board Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m, i) => (
            <MemberCard key={m.id || m._id || i} member={m} />
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setMutationError(null); }}
        title="Add Board Member"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {mutationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {mutationError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Jane Smith"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@example.com"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role <span className="text-red-500">*</span></label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Appointed Date</label>
            <input
              type="date"
              value={form.appointedDate}
              onChange={(e) => setForm({ ...form, appointedDate: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              {createMut.isPending ? 'Saving...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
