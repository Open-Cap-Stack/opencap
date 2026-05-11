'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// ─── formatters ───────────────────────────────────────────────────────────────

function formatCurrency(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── calculations ─────────────────────────────────────────────────────────────

function calcModel({ preMoney, roundSize, existingShares, optionPoolPct, safes }) {
  const pre = Number(preMoney) || 0;
  const round = Number(roundSize) || 0;
  const existing = Number(existingShares) || 0;
  const poolPct = Number(optionPoolPct) || 0;

  if (!pre || !round || !existing) return null;

  // SAFE conversions: treat as additional shares at a valuation cap
  const safeShares = safes.reduce((sum, s) => {
    const amount = Number(s.amount) || 0;
    const cap = Number(s.valuationCap) || pre;
    const priceAtCap = cap / existing;
    return sum + (priceAtCap > 0 ? amount / priceAtCap : 0);
  }, 0);

  const postMoney = pre + round;
  const pricePerShare = pre / existing;
  const newInvestorShares = pricePerShare > 0 ? round / pricePerShare : 0;
  const optionPoolShares = (poolPct / 100) * (existing + newInvestorShares + safeShares);

  const totalShares = existing + newInvestorShares + optionPoolShares + safeShares;

  return {
    postMoney,
    pricePerShare,
    newInvestorShares: Math.round(newInvestorShares),
    safeShares: Math.round(safeShares),
    optionPoolShares: Math.round(optionPoolShares),
    totalShares: Math.round(totalShares),
    investorOwnershipPct: totalShares > 0 ? (newInvestorShares / totalShares) * 100 : 0,
    founderDilutionPct: totalShares > 0 ? (existing / totalShares) * 100 : 0,
    optionPoolDilutionPct: totalShares > 0 ? (optionPoolShares / totalShares) * 100 : 0,
    safeDilutionPct: totalShares > 0 ? (safeShares / totalShares) * 100 : 0,
  };
}

// ─── page ─────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  preMoney: '',
  roundSize: '',
  existingShares: '',
  optionPoolPct: '10',
};

const EMPTY_SAFE = { label: '', amount: '', valuationCap: '' };

