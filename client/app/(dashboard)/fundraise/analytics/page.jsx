'use client';

import { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '@/lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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

// ─── primitives ───────────────────────────────────────────────────────────────

function Spinner({ className = 'h-5 w-5 text-blue-500' }) {
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

function RoundTypeBadge({ type }) {
  const map = {
    seed: 'bg-green-100 text-green-800',
    series_a: 'bg-blue-100 text-blue-800',
    series_b: 'bg-purple-100 text-purple-800',
    series_c: 'bg-indigo-100 text-indigo-800',
    safe: 'bg-yellow-100 text-yellow-800',
    bridge: 'bg-orange-100 text-orange-800',
    convertible: 'bg-pink-100 text-pink-800',
  };
  const label = {
    seed: 'Seed', series_a: 'Series A', series_b: 'Series B',
    series_c: 'Series C', safe: 'SAFE', bridge: 'Bridge', convertible: 'Convertible',
  };
  const key = (type || '').toLowerCase().replace(' ', '_');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[key] || 'bg-gray-100 text-gray-700'}`}>
      {label[key] || type || 'Unknown'}
    </span>
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">No fundraising rounds recorded yet</p>
      <p className="text-xs text-gray-400 max-w-xs">Add fundraising rounds from the Overview tab to see analytics here.</p>
    </div>
  );
}

// ─── chart config ─────────────────────────────────────────────────────────────

function buildChartData(rounds) {
  const sorted = [...rounds]
    .filter((r) => r.date || r.closedAt || r.createdAt)
    .sort((a, b) => new Date(a.date || a.closedAt || a.createdAt) - new Date(b.date || b.closedAt || b.createdAt));

  const labels = sorted.map((r) => formatDate(r.date || r.closedAt || r.createdAt));
  const amounts = sorted.map((r) => Number(r.amountRaised || r.amount || r.targetAmount) || 0);

  // Cumulative
  const cumulative = amounts.reduce((acc, v) => {
    acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v);
    return acc;
  }, []);

  return {
    labels,
    datasets: [
      {
        label: 'Round amount ($)',
        data: amounts,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        pointBackgroundColor: '#3B82F6',
        tension: 0.3,
        fill: false,
        yAxisID: 'y',
      },
      {
        label: 'Cumulative raised ($)',
        data: cumulative,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        pointBackgroundColor: '#10B981',
        tension: 0.3,
        fill: true,
        yAxisID: 'y',
        borderDash: [5, 3],
      },
    ],
  };
}

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'top', labels: { font: { size: 12 }, boxWidth: 12 } },
    title: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (v) => {
          if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
          if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
          return `$${v}`;
        },
        font: { size: 11 },
      },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
    x: {
      ticks: { font: { size: 11 }, maxRotation: 45 },
      grid: { display: false },
    },
  },
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function FundraisingAnalyticsPage() {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/fundraising-rounds');
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setRounds(list);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load fundraising rounds.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Summary stats
  const totalRaised = rounds.reduce((s, r) => s + (Number(r.amountRaised || r.amount || 0)), 0);
  const activeInvestors = new Set(rounds.map((r) => r.leadInvestor || r.investor).filter(Boolean)).size;
  const avgRoundSize = rounds.length > 0 ? totalRaised / rounds.length : 0;
  const sortedByDate = [...rounds].sort((a, b) => new Date(b.date || b.closedAt || b.createdAt || 0) - new Date(a.date || a.closedAt || a.createdAt || 0));
  const lastRoundDate = sortedByDate[0] ? (sortedByDate[0].date || sortedByDate[0].closedAt || sortedByDate[0].createdAt) : null;

  const ROUND_HEADERS = ['Round Name', 'Date', 'Amount Raised', 'Lead Investor', 'Valuation', 'Type'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fundraising Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Track your fundraising history and round performance over time.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-12 justify-center">
          <Spinner /> Loading fundraising data...
        </div>
      ) : error ? (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 mb-4">{error}</div>
      ) : rounds.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <EmptyState />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total raised" value={formatCurrency(totalRaised)} />
            <StatCard label="Active investors" value={activeInvestors > 0 ? String(activeInvestors) : '-'} />
            <StatCard label="Average round size" value={formatCurrency(avgRoundSize)} />
            <StatCard label="Last round date" value={formatDate(lastRoundDate)} />
          </div>

          {/* Timeline chart */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Fundraising Timeline</h2>
              <p className="text-sm text-gray-500 mt-0.5">Round amounts and cumulative capital raised over time.</p>
            </div>
            <div className="px-6 py-5" style={{ height: 300 }}>
              <Line data={buildChartData(rounds)} options={CHART_OPTIONS} />
            </div>
          </div>

          {/* Rounds table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Rounds</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {ROUND_HEADERS.map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedByDate.map((r, i) => (
                    <tr key={r.id || r._id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{r.name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatDate(r.date || r.closedAt || r.createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-green-700">{formatCurrency(r.amountRaised || r.amount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{r.leadInvestor || r.investor || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{formatCurrency(r.valuation || r.postMoneyValuation)}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><RoundTypeBadge type={r.type || r.roundType} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
