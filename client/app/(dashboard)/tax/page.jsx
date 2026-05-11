'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function fmt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Derive 83(b) deadline: 30 calendar days from grant date
function get83bDeadline(grantDate) {
  return addDays(grantDate, 30);
}

function get83bStatus(grantDate, filedMap, grantId) {
  if (filedMap[grantId]) return 'filed';
  const deadline = get83bDeadline(new Date(grantDate));
  return deadline < new Date() ? 'expired' : 'not-filed';
}

// ── 83(b) Election Tracker ─────────────────────────────────────────────────────

function ElectionTracker({ grants }) {
  const [filedMap, setFiledMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('83b_filed') || '{}');
    } catch {
      return {};
    }
  });

  const today = new Date();

  function toggleFiled(id) {
    setFiledMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('83b_filed', JSON.stringify(next));
      return next;
    });
  }

  // Grants that haven't been filed and deadline is within 14 days
  const urgentGrants = grants.filter((g) => {
    if (filedMap[g.id || g._id]) return false;
    const deadline = get83bDeadline(new Date(g.grantDate || g.createdAt));
    const daysLeft = daysBetween(today, deadline);
    return daysLeft >= 0 && daysLeft <= 14;
  });

  if (grants.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">
        No equity grants found. Add grants under Equity Plans.
      </p>
    );
  }

  return (
    <div>
      {urgentGrants.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <span className="mt-0.5 text-amber-600 text-lg leading-none">!</span>
          <div>
            <p className="text-sm font-medium text-amber-800">
              {urgentGrants.length} grant{urgentGrants.length > 1 ? 's' : ''} with 83(b) deadline within 14 days
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              File your 83(b) election with the IRS within 30 days of the grant date to lock in the tax basis.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="pb-2 pr-4 font-medium">Grant / Plan</th>
              <th className="pb-2 pr-4 font-medium">Grant Date</th>
              <th className="pb-2 pr-4 font-medium">Shares</th>
              <th className="pb-2 pr-4 font-medium">FMV at Grant</th>
              <th className="pb-2 pr-4 font-medium">83(b) Deadline</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grants.map((g) => {
              const id = g.id || g._id;
              const grantDate = g.grantDate || g.createdAt;
              const deadline = get83bDeadline(new Date(grantDate));
              const status = get83bStatus(grantDate, filedMap, id);
              const daysLeft = daysBetween(today, deadline);
              const isUrgent = status === 'not-filed' && daysLeft >= 0 && daysLeft <= 14;

              const statusBadge = {
                filed: 'bg-green-100 text-green-800',
                expired: 'bg-red-100 text-red-800',
                'not-filed': isUrgent ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700',
              }[status];

              const statusLabel = {
                filed: 'Filed',
                expired: 'Expired',
                'not-filed': isUrgent ? `Not Filed (${daysLeft}d left)` : 'Not Filed',
              }[status];

              return (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium text-gray-900">{g.name || `Grant ${id}`}</td>
                  <td className="py-3 pr-4 text-gray-600">{formatDate(grantDate)}</td>
                  <td className="py-3 pr-4 text-gray-600">{g.totalShares ? Number(g.totalShares).toLocaleString() : '-'}</td>
                  <td className="py-3 pr-4 text-gray-600">{g.fairMarketValue ? `$${fmt(g.fairMarketValue)}` : '-'}</td>
                  <td className={`py-3 pr-4 ${isUrgent ? 'font-semibold text-amber-700' : 'text-gray-600'}`}>
                    {formatDate(deadline.toISOString())}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusBadge}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="py-3">
                    {status !== 'expired' && (
                      <button
                        onClick={() => toggleFiled(id)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {filedMap[id] ? 'Mark unfiled' : 'Mark filed'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── AMT Estimation ─────────────────────────────────────────────────────────────

function AmtEstimator() {
  const [form, setForm] = useState({ shares: '', exercisePrice: '', fmv: '' });
  const [result, setResult] = useState(null);

  function calculate(e) {
    e.preventDefault();
    const shares = parseFloat(form.shares) || 0;
    const ep = parseFloat(form.exercisePrice) || 0;
    const fmv = parseFloat(form.fmv) || 0;
    const spread = (fmv - ep) * shares;
    // Simple AMT preference item: spread triggers AMT at ~28% federal AMT rate as a rough estimate
    const estimatedAmtLiability = spread * 0.28;
    setResult({ spread, estimatedAmtLiability, shares, ep, fmv });
  }

  function field(label, key, placeholder) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="relative">
          {key !== 'shares' && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          )}
          <input
            type="number"
            min="0"
            step={key === 'shares' ? '1' : '0.01'}
            value={form[key]}
            onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setResult(null); }}
            placeholder={placeholder}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${key !== 'shares' ? 'pl-7' : ''}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={calculate} className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        {field('ISO Shares Exercised', 'shares', '10000')}
        {field('Exercise Price per Share', 'exercisePrice', '1.00')}
        {field('FMV per Share at Exercise', 'fmv', '5.00')}
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={!form.shares || !form.exercisePrice || !form.fmv}
        >
          Calculate
        </button>
      </form>

      {result && (
        <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-3">
            <div className="text-gray-600">Shares exercised</div>
            <div className="font-medium">{Number(result.shares).toLocaleString()}</div>
            <div className="text-gray-600">Exercise price</div>
            <div className="font-medium">${fmt(result.ep)}</div>
            <div className="text-gray-600">FMV at exercise</div>
            <div className="font-medium">${fmt(result.fmv)}</div>
            <div className="text-gray-600">AMT spread (preference item)</div>
            <div className="font-semibold text-blue-800">${fmt(result.spread)}</div>
            <div className="text-gray-600">Estimated AMT impact (~28%)</div>
            <div className="font-semibold text-blue-800">${fmt(result.estimatedAmtLiability)}</div>
          </div>
          <p className="text-xs text-gray-500 border-t border-blue-200 pt-2 mt-2">
            This is a rough estimate only. Actual AMT depends on your total income, filing status, exemptions, and other factors. Consult a qualified tax advisor before exercising ISOs.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tax Document Checklist ─────────────────────────────────────────────────────

const TAX_DOCS = [
  { id: 'doc_83b', label: '83(b) election forms filed with IRS', hint: 'Must be filed within 30 days of grant date' },
  { id: 'doc_option_exercise', label: 'Stock option exercise records', hint: 'Form 3921 from employer for each ISO exercise' },
  { id: 'doc_w2_rsu', label: 'W-2 for RSU vesting income', hint: 'Ordinary income from RSU vesting should appear on W-2' },
  { id: 'doc_sched_d', label: 'Schedule D for share sales', hint: 'Report capital gains/losses from share dispositions' },
  { id: 'doc_1099b', label: '1099-B from broker', hint: 'Required for any brokerage-assisted sales' },
  { id: 'doc_amt_6251', label: 'Form 6251 (AMT)', hint: 'Required if you exercised ISOs during the tax year' },
];

function DocChecklist() {
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tax_doc_checklist') || '{}');
    } catch {
      return {};
    }
  });

  function toggle(id) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('tax_doc_checklist', JSON.stringify(next));
      return next;
    });
  }

  const completedCount = TAX_DOCS.filter((d) => checked[d.id]).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {completedCount} of {TAX_DOCS.length} items complete
        </p>
        <div className="h-2 w-32 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${(completedCount / TAX_DOCS.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="divide-y">
        {TAX_DOCS.map((doc) => (
          <li key={doc.id} className="flex items-start gap-3 py-3">
            <input
              id={doc.id}
              type="checkbox"
              checked={!!checked[doc.id]}
              onChange={() => toggle(doc.id)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={doc.id} className="flex-1 cursor-pointer">
              <span className={`text-sm font-medium ${checked[doc.id] ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {doc.label}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">{doc.hint}</p>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-gray-400">
        Checklist state is saved to your browser. This is for personal tracking only and does not constitute tax advice.
      </p>
    </div>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TaxPage() {
  const { data: equityPlansData, isLoading, error } = useQuery({
    queryKey: ['equityPlans-tax'],
    queryFn: async () => {
      try {
        const res = await api.get('/equity-plans');
        return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const grants = equityPlansData ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track equity tax obligations and estimate potential tax impacts.
        </p>
      </div>

      {/* Global disclaimer */}
      <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
        <strong className="font-medium text-gray-700">Disclaimer:</strong> Nothing on this page constitutes financial, legal, or tax advice. All calculations are estimates for planning purposes only. Consult a qualified tax professional or CPA before making any tax-related decisions.
      </div>

      {/* 83(b) Election Tracker */}
      <Section title="83(b) Election Tracker">
        {isLoading && <p className="text-sm text-gray-500 py-4">Loading equity grants...</p>}
        {!isLoading && error && (
          <p className="text-sm text-red-600 py-4">
            Could not load equity grants. Check your connection and try again.
          </p>
        )}
        {!isLoading && !error && <ElectionTracker grants={grants} />}
        <p className="mt-4 text-xs text-gray-400">
          An 83(b) election must be filed with the IRS within 30 days of the grant date. Missing this window cannot be remedied. This tracker reflects data from your Equity Plans records.
        </p>
      </Section>

      {/* AMT Estimation */}
      <Section title="AMT Estimation (ISO Exercises)">
        <AmtEstimator />
      </Section>

      {/* Tax Document Checklist */}
      <Section title="Tax Document Checklist">
        <DocChecklist />
      </Section>
    </div>
  );
}