export default function FundraisingModelPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [safes, setSafes] = useState([]);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [capLoading, setCapLoading] = useState(true);

  function setField(k, v) { setForm((p) => ({ ...p, [k]: v })); }

  // Pre-fill from cap table
  useEffect(() => {
    async function prefill() {
      setCapLoading(true);
      try {
        const [shRes, safeRes] = await Promise.all([
          api.get('/shareholders').catch(() => ({ data: [] })),
          api.get('/safe-agreements').catch(() => ({ data: [] })),
        ]);

        const shareholders = Array.isArray(shRes.data) ? shRes.data : Array.isArray(shRes.data?.data) ? shRes.data.data : [];
        const totalShares = shareholders.reduce((s, sh) => s + (Number(sh.sharesOwned || sh.shares) || 0), 0);
        if (totalShares > 0) {
          setField('existingShares', String(totalShares));
        }

        const safeList = Array.isArray(safeRes.data) ? safeRes.data : Array.isArray(safeRes.data?.data) ? safeRes.data.data : [];
        if (safeList.length > 0) {
          setSafes(safeList.map((s) => ({
            label: s.name || s.investorName || s.label || 'SAFE',
            amount: String(s.amount || s.investmentAmount || ''),
            valuationCap: String(s.valuationCap || s.valuation_cap || ''),
          })));
        }
      } catch {
        // silently fall back
      } finally {
        setCapLoading(false);
      }
    }
    prefill();
  }, []);

  // Recalculate whenever inputs change
  useEffect(() => {
    const r = calcModel({ ...form, safes });
    setResults(r);
  }, [form, safes]);

  function addSafe() { setSafes((p) => [...p, { ...EMPTY_SAFE }]); }
  function removeSafe(i) { setSafes((p) => p.filter((_, idx) => idx !== i)); }
  function updateSafe(i, k, v) { setSafes((p) => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s)); }

  async function handleSave() {
    if (!results) { setError('Run the model before saving.'); return; }
    setSaving(true);
    setError('');
    setSaveSuccess(false);
    const payload = { ...form, safes, ...results, savedAt: new Date().toISOString() };
    try {
      await api.post('/fundraising-scenarios', payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      // fallback to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('ocs_fundraising_models') || '[]');
        existing.push({ ...payload, id: `fm_${Date.now()}` });
        localStorage.setItem('ocs_fundraising_models', JSON.stringify(existing));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch {
        setError('Failed to save model.');
      }
    } finally {
      setSaving(false);
    }
  }

  const capTableRows = results
    ? [
        { label: 'Existing shareholders', shares: results.totalShares > 0 ? Number(form.existingShares) : 0, pct: results.founderDilutionPct },
        { label: 'New investors', shares: results.newInvestorShares, pct: results.investorOwnershipPct },
        ...(results.safeShares > 0 ? [{ label: 'SAFE conversions', shares: results.safeShares, pct: results.safeDilutionPct }] : []),
        ...(results.optionPoolShares > 0 ? [{ label: 'Option pool increase', shares: results.optionPoolShares, pct: results.optionPoolDilutionPct }] : []),
        { label: 'Total (fully diluted)', shares: results.totalShares, pct: 100, isTotal: true },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fundraising Model Builder</h1>
        <p className="text-sm text-gray-500 mt-1">
          Model the impact of a new round on your cap table. Calculations update in real time.
        </p>
      </div>

      {capLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Spinner className="h-4 w-4 text-blue-500" />
          Loading cap table data...
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Inputs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Round Parameters</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter the details of your proposed financing round.</p>
          </div>
          <div className="px-6 py-5 space-y-5">
            <ErrorBanner message={error} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label required>Pre-money valuation ($)</Label>
                <Input type="number" min="1" step="any" placeholder="e.g. 10000000" value={form.preMoney} onChange={(e) => setField('preMoney', e.target.value)} />
              </div>
              <div>
                <Label required>Round size ($)</Label>
                <Input type="number" min="1" step="any" placeholder="e.g. 2000000" value={form.roundSize} onChange={(e) => setField('roundSize', e.target.value)} />
              </div>
              <div>
                <Label required>Existing shares</Label>
                <Input type="number" min="1" step="1" placeholder="e.g. 10000000" value={form.existingShares} onChange={(e) => setField('existingShares', e.target.value)} />
                <p className="text-xs text-gray-400 mt-0.5">Auto-filled from cap table if available.</p>
              </div>
              <div>
                <Label>Option pool increase (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" placeholder="e.g. 10" value={form.optionPoolPct} onChange={(e) => setField('optionPoolPct', e.target.value)} />
              </div>
            </div>

            {/* SAFE conversions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Outstanding SAFE agreements</Label>
                <button type="button" onClick={addSafe} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add SAFE
                </button>
              </div>
              {safes.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No SAFE agreements added. Click "Add SAFE" to include conversions.</p>
              ) : (
                <div className="space-y-2">
                  {safes.map((s, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        {i === 0 && <Label>Name / Investor</Label>}
                        <input type="text" placeholder="Investor name" value={s.label} onChange={(e) => updateSafe(i, 'label', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        {i === 0 && <Label>Amount ($)</Label>}
                        <input type="number" min="0" step="any" placeholder="500000" value={s.amount} onChange={(e) => updateSafe(i, 'amount', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-1 items-end">
                        <div className="flex-1">
                          {i === 0 && <Label>Valuation cap ($)</Label>}
                          <input type="number" min="0" step="any" placeholder="cap" value={s.valuationCap} onChange={(e) => updateSafe(i, 'valuationCap', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <button type="button" onClick={() => removeSafe(i)} aria-label="Remove SAFE" className="text-gray-400 hover:text-red-500 transition-colors mb-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {saveSuccess && (
                <span className="text-xs text-green-600 font-medium">Model saved successfully.</span>
              )}
              {!saveSuccess && <span />}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !results}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {saving && <Spinner />}
                {saving ? 'Saving...' : 'Save model'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Results</h2>
              <p className="text-sm text-gray-500 mt-0.5">Calculated from your inputs. Updates in real time.</p>
            </div>
            <div className="px-6 py-5">
              {!results ? (
                <p className="text-sm text-gray-400 text-center py-6">Enter pre-money valuation, round size, and existing shares to see results.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard label="Post-money valuation" value={formatCurrency(results.postMoney)} highlight />
                  <StatCard label="Price per share" value={formatCurrency(results.pricePerShare)} />
                  <StatCard label="New shares issued" value={formatNumber(results.newInvestorShares)} />
                  <StatCard label="Investor ownership" value={formatPct(results.investorOwnershipPct)} />
                  <StatCard label="Founder dilution" value={formatPct(results.founderDilutionPct)} sub="post-round" />
                  <StatCard label="Option pool" value={formatPct(results.optionPoolDilutionPct)} sub="of total" />
                </div>
              )}
            </div>
          </div>

          {/* Fully diluted cap table preview */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Fully Diluted Cap Table Preview</h2>
            </div>
            <div className="overflow-x-auto">
              {capTableRows.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Enter round parameters to generate the cap table preview.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Stakeholder group', 'Shares', 'Ownership %'].map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {capTableRows.map((row, i) => (
                      <tr key={i} className={row.isTotal ? 'bg-gray-50 border-t-2 border-gray-200' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 whitespace-nowrap ${row.isTotal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{row.label}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${row.isTotal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{formatNumber(row.shares)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${row.isTotal ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{formatPct(row.pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
