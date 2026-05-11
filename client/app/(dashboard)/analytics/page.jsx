'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value) {
  const n = parseFloat(value);
  if (isNaN(n)) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatNumber(value) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return '0';
  return n.toLocaleString();
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ---------------------------------------------------------------------------
// Skeleton placeholder
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Section-level loading spinner
// ---------------------------------------------------------------------------

function SectionSpinner() {
  return (
    <div className="flex items-center justify-center py-10" role="status" aria-label="Loading">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section-level error state
// ---------------------------------------------------------------------------

function SectionError({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="text-red-600 text-sm mb-2">{message || 'Failed to load data'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-700 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-400 rounded"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({ label, value, sublabel, loading }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {loading ? (
        <>
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-4 w-20" />
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
          {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ pct }) {
  const clamped = clamp(pct, 0, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-2 rounded-full bg-blue-500 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const normalised = (status || '').toLowerCase();
  const map = {
    active: 'bg-green-100 text-green-800',
    open: 'bg-green-100 text-green-800',
    closed: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-700',
    completed: 'bg-blue-100 text-blue-800',
    paused: 'bg-yellow-100 text-yellow-800',
  };
  const cls = map[normalised] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status || 'unknown'}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Key Metrics
// ---------------------------------------------------------------------------

function KeyMetrics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/fundraising-analytics');
      setData(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load fundraising analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const metrics = [
    {
      label: 'Total Capital Raised',
      value: data ? formatCurrency(data.totalCapitalRaised ?? data.totalRaised ?? 0) : '$0',
      sublabel: 'across all rounds',
    },
    {
      label: 'Active Investors',
      value: data ? formatNumber(data.activeInvestors ?? data.investorCount ?? 0) : '0',
      sublabel: 'current period',
    },
    {
      label: 'Current Valuation',
      value: data ? formatCurrency(data.currentValuation ?? data.valuation ?? 0) : 'N/A',
      sublabel: 'post-money',
    },
    {
      label: 'Runway',
      value: data
        ? `${formatNumber(data.runwayMonths ?? data.runway ?? 0)} mo`
        : 'N/A',
      sublabel: 'estimated months',
    },
  ];

  return (
    <section aria-labelledby="metrics-heading">
      <h2 id="metrics-heading" className="text-lg font-semibold text-gray-800 mb-3">
        Key Metrics
      </h2>

      {error ? (
        <SectionError message={error} onRetry={fetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <StatCard
              key={m.label}
              label={m.label}
              value={m.value}
              sublabel={m.sublabel}
              loading={loading}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Fundraise Models
// ---------------------------------------------------------------------------

function FundraiseModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/fundraise-models');
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      setModels(list);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load fundraise models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <section aria-labelledby="models-heading">
      <h2 id="models-heading" className="text-lg font-semibold text-gray-800 mb-3">
        Fundraise Models
      </h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <SectionSpinner />
        ) : error ? (
          <div className="p-4">
            <SectionError message={error} onRetry={fetch} />
          </div>
        ) : models.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No fundraise models found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Target Raise', 'Current Raise', '% Funded', 'Status', 'Date'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {models.map((m, i) => {
                  const target = parseFloat(m.targetRaise ?? m.targetAmount ?? m.target ?? 0);
                  const current = parseFloat(m.currentRaise ?? m.amountRaised ?? m.raised ?? 0);
                  const pct = target > 0 ? clamp((current / target) * 100, 0, 100) : 0;
                  const dateStr = m.createdAt ?? m.date ?? m.updatedAt;

                  return (
                    <tr key={m.id ?? m._id ?? i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {m.name ?? m.modelName ?? 'Untitled'}
                      </td>
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {target > 0 ? formatCurrency(target) : '-'}
                      </td>
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {current > 0 ? formatCurrency(current) : '-'}
                      </td>
                      <td className="px-5 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <ProgressBar pct={pct} />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap w-9 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                        {dateStr ? new Date(dateStr).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Analytics Summary
// ---------------------------------------------------------------------------

function AnalyticsSummary() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/advanced-analytics/summary');
      setSummary(res.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load analytics summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const cards = [
    {
      label: 'Total Stakeholders',
      value: summary ? formatNumber(summary.totalStakeholders ?? summary.stakeholderCount ?? 0) : '0',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      ),
    },
    {
      label: 'Total Equity Issued',
      value: summary ? formatCurrency(summary.totalEquityIssued ?? summary.equityIssued ?? 0) : '$0',
      icon: (
        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Documents',
      value: summary ? formatNumber(summary.documentsCount ?? summary.documentCount ?? summary.documents ?? 0) : '0',
      icon: (
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-lg font-semibold text-gray-800 mb-3">
        Analytics Summary
      </h2>

      {error ? (
        <SectionError message={error} onRetry={fetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-lg shadow p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
                  {c.icon}
                </div>
                <p className="text-sm text-gray-500">{c.label}</p>
              </div>
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Fundraise modeling and advanced equity analytics</p>
      </div>

      <KeyMetrics />
      <FundraiseModels />
      <AnalyticsSummary />
    </div>
  );
}
