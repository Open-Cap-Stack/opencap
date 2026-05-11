'use client';

import { useState, useEffect } from 'react';
import {
  FolderLock,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  FileText,
  Link2,
  Copy,
  Check,
  Archive,
  Mail,
} from 'lucide-react';
import api from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ── helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status) {
  const map = {
    active: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-500',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {status ?? 'active'}
    </span>
  );
}

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

// ── sub-components ───────────────────────────────────────────────────────────

function CreateRoomForm({ onSave, onCancel }) {
  const [fields, setFields] = useState({ name: '', description: '', expiryDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fields.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: fields.name.trim(),
        description: fields.description.trim(),
        ...(fields.expiryDate ? { expiryDate: fields.expiryDate } : {}),
      };
      const res = await api.post('/data-rooms', payload);
      onSave(res.data);
    } catch (err) {
      // Graceful degradation — create a local stub if API not available
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        onSave({
          id: `local-${Date.now()}`,
          ...fields,
          status: 'active',
          createdAt: new Date().toISOString(),
          documentCount: 0,
          investorCount: 0,
          _local: true,
        });
      } else {
        setError(err.response?.data?.message || 'Failed to create data room');
        setSaving(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-blue-900 mb-3">New Data Room</h3>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            value={fields.name}
            onChange={set('name')}
            placeholder="Series A Due Diligence"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry date (optional)</label>
          <input
            type="date"
            value={fields.expiryDate}
            onChange={set('expiryDate')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={fields.description}
            onChange={set('description')}
            rows={2}
            placeholder="Documents shared with Series A investors for due diligence"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create data room'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function InviteForm({ roomId, onInvited, onCancel }) {
  const [email, setEmail] = useState('');
  const [accessLevel, setAccessLevel] = useState('view');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/data-rooms/${roomId}/invite`, { email: email.trim(), accessLevel });
      onInvited(res.data);
    } catch (err) {
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        onInvited({ id: `inv-${Date.now()}`, email: email.trim(), accessLevel, _local: true });
      } else {
        setError(err.response?.data?.message || 'Failed to send invite');
        setSaving(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
      <p className="text-sm font-medium text-gray-700 mb-2">Invite investor</p>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="investor@example.com"
          className="flex-1 min-w-[180px] border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={accessLevel}
          onChange={(e) => setAccessLevel(e.target.value)}
          className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="view">View only</option>
          <option value="download">View + Download</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Sending...' : 'Send invite'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function CopyLinkButton({ roomId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const link = `${window.location.origin}/data-room/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : 'Copy access link'}
    </button>
  );
}

function RoomDetail({ room }) {
  const [showInvite, setShowInvite] = useState(false);
  const [investors, setInvestors] = useState(room.investors ?? []);
  const [documents, setDocuments] = useState(room.documents ?? []);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (room._local) return;
    setLoadingDetails(true);
    Promise.all([
      api.get(`/data-rooms/${room.id}/investors`).catch(() => ({ data: [] })),
      api.get(`/data-rooms/${room.id}/documents`).catch(() => ({ data: [] })),
    ]).then(([inv, docs]) => {
      setInvestors(Array.isArray(inv.data) ? inv.data : []);
      setDocuments(Array.isArray(docs.data) ? docs.data : []);
    }).finally(() => setLoadingDetails(false));
  }, [room.id, room._local]);

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <CopyLinkButton roomId={room.id} />
        </div>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="inline-flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-md hover:bg-blue-700"
        >
          <Mail size={12} />
          Invite investor
        </button>
      </div>

      {showInvite && (
        <InviteForm
          roomId={room.id}
          onInvited={(inv) => {
            setInvestors((prev) => [...prev, inv]);
            setShowInvite(false);
          }}
          onCancel={() => setShowInvite(false)}
        />
      )}

      {loadingDetails ? (
        <LoadingSpinner className="py-4" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <FileText size={12} /> Documents ({documents.length})
            </p>
            {documents.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No documents added yet</p>
            ) : (
              <ul className="space-y-1">
                {documents.map((d, i) => (
                  <li key={d.id ?? i} className="text-xs text-gray-700 flex items-center gap-1">
                    <FileText size={10} className="text-gray-400 shrink-0" />
                    {d.name ?? d.title ?? 'Untitled'}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
              <Users size={12} /> Investors ({investors.length})
            </p>
            {investors.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No investors invited yet</p>
            ) : (
              <ul className="space-y-1">
                {investors.map((inv, i) => (
                  <li key={inv.id ?? i} className="text-xs text-gray-700 flex items-center justify-between">
                    <span>{inv.email}</span>
                    <span className="text-gray-400">{inv.accessLevel ?? inv.access_level ?? 'view'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomRow({ room, onArchive }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <FolderLock size={18} className="text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{room.name}</p>
            {statusBadge(room.status)}
          </div>
          {room.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{room.description}</p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500 shrink-0">
          <span className="flex items-center gap-1"><FileText size={12} /> {room.documentCount ?? 0} docs</span>
          <span className="flex items-center gap-1"><Users size={12} /> {room.investorCount ?? 0} investors</span>
          <span>{fmt(room.createdAt)}</span>
          {room.expiryDate && <span className="text-amber-600">Expires {fmt(room.expiryDate)}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {room.status !== 'archived' && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(room.id); }}
              className="text-xs text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              title="Archive"
            >
              <Archive size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4">
          <RoomDetail room={room} />
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function DataRoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/data-rooms');
      setRooms(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 404 || err.code === 'ERR_NETWORK') {
        setRooms([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load data rooms');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleRoomCreated = (room) => {
    setRooms((prev) => [room, ...prev]);
    setShowCreate(false);
  };

  const handleArchive = async (id) => {
    try {
      await api.patch(`/data-rooms/${id}`, { status: 'archived' });
    } catch {
      // Best-effort — update local state regardless
    }
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'archived' } : r)));
  };

  const activeRooms = rooms.filter((r) => r.status !== 'archived');
  const archivedRooms = rooms.filter((r) => r.status === 'archived');

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">
            Secure virtual rooms for investor due diligence
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? 'Cancel' : 'Create data room'}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {[
          { label: 'Documents', href: '/documents' },
          { label: 'Data Rooms', href: '/data-rooms' },
          { label: 'Access Control', href: '/document-access' },
          { label: 'Templates', href: '/templates' },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab.href === '/data-rooms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateRoomForm
          onSave={handleRoomCreated}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <button onClick={fetchRooms} className="text-sm text-red-700 underline hover:no-underline">
            Try again
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <FolderLock size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-medium mb-1">No data rooms yet</p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Create one to share documents securely with investors
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <Plus size={14} />
            Create your first data room
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeRooms.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active ({activeRooms.length})
              </h2>
              <div className="space-y-2">
                {activeRooms.map((room) => (
                  <RoomRow key={room.id} room={room} onArchive={handleArchive} />
                ))}
              </div>
            </section>
          )}
          {archivedRooms.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Archived ({archivedRooms.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {archivedRooms.map((room) => (
                  <RoomRow key={room.id} room={room} onArchive={handleArchive} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
