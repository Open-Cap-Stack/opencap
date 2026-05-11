'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

// ─── formatters ───────────────────────────────────────────────────────────────

function formatCurrency(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function formatPct(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  return `${num.toFixed(1)}%`;
}

// ─── asset types ──────────────────────────────────────────────────────────────

const ASSET_TYPES = ['IP', 'Equipment', 'Real Estate', 'Other'];

const TYPE_COLORS = {
  IP: 'bg-purple-100 text-purple-800',
  Equipment: 'bg-blue-100 text-blue-800',
  'Real Estate': 'bg-green-100 text-green-800',
  Other: 'bg-gray-100 text-gray-700',
};

function AssetTypeBadge({ type }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] || TYPE_COLORS.Other}`}>
      {type || 'Other'}
    </span>
  );
}

// ─── primitives ───────────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  );
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
      {message}
    </div>
  );
}

function Spinner({ className = 'h-5 w-5 text-white' }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── depreciation helper (straight-line) ─────────────────────────────────────

function calcDepreciation(cost, acquisitionDate, usefulLifeYears = 5) {
  if (!cost || !acquisitionDate) return null;
  const acquired = new Date(acquisitionDate);
  const now = new Date();
  const yearsHeld = (now - acquired) / (1000 * 60 * 60 * 24 * 365.25);
  const annualDep = Number(cost) / usefulLifeYears;
  const accumulated = Math.min(annualDep * yearsHeld, Number(cost));
  const bookValue = Math.max(Number(cost) - accumulated, 0);
  const depPct = Number(cost) > 0 ? (accumulated / Number(cost)) * 100 : 0;
  return { accumulated, bookValue, depPct };
}

// ─── add asset form ───────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', type: 'IP', acquisitionDate: '', cost: '' };

function AddAssetForm({ onAdd, adding }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [err, setErr] = useState('');

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Asset name is required.'); return; }
    if (!form.cost || Number(form.cost) <= 0) { setErr('Enter a valid cost.'); return; }
    onAdd(form, () => setForm(EMPTY_FORM));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorBanner message={err} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label required>Asset name</Label>
          <Input type="text" placeholder="e.g. Patent Portfolio" value={form.name} onChange={(e) => setField('name', e.target.value)} />
        </div>
        <div>
          <Label required>Type</Label>
          <Select value={form.type} onChange={(e) => setField('type', e.target.value)}>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div>
          <Label>Acquisition date</Label>
          <Input type="date" value={form.acquisitionDate} onChange={(e) => setField('acquisitionDate', e.target.value)} />
        </div>
        <div>
          <Label required>Cost ($)</Label>
          <Input type="number" min="0" step="any" placeholder="e.g. 50000" value={form.cost} onChange={(e) => setField('cost', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {adding && <Spinner />}
          {adding ? 'Adding...' : 'Add asset'}
        </button>
      </div>
    </form>
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">No assets recorded</p>
      <p className="text-xs text-gray-400 max-w-xs">Use the form above to add your first asset to the portfolio.</p>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [apiMode, setApiMode] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/assets');
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setAssets(list.map((a) => ({ ...a, id: a.id || a._id })));
        setApiMode(true);
      } catch {
        // Assets endpoint not available — start with empty
        setAssets([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAdd(form, reset) {
    setAdding(true);
    const dep = calcDepreciation(form.cost, form.acquisitionDate);
    const newAsset = {
      ...form,
      id: `asset_${Date.now()}`,
      currentValue: dep ? dep.bookValue : Number(form.cost),
      depreciation: dep ? dep.depPct : 0,
    };
    try {
      if (apiMode) {
        const res = await api.post('/assets', form);
        newAsset.id = res.data?.id || res.data?._id || newAsset.id;
      }
    } catch {
      // ignore — keep local
    }
    setAssets((p) => [...p, newAsset]);
    reset();
    setShowForm(false);
    setAdding(false);
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      if (apiMode) await api.delete(`/assets/${id}`);
    } catch {
      // ignore
    }
    setAssets((p) => p.filter((a) => a.id !== id));
    setDeleting(null);
  }

  // Summary stats
  const totalValue = assets.reduce((s, a) => s + (Number(a.currentValue || a.cost) || 0), 0);
  const uniqueTypes = new Set(assets.map((a) => a.type).filter(Boolean)).size;

  const HEADERS = ['Name', 'Type', 'Acquired', 'Cost', 'Current Value', 'Depreciation', 'Actions'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Portfolio</h1>
          <p className="text-sm text-gray-500 mt-1">Track company assets, acquisition costs, and depreciation.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add asset
        </button>
      </div>

      <div className="space-y-6">
        {/* Summary cards */}
        {assets.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total asset value" value={formatCurrency(totalValue)} sub="book value (after depreciation)" />
            <StatCard label="Total assets" value={String(assets.length)} />
            <StatCard label="Asset types" value={String(uniqueTypes)} />
          </div>
        )}

        {/* Add asset form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add Asset</h2>
              <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
            <div className="px-6 py-5">
              <AddAssetForm onAdd={handleAdd} adding={adding} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && <ErrorBanner message={error} />}

        {/* Assets table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Assets</h2>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
              <Spinner className="h-5 w-5 text-blue-500" /> Loading assets...
            </div>
          ) : assets.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {HEADERS.map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {assets.map((asset, i) => {
                    const dep = calcDepreciation(asset.cost, asset.acquisitionDate);
                    const currentValue = asset.currentValue ?? (dep ? dep.bookValue : Number(asset.cost));
                    const depPct = asset.depreciation ?? (dep ? dep.depPct : null);

                    return (
                      <tr key={asset.id || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{asset.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap"><AssetTypeBadge type={asset.type} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(asset.acquisitionDate)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatCurrency(asset.cost)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900">{formatCurrency(currentValue)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {depPct !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full" style={{ width: `${Math.min(depPct, 100)}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{formatPct(depPct)}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(asset.id)}
                            disabled={deleting === asset.id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                          >
                            {deleting === asset.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
