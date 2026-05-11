'use client';

import { useState } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Activity, Check } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const TABS = ['All', 'Unread', 'System', 'Activity'];

const TYPE_META = {
  system:   { icon: Info,          color: 'text-blue-500',   bg: 'bg-blue-50' },
  alert:    { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50' },
  success:  { icon: CheckCircle,   color: 'text-green-500',  bg: 'bg-green-50' },
  activity: { icon: Activity,      color: 'text-purple-500', bg: 'bg-purple-50' },
  default:  { icon: Bell,          color: 'text-gray-500',   bg: 'bg-gray-50' },
};

function typeMeta(type) {
  return TYPE_META[type] ?? TYPE_META.default;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const res = await api.get('/notifications');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const markReadMut = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMut = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data ?? [];

  const filtered = notifications.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.read;
    if (activeTab === 'System') return n.type === 'system' || n.type === 'alert';
    if (activeTab === 'Activity') return n.type === 'activity';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllMut.mutate()}
            disabled={markAllMut.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {isLoading && (
          <div className="p-8 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-3 text-gray-300 animate-pulse" />
            <p>Loading notifications…</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-2">Failed to load notifications</p>
            <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Try again</button>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
            <p className="text-lg font-medium text-gray-700">You're all caught up</p>
            <p className="text-sm text-gray-400 mt-1">No {activeTab !== 'All' ? activeTab.toLowerCase() + ' ' : ''}notifications to show</p>
          </div>
        )}

        {!isLoading && filtered.map((n) => {
          const meta = typeMeta(n.type);
          const Icon = meta.icon;
          return (
            <div
              key={n.id ?? n._id}
              onClick={() => { if (!n.read) markReadMut.mutate(n.id ?? n._id); }}
              className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                n.read ? 'bg-white' : 'bg-blue-50/30'
              } hover:bg-gray-50 cursor-pointer`}
            >
              {/* Type icon */}
              <div className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center`}>
                <Icon size={18} className={meta.color} />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                  {n.title ?? n.message ?? 'Notification'}
                </p>
                {n.title && n.message && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt ?? n.timestamp)}</p>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <div className="flex-shrink-0 mt-2 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
