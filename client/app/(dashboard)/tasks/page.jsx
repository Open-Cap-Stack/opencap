'use client';

import { useState } from 'react';
import { CheckSquare, Plus, Calendar, User, AlertCircle, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const TABS = ['All', 'My Tasks', 'Assigned to Others', 'Completed'];

const PRIORITIES = ['High', 'Medium', 'Low'];

const PRIORITY_STYLE = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-gray-100 text-gray-600',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

const EMPTY_FORM = { title: '', assignee: '', dueDate: '', priority: 'Medium' };

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const qc = useQueryClient();

  // Current user (read from localStorage for filter — same pattern as rest of app)
  const currentUser = (() => {
    try {
      const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })();
  const currentEmail = currentUser?.email ?? '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      try {
        const res = await api.get('/tasks');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const completeMut = useMutation({
    mutationFn: ({ id, completed }) => api.put(`/tasks/${id}`, { completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
    onError: (err) => alert(err.response?.data?.message || 'Failed to update task'),
  });

  const createMut = useMutation({
    mutationFn: (body) => api.post('/tasks', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFormError('');
    },
    onError: (err) => setFormError(err.response?.data?.message || 'Failed to create task'),
  });

  const tasks = data ?? [];

  const filtered = tasks.filter((t) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Completed') return t.completed || t.status === 'completed';
    if (activeTab === 'My Tasks') return t.assignee === currentEmail;
    if (activeTab === 'Assigned to Others') return t.assignee && t.assignee !== currentEmail;
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    setFormError('');
    createMut.mutate({
      title: form.title.trim(),
      assignee: form.assignee.trim(),
      dueDate: form.dueDate || null,
      priority: form.priority,
      completed: false,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add task
        </button>
      </div>

      {/* Inline Add Task Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-5 bg-white border border-blue-200 rounded-lg p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                placeholder="Task title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assignee</label>
              <input
                type="text"
                placeholder="Email or name"
                value={form.assignee}
                onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="relative">
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="appearance-none border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {formError && <p className="text-red-500 text-xs">{formError}</p>}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); setForm(EMPTY_FORM); }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isPending}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createMut.isPending ? 'Saving…' : 'Save Task'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
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

      {/* Task List */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
        {isLoading && (
          <div className="p-8 text-center text-gray-500">
            <CheckSquare size={32} className="mx-auto mb-3 text-gray-300 animate-pulse" />
            <p>Loading tasks…</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="p-8 text-center">
            <p className="text-red-500 mb-2">Failed to load tasks</p>
            <button onClick={refetch} className="text-sm text-blue-600 hover:underline">Try again</button>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-12 text-center">
            <CheckSquare size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium text-gray-700">No tasks yet — add one above</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add task" to get started</p>
          </div>
        )}

        {!isLoading && filtered.map((task) => {
          const id = task.id ?? task._id;
          const done = task.completed || task.status === 'completed';
          const overdue = !done && isOverdue(task.dueDate);
          return (
            <div key={id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              {/* Checkbox */}
              <button
                onClick={() => completeMut.mutate({ id, completed: !done })}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-400'
                }`}
                aria-label={done ? 'Mark incomplete' : 'Mark complete'}
              >
                {done && <svg viewBox="0 0 12 10" className="w-3 h-3 text-white fill-none stroke-current stroke-2"><polyline points="1,5 4,9 11,1" /></svg>}
              </button>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                  {task.title}
                </p>
              </div>

              {/* Assignee */}
              {task.assignee && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={12} />
                  <span className="truncate max-w-[120px]">{task.assignee}</span>
                </div>
              )}

              {/* Due date */}
              {task.dueDate && (
                <div className={`hidden md:flex items-center gap-1.5 text-xs ${overdue ? 'text-red-500' : 'text-gray-500'}`}>
                  {overdue && <AlertCircle size={12} />}
                  {!overdue && <Calendar size={12} />}
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}

              {/* Priority badge */}
              {task.priority && (
                <span className={`hidden sm:inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.Low}`}>
                  {task.priority}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
