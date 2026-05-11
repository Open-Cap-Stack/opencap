'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, Award, Clock } from 'lucide-react';
import api from '@/lib/api';

const GRANT_TYPE_LABELS = { ISO: 'ISO', NSO: 'NSO', RSA: 'RSA', RSU: 'RSU' };
const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  vesting: 'bg-blue-100 text-blue-800',
  cliff: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
  exercised: 'bg-purple-100 text-purple-800',
};

function SummaryCard({ icon: Icon, label, value, iconColor }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex items-start gap-4">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {status || 'Unknown'}
    </span>
  );
}

function GrantTypeBadge({ type }) {
  return (
    <span className="px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
      {GRANT_TYPE_LABELS[type?.toUpperCase()] || type || '-'}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatNumber(n) {
  const num = parseInt(n, 10);
  return isNaN(num) ? '-' : num.toLocaleString();
}

export default function EmployeeEquityPage() {
  const [grantTypeFilter, setGrantTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const equityQuery = useQuery({
    queryKey: ['employee-equity-plans'],
    queryFn: async () => {
      try {
        const res = await api.get('/equity-plans');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const employeesQuery = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/employees');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const grants = equityQuery.data ?? [];
  const employees = employeesQuery.data ?? [];

  // Build a lookup of employee id -> name
  const employeeMap = employees.reduce((acc, emp) => {
    const id = emp.id || emp._id;
    if (id) {
      acc[id] = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || id;
    }
    return acc;
  }, {});

  // Compute summary statistics
  const employeeIds = new Set(grants.map((g) => g.employeeId || g.userId).filter(Boolean));
  const totalEmployees = employeeIds.size;
  const totalGranted = grants.reduce((sum, g) => sum + (parseInt(g.totalShares || g.sharesGranted, 10) || 0), 0);
  const totalVested = grants.reduce((sum, g) => sum + (parseInt(g.vestedShares || g.vested, 10) || 0), 0);
  const totalUnvested = grants.reduce((sum, g) => sum + (parseInt(g.unvestedShares || g.unvested, 10) || 0), 0);

  // Filter grants
  const filteredGrants = grants.filter((g) => {
    const typeMatch = grantTypeFilter === 'all' || (g.type || g.grantType || '').toUpperCase() === grantTypeFilter;
    const statusMatch = statusFilter === 'all' || (g.status || '').toLowerCase() === statusFilter;
    return typeMatch && statusMatch;
  });

  const isLoading = equityQuery.isLoading || employeesQuery.isLoading;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Employee Equity</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of all employee equity grants</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={Users}
          label="Employees with Equity"
          value={isLoading ? '...' : totalEmployees.toLocaleString()}
          iconColor="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={Award}
          label="Total Shares Granted"
          value={isLoading ? '...' : totalGranted.toLocaleString()}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total Vested"
          value={isLoading ? '...' : totalVested.toLocaleString()}
          iconColor="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={Clock}
          label="Total Unvested"
          value={isLoading ? '...' : totalUnvested.toLocaleString()}
          iconColor="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Grant Type</label>
          <select
            value={grantTypeFilter}
            onChange={(e) => setGrantTypeFilter(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5"
          >
            <option value="all">All Types</option>
            <option value="ISO">ISO</option>
            <option value="NSO">NSO</option>
            <option value="RSA">RSA</option>
            <option value="RSU">RSU</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded-md px-2 py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="vesting">Vesting</option>
            <option value="cliff">Cliff</option>
            <option value="terminated">Terminated</option>
            <option value="exercised">Exercised</option>
          </select>
        </div>
        {(grantTypeFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => { setGrantTypeFilter('all'); setStatusFilter('all'); }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Grants table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading equity data...</p>
            </div>
          </div>
        ) : equityQuery.error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-red-600 text-sm mb-2">Failed to load equity grants</p>
            <button onClick={() => equityQuery.refetch()} className="text-sm text-blue-600 hover:underline">
              Try again
            </button>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Award size={40} className="text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No equity grants issued yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {grantTypeFilter !== 'all' || statusFilter !== 'all'
                ? 'No grants match the selected filters'
                : 'Equity grants will appear here once created'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Employee</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Grant Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Shares Granted</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Vested</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Unvested</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Vesting Start</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliff Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGrants.map((grant, i) => {
                  const empId = grant.employeeId || grant.userId;
                  const empName = empId ? (employeeMap[empId] || empId) : (grant.employeeName || grant.name || 'Unknown');
                  const sharesGranted = grant.totalShares || grant.sharesGranted;
                  const vested = grant.vestedShares || grant.vested;
                  const unvested = grant.unvestedShares || grant.unvested;
                  return (
                    <tr key={grant.id || grant._id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{empName}</td>
                      <td className="px-4 py-3">
                        <GrantTypeBadge type={grant.type || grant.grantType} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatNumber(sharesGranted)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-700">{formatNumber(vested)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700">{formatNumber(unvested)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(grant.vestingStartDate || grant.startDate)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(grant.cliffDate || grant.cliff)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={grant.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && filteredGrants.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-right">
          Showing {filteredGrants.length} of {grants.length} grant{grants.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
