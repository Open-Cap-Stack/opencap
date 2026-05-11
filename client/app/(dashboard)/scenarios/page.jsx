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

function formatNumber(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  return num.toLocaleString('en-US');
}

function formatPct(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  return `${num.toFixed(2)}%`;
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_KEY = 'ocs_scenarios';

function loadFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLS(scenarios) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(scenarios));
  } catch {
    // ignore quota errors
  }
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

function EmptyState({ heading, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{heading}</p>
      <p className="text-xs text-gray-400 max-w-xs">{body}</p>
    </div>
  );
}

// ─── waterfall calculation ────────────────────────────────────────────────────

function computeWaterfall(shareholders, shareClasses, exitValuation) {
  const val = Number(exitValuation) || 0;
  if (!val || !shareholders.length) return [];

  // Build a map from shareClassId -> shareClass data
  const scMap = {};
  shareClasses.forEach((sc) => {
    const id = sc.id || sc._id || sc.name;
    scMap[id] = sc;
  });

  // Group shareholders by share class
  const totalShares = shareholders.reduce((sum, sh) => sum + (Number(sh.sharesOwned) || 0), 0);
  if (!totalShares) return [];

  let remaining = val;
  const rows = [];

  // First pass: liquidation preferences (preferred first)
  const preferred = shareholders.filter((sh) => {
    const sc = scMap[sh.shareClassId] || scMap[sh.shareClass] || {};
    return sc.type === 'preferred' || sc.classType === 'preferred';
  });
  const common = shareholders.filter((sh) => {
    const sc = scMap[sh.shareClassId] || scMap[sh.shareClass] || {};
    return sc.type !== 'preferred' && sc.classType !== 'preferred';
  });

  const processGroup = (group, afterPref) => {
    group.forEach((sh) => {
      const sc = scMap[sh.shareClassId] || scMap[sh.shareClass] || {};
      const shares = Number(sh.sharesOwned) || 0;
      const liquidationPref = afterPref ? 0 : Number(sc.liquidationPreference || sc.liquidation_preference || 0);
      const prefAmount = Math.min(liquidationPref, remaining);
      remaining -= prefAmount;
      const ownershipPct = totalShares > 0 ? (shares / totalShares) * 100 : 0;
      const proRata = remaining > 0 ? (ownershipPct / 100) * remaining : 0;
      const payout = prefAmount + proRata;

      rows.push({
        stakeholder: sh.name || sh.stakeholderName || sh.email || 'Unknown',
        shareClass: sc.name || sc.className || sh.shareClass || sh.shareClassId || 'Common',
        shares,
        liquidationPreference: liquidationPref,
        payout,
        ownershipPct,
      });
    });
  };

  processGroup(preferred, false);
  processGroup(common, true);

  return rows;
}

// ─── exit type badge ──────────────────────────────────────────────────────────

function ExitBadge({ type }) {
  const colors = {
    IPO: 'bg-purple-100 text-purple-800',
    'M&A': 'bg-blue-100 text-blue-800',
    Secondary: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
}

// ─── scenario form ────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', exitType: 'IPO', exitValuation: '', exitDate: '' };

function ScenarioForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [err, setErr] = useState('');

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Scenario name is required.'); return; }
    if (!form.exitValuation || Number(form.exitValuation) <= 0) { setErr('Enter a valid exit valuation.'); return; }
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorBanner message={err} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label required>Scenario name</Label>
          <Input type="text" placeholder="e.g. Base Case IPO 2026" value={form.name} onChange={(e) => setField('name', e.target.value)} />
        </div>
        <div>
          <Label required>Exit type</Label>
          <Select value={form.exitType} onChange={(e) => setField('exitType', e.target.value)}>
            <option value="IPO">IPO</option>
            <option value="M&A">M&A</option>
            <option value="Secondary">Secondary</option>
          </Select>
        </div>
        <div>
          <Label required>Exit valuation ($)</Label>
          <Input type="number" min="1" step="any" placeholder="e.g. 100000000" value={form.exitValuation} onChange={(e) => setField('exitValuation', e.target.value)} />
        </div>
        <div>
          <Label>Exit date</Label>
          <Input type="date" value={form.exitDate} onChange={(e) => setField('exitDate', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving && <Spinner />}
          {saving ? 'Saving...' : 'Save scenario'}
        </button>
      </div>
    </form>
  );
}

