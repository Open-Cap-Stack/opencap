'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, DollarSign, Award, Lock, Info } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

function formatNumber(n) {
  const num = parseInt(n, 10);
  return isNaN(num) ? 0 : num;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatCurrency(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function SummaryCard({ icon: Icon, label, value, sub, iconColor }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function VestingBar({ vested, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((vested / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{pct}% vested</span>
        <span>{vested.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function GrantTypeTag({ type }) {
  const colors = {
    ISO: 'bg-indigo-50 text-indigo-700',
    NSO: 'bg-purple-50 text-purple-700',
    RSA: 'bg-teal-50 text-teal-700',
    RSU: 'bg-cyan-50 text-cyan-700',
  };
  const key = (type || '').toUpperCase();
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[key] || 'bg-gray-100 text-gray-600'}`}>
      {key || '-'}
    </span>
  );
}

export default function MyEquityPage() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  const grantsQuery = useQuery({
    queryKey: ['my-equity', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const res = await api.get(`/equity-plans`, { params: { userId } });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
    enabled: !!userId,
  });

  const grants = grantsQuery.data ?? [];

  // Aggregate totals across all grants
  const totalGranted = grants.reduce((sum, g) => sum + formatNumber(g.totalShares || g.sharesGranted), 0);
  const totalVested = grants.reduce((sum, g) => sum + formatNumber(g.vestedShares || g.vested), 0);
  const totalUnvested = grants.reduce((sum, g) => sum + formatNumber(g.unvestedShares || g.unvested), 0);

  // Estimate FMV value: use exercisePrice or strikePrice if available
  const fmvEstimate = grants.reduce((sum, g) => {
    const fmv = parseFloat(g.fmv || g.currentFMV || g.exercisePrice || 0);
    const vested = formatNumber(g.vestedShares || g.vested);
    return sum + fmv * vested;
  }, 0);

  // Build a vesting schedule view: group events per grant
  const vestingRows = grants.flatMap((g) => {
    const schedule = Array.isArray(g.vestingSchedule) ? g.vestingSchedule : [];
    if (schedule.length > 0) return schedule.map((s, i) => ({ ...s, grantId: g.id || g._id, grantType: g.type || g.grantType, key: `${g.id || i}-${i}` }));
    // Synthesize a summary row from grant-level data
    return [{
      key: g.id || g._id || String(Math.random()),
      grantId: g.id || g._id,
      grantType: g.type || g.grantType,
      date: g.vestingStartDate || g.startDate,
      shares: formatNumber(g.totalShares || g.sharesGranted),
      vestedShares: formatNumber(g.vestedShares || g.vested),
      cliff: g.cliffDate || g.cliff,
      _synthetic: true,
    }];
  });

  const isLoading = grantsQuery.isLoading;
  const hasGrants = grants.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Equity</h1>
        <p className="text-sm text-gray-500 mt-1">Your personal equity summary and vesting schedule</p>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-6 text-white shadow-lg">
        <h2 className="text-lg font-semibold mb-4 opacity-90">Your Equity Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Total Grants</p>
            <p className="text-2xl font-bold">{isLoading ? '...' : grants.length}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Total Vested</p>
            <p className="text-2xl font-bold">{isLoading ? '...' : totalVested.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Est. FMV Value</p>
            <p className="text-2xl font-bold">
              {isLoading ? '...' : fmvEstimate > 0 ? formatCurrency(fmvEstimate) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-blue-200 text-xs uppercase tracking-wide mb-1">Unvested Shares</p>
            <p className="text-2xl font-bold">{isLoading ? '...' : totalUnvested.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading your equity data...</p>
        </div>
      ) : !hasGrants ? (
        <div className="bg-white rounded-lg shadow flex flex-col items-center justify-center py-16 text-center px-6">
          <Award size={48} className="text-gray-200 mb-4" />
          <h3 className="text-gray-700 font-semibold text-lg mb-2">No equity grants yet</h3>
          <p className="text-gray-400 text-sm max-w-sm">
            You don&apos;t have any equity grants associated with your account. Contact your administrator if you believe this is an error.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
            <Info size={14} />
            <span>Equity grants are assigned by your company administrator</span>
          </div>
        </div>
      ) : (
        <>
          {/* Grant details table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Grant Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Grant Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Shares</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Exercise Price</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Vesting Start</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliff</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Vesting Progress</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grants.map((grant, i) => {
                    const granted = formatNumber(grant.totalShares || grant.sharesGranted);
                    const vested = formatNumber(grant.vestedShares || grant.vested);
                    return (
                      <tr key={grant.id || grant._id || i} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <GrantTypeTag type={grant.type || grant.grantType} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{granted.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                          {formatCurrency(grant.exercisePrice || grant.strikePrice)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(grant.vestingStartDate || grant.startDate)}</td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(grant.cliffDate || grant.cliff)}</td>
                        <td className="px-4 py-3 min-w-[160px]">
                          <VestingBar vested={vested} total={granted} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${grant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {grant.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="group relative inline-block">
                            <button
                              disabled
                              className="px-3 py-1 text-xs rounded-md border border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50"
                            >
                              Exercise
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                                Contact your administrator
                              </div>
                              <div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mt-1" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vesting timeline */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Vesting Schedule</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" /> Vested
                <span className="inline-block w-3 h-3 rounded-full bg-gray-200 ml-2" /> Pending
              </div>
            </div>
            {vestingRows.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No vesting schedule data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Grant Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Vesting Date</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Shares in Tranche</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Vested in Tranche</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {vestingRows.map((row) => (
                      <tr key={row.key} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <GrantTypeTag type={row.grantType} />
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(row.date || row.vestingDate)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{(row.shares || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-green-700">
                          {(row.vestedShares || row.vested || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatDate(row.cliff)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Overall vesting progress bar */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-gray-700">Overall Vesting Progress</span>
                <span className="text-gray-500">
                  {totalVested.toLocaleString()} of {totalGranted.toLocaleString()} shares vested
                </span>
              </div>
              <VestingBar vested={totalVested} total={totalGranted} />
            </div>
          </div>

          {/* Exercise options CTA */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Lock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Want to exercise your options?</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Option exercises must be initiated through your administrator. Please contact them to begin the process.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
