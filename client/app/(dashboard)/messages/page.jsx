'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Plus, X, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Avatar colour based on name hash
const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-amber-500', 'bg-rose-500', 'bg-teal-500',
];
function avatarColor(name = '') {
  const code = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ── Sample data (shown when API returns nothing) ───────────────────────────────

const SAMPLE_CONVERSATIONS = [
  {
    id: 'sample-1',
    name: 'Alex Johnson',
    preview: 'Can you review the cap table update before the board meeting?',
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    unread: 2,
    messages: [
      { id: 'm1', from: 'Alex Johnson', text: 'Hey! Do you have a minute to chat?', ts: new Date(Date.now() - 20 * 60000).toISOString(), sent: false },
      { id: 'm2', from: 'me', text: "Sure, what's up?", ts: new Date(Date.now() - 18 * 60000).toISOString(), sent: true },
      { id: 'm3', from: 'Alex Johnson', text: 'Can you review the cap table update before the board meeting?', ts: new Date(Date.now() - 3 * 60000).toISOString(), sent: false },
    ],
  },
  {
    id: 'sample-2',
    name: 'Maria Garcia',
    preview: 'The 409A valuation report is ready for your signature.',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    unread: 0,
    messages: [
      { id: 'm4', from: 'Maria Garcia', text: 'Hi, the 409A valuation report is ready for your signature.', ts: new Date(Date.now() - 2 * 3600000).toISOString(), sent: false },
      { id: 'm5', from: 'me', text: "Thanks! I'll take a look this afternoon.", ts: new Date(Date.now() - 90 * 60000).toISOString(), sent: true },
    ],
  },
  {
    id: 'sample-3',
    name: 'Finance Team',
    preview: 'Q2 equity report has been uploaded to Documents.',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    unread: 0,
    messages: [
      { id: 'm6', from: 'Finance Team', text: 'Q2 equity report has been uploaded to Documents.', ts: new Date(Date.now() - 86400000).toISOString(), sent: false },
    ],
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`flex-shrink-0 ${sizeClass} rounded-full ${avatarColor(name)} flex items-center justify-center text-white font-semibold`}>
      {initials(name)}
    </div>
  );
}

function ConversationItem({ conv, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50' : ''}`}
    >
      <Avatar name={conv.name} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <span className={`text-sm truncate ${conv.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{conv.name}</span>
          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{timeAgo(conv.timestamp)}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.preview}</p>
      </div>
      {conv.unread > 0 && (
        <span className="flex-shrink-0 mt-0.5 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
          {conv.unread}
        </span>
      )}
    </button>
  );
}

function MessageBubble({ msg }) {
  return (
    <div className={`flex ${msg.sent ? 'justify-end' : 'justify-start'} mb-3`}>
      {!msg.sent && (
        <Avatar name={msg.from} size="sm" />
      )}
      <div className={`mx-2 max-w-[70%]`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          msg.sent
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}>
          {msg.text}
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${msg.sent ? 'text-right' : 'text-left'}`}>
          {timeAgo(msg.ts)}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState(null);
  const [showThread, setShowThread] = useState(false); // mobile toggle
  const [newMsg, setNewMsg] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeMsg, setComposeMsg] = useState('');
  const [isSample, setIsSample] = useState(false);
  const bottomRef = useRef(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      try {
        const res = await api.get('/messages');
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        if (list.length === 0) {
          setIsSample(true);
          return SAMPLE_CONVERSATIONS;
        }
        setIsSample(false);
        return list;
      } catch {
        setIsSample(true);
        return SAMPLE_CONVERSATIONS;
      }
    },
  });

  const conversations = data ?? [];
  const selected = conversations.find((c) => (c.id ?? c._id) === selectedId);

  // Auto-select first on load (desktop)
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id ?? conversations[0]._id);
    }
  }, [conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, selected?.messages?.length]);

  const sendMut = useMutation({
    mutationFn: (body) => api.post('/messages', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      setNewMsg('');
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to send message'),
  });

  const composeMut = useMutation({
    mutationFn: (body) => api.post('/messages', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      setShowCompose(false);
      setComposeTo('');
      setComposeMsg('');
    },
    onError: (err) => alert(err.response?.data?.message || 'Failed to send message'),
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !selected) return;
    if (isSample) {
      // For sample data, just clear the input
      setNewMsg('');
      return;
    }
    sendMut.mutate({ conversationId: selectedId, text: newMsg.trim() });
  };

  const handleCompose = (e) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeMsg.trim()) return;
    if (isSample) {
      setShowCompose(false);
      setComposeTo('');
      setComposeMsg('');
      return;
    }
    composeMut.mutate({ to: composeTo.trim(), text: composeMsg.trim() });
  };

  const handleSelectConv = (id) => {
    setSelectedId(id);
    setShowThread(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New message
        </button>
      </div>

      {/* Sample data banner */}
      {isSample && (
        <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
          <strong>Sample — connect your API</strong> — showing preview conversations. Wire up <code className="bg-amber-100 px-1 rounded">/api/v1/messages</code> to load real data.
        </div>
      )}

      {/* Two-column layout */}
      <div className="bg-white rounded-lg shadow flex overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: 400 }}>
        {/* Conversation list — hidden on mobile when thread is open */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${showThread ? 'hidden md:flex' : 'flex'}`}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-600">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
            )}
            {!isLoading && conversations.length === 0 && (
              <div className="p-8 text-center">
                <MessageSquare size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No messages yet</p>
              </div>
            )}
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id ?? conv._id}
                conv={conv}
                isActive={(conv.id ?? conv._id) === selectedId}
                onClick={() => handleSelectConv(conv.id ?? conv._id)}
              />
            ))}
          </div>
        </div>

        {/* Message thread — full width on mobile when open */}
        <div className={`flex-1 flex flex-col ${showThread ? 'flex' : 'hidden md:flex'}`}>
          {selected ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                {/* Back button (mobile) */}
                <button
                  onClick={() => setShowThread(false)}
                  className="md:hidden p-1 -ml-1 text-gray-500 hover:text-gray-700"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft size={20} />
                </button>
                <Avatar name={selected.name} size="sm" />
                <span className="font-semibold text-sm text-gray-900">{selected.name}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {(selected.messages ?? []).map((msg) => (
                  <MessageBubble key={msg.id ?? msg._id} msg={msg} />
                ))}
                {(!selected.messages || selected.messages.length === 0) && (
                  <p className="text-center text-sm text-gray-400 mt-10">No messages in this conversation yet.</p>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Send input */}
              <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="submit"
                  disabled={!newMsg.trim() || sendMut.isPending}
                  className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  aria-label="Send"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageSquare size={40} className="mb-3 text-gray-200" />
              <p className="text-sm">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New message</h2>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCompose} className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                <input
                  type="text"
                  placeholder="Name or email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                <textarea
                  rows={4}
                  placeholder="Write your message…"
                  value={composeMsg}
                  onChange={(e) => setComposeMsg(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!composeTo.trim() || !composeMsg.trim() || composeMut.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send size={14} />
                  {composeMut.isPending ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