// ─── waterfall detail ─────────────────────────────────────────────────────────

function WaterfallDetail({ scenario, shareholders, shareClasses, loading }) {
  const rows = computeWaterfall(shareholders, shareClasses, scenario.exitValuation);
  const totalPayout = rows.reduce((s, r) => s + r.payout, 0);

  const HEADERS = ['Stakeholder', 'Share Class', 'Shares', 'Liq. Preference', 'Payout', 'Ownership %'];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Waterfall Analysis</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {scenario.name} — {formatCurrency(scenario.exitValuation)} {scenario.exitType}
          {scenario.exitDate ? ` — ${formatDate(scenario.exitDate)}` : ''}
        </p>
      </div>
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
            <Spinner className="h-5 w-5 text-blue-500" /> Loading cap table data...
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            heading="No cap table data"
            body="Add shareholders and share classes to compute the waterfall distribution."
          />
        ) : (
          <>
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
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{row.stakeholder}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{row.shareClass}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatNumber(row.shares)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatCurrency(row.liquidationPreference)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-green-700">{formatCurrency(row.payout)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatPct(row.ownershipPct)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-semibold text-gray-900" colSpan={4}>Total</td>
                    <td className="px-4 py-3 font-bold text-green-700">{formatCurrency(totalPayout)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">100.00%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── compare view ─────────────────────────────────────────────────────────────

function CompareView({ scenarios, onClose }) {
  const [aId, setAId] = useState(scenarios[0]?.id || '');
  const [bId, setBId] = useState(scenarios[1]?.id || '');

  const scA = scenarios.find((s) => s.id === aId);
  const scB = scenarios.find((s) => s.id === bId);

  const fields = [
    { label: 'Exit Type', render: (s) => <ExitBadge type={s.exitType} /> },
    { label: 'Exit Valuation', render: (s) => formatCurrency(s.exitValuation) },
    { label: 'Exit Date', render: (s) => formatDate(s.exitDate) },
    { label: 'Last Edited', render: (s) => formatDate(s.lastEdited) },
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Compare Scenarios</h2>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
      </div>
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Scenario A</Label>
            <Select value={aId} onChange={(e) => setAId(e.target.value)}>
              {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div>
            <Label>Scenario B</Label>
            <Select value={bId} onChange={(e) => setBId(e.target.value)}>
              {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
        </div>

        {scA && scB && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 rounded-md overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-blue-600 uppercase tracking-wider">{scA.name}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600 uppercase tracking-wider">{scB.name}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {fields.map((f) => (
                  <tr key={f.label} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{f.label}</td>
                    <td className="px-4 py-3 text-blue-700">{f.render(scA)}</td>
                    <td className="px-4 py-3 text-purple-700">{f.render(scB)}</td>
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

// ─── page ─────────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const [shareholders, setShareholders] = useState([]);
  const [shareClasses, setShareClasses] = useState([]);
  const [capTableLoading, setCapTableLoading] = useState(false);

  const [apiMode, setApiMode] = useState(false); // true if API is available

  // Load scenarios
  useEffect(() => {
    async function init() {
      // Try API first
      try {
        const res = await api.get('/scenarios');
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setScenarios(list.map((s) => ({ ...s, id: s.id || s._id })));
        setApiMode(true);
        return;
      } catch {
        // fall through to localStorage
      }
      setScenarios(loadFromLS());
    }
    init();
  }, []);

  // Load cap table data when a scenario is selected
  useEffect(() => {
    if (!selectedId) return;
    setCapTableLoading(true);
    Promise.all([
      api.get('/shareholders').catch(() => ({ data: [] })),
      api.get('/share-classes').catch(() => ({ data: [] })),
    ]).then(([shRes, scRes]) => {
      const sh = Array.isArray(shRes.data) ? shRes.data : Array.isArray(shRes.data?.data) ? shRes.data.data : [];
      const sc = Array.isArray(scRes.data) ? scRes.data : Array.isArray(scRes.data?.data) ? scRes.data.data : [];
      setShareholders(sh);
      setShareClasses(sc);
    }).finally(() => setCapTableLoading(false));
  }, [selectedId]);

  function persistScenarios(updated) {
    setScenarios(updated);
    if (!apiMode) saveToLS(updated);
  }

  async function handleSave(form) {
    setSaving(true);
    const now = new Date().toISOString();
    try {
      if (editingId) {
        const updated = { ...form, id: editingId, lastEdited: now };
        if (apiMode) {
          await api.put(`/scenarios/${editingId}`, form);
        }
        persistScenarios(scenarios.map((s) => s.id === editingId ? updated : s));
      } else {
        const id = `sc_${Date.now()}`;
        const created = { ...form, id, lastEdited: now };
        if (apiMode) {
          const res = await api.post('/scenarios', form);
          created.id = res.data?.id || res.data?._id || id;
        }
        persistScenarios([...scenarios, created]);
      }
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save scenario:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      if (apiMode) await api.delete(`/scenarios/${id}`);
    } catch {
      // ignore API errors; still remove locally
    }
    persistScenarios(scenarios.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDeleting(null);
  }

  function handleDuplicate(scenario) {
    const now = new Date().toISOString();
    const copy = { ...scenario, id: `sc_${Date.now()}`, name: `${scenario.name} (Copy)`, lastEdited: now };
    const updated = [...scenarios, copy];
    persistScenarios(updated);
    if (apiMode) api.post('/scenarios', copy).catch(() => {});
  }

  function openEdit(scenario) {
    setEditingId(scenario.id);
    setShowForm(true);
    setSelectedId(null);
  }

  const editingScenario = scenarios.find((s) => s.id === editingId);
  const selectedScenario = scenarios.find((s) => s.id === selectedId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scenario Planning</h1>
          <p className="text-sm text-gray-500 mt-1">Model exit scenarios and view waterfall distributions across your cap table.</p>
        </div>
        <div className="flex items-center gap-3">
          {scenarios.length >= 2 && !comparing && (
            <button
              onClick={() => { setComparing(true); setSelectedId(null); setShowForm(false); }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Compare scenarios
            </button>
          )}
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setSelectedId(null); setComparing(false); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create scenario
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Create / edit form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit scenario' : 'New scenario'}</h2>
            </div>
            <div className="px-6 py-5">
              <ScenarioForm
                initial={editingScenario ? { name: editingScenario.name, exitType: editingScenario.exitType, exitValuation: editingScenario.exitValuation, exitDate: editingScenario.exitDate || '' } : EMPTY_FORM}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditingId(null); }}
                saving={saving}
              />
            </div>
          </div>
        )}

        {/* Compare view */}
        {comparing && scenarios.length >= 2 && (
          <CompareView scenarios={scenarios} onClose={() => setComparing(false)} />
        )}

        {/* Scenarios list */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Saved Scenarios</h2>
            <p className="text-sm text-gray-500 mt-0.5">Click a scenario to view its waterfall analysis.</p>
          </div>
          {scenarios.length === 0 ? (
            <EmptyState
              heading="No scenarios yet — model your exit"
              body="Create a scenario to see how different exit valuations distribute proceeds across your stakeholders."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Exit Type', 'Valuation', 'Exit Date', 'Last Edited', 'Actions'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {scenarios.map((s) => (
                    <tr
                      key={s.id}
                      className={`transition-colors cursor-pointer ${selectedId === s.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => { setSelectedId(s.id === selectedId ? null : s.id); setComparing(false); }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-700 underline decoration-dotted">{s.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><ExitBadge type={s.exitType} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-semibold">{formatCurrency(s.exitValuation)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(s.exitDate)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{formatDate(s.lastEdited)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                          <button onClick={() => handleDuplicate(s)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">Duplicate</button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deleting === s.id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50"
                          >
                            {deleting === s.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Waterfall detail */}
        {selectedScenario && (
          <WaterfallDetail
            scenario={selectedScenario}
            shareholders={shareholders}
            shareClasses={shareClasses}
            loading={capTableLoading}
          />
        )}
      </div>
    </div>
  );
}
