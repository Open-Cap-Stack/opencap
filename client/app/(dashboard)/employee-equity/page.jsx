'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const VESTING_PRESETS = [
  { label: '4yr / 1yr cliff (standard)', value: '4yr-1yr-cliff' },
  { label: '3yr / 1yr cliff', value: '3yr-1yr-cliff' },
  { label: '2yr / 6mo cliff', value: '2yr-6mo-cliff' },
  { label: 'Custom', value: 'custom' },
];

const emptyGrantForm = {
  employeeId: '',
  equityPlanId: '',
  grantType: 'ISO',
  numberOfShares: '',
  grantDate: '',
  vestingScheduleType: '4yr-1yr-cliff',
  vestingDurationMonths: '48',
  cliffMonths: '12',
  status: 'pending',
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
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyGrantForm);
  const [mutationError, setMutationError] = useState(null);
  const qc = useQueryClient();

  const equityQuery = useQuery({
    queryKey: ['employee-equity-plans'],
    queryFn: async () => {
      try {
        const res = await api.get('/equity-grants');
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

  const equityPlansQuery = useQuery({
    queryKey: ['equity-plans-list'],
    queryFn: async () => {
      try {
        const res = await api.get('/equity-plans');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const createGrantMut = useMutation({
    mutationFn: async (data) => {
      const payload = {
        employeeId: data.employeeId,
        equityPlanId: data.equityPlanId || undefined,
        grantType: data.grantType,
        numberOfShares: parseInt(data.numberOfShares, 10),
        grantDate: data.grantDate,
        vestingSchedule: {
          type: data.vestingScheduleType,
          durationMonths: parseInt(data.vestingDurationMonths, 10),
          cliffMonths: parseInt(data.cliffMonths, 10),
        },
        status: data.status,
      };
      const res = await api.post('/equity-grants', payload);
      return res.data;
    },
    onSuccess: () => {
      setMutationError(null);
      qc.invalidateQueries({ queryKey: ['employee-equity-plans'] });
      setModalOpen(false);
      setForm(emptyGrantForm);
    },
    onError: (err) => {
      setMutationError(
        err.response?.data?.message || err.response?.data?.error || 'Failed to create equity grant.'
      );
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setMutationError(null);
    createGrantMut.mutate(form);
  };

  const handleVestingPreset = (preset) => {
    const updates = { vestingScheduleType: preset };
    if (preset === '4yr-1yr-cliff') {
      updates.vestingDurationMonths = '48';
      updates.cliffMonths = '12';
    } else if (preset === '3yr-1yr-cliff') {
      updates.vestingDurationMonths = '36';
      updates.cliffMonths = '12';
    } else if (preset === '2yr-6mo-cliff') {
      updates.vestingDurationMonths = '24';
      updates.cliffMonths = '6';
    }
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const openModal = () => {
    setForm(emptyGrantForm);
    setMutationError(null);
    setModalOpen(true);
  };

  const grants = equityQuery.data ?? [];
  const employees = employeesQuery.data ?? [];
  const equityPlans = equityPlansQuery.data ?? [];

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
  const totalGranted = grants.reduce((sum, g) => sum + (parseInt(g.totalShares || g.sharesGranted || g.numberOfShares, 10) || 0), 0);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employee Equity</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of all employee equity grants</p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Grant Equity
        </button>
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
                : 'Use the Grant Equity button above to issue your first grant'}
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
                  const sharesGranted = grant.totalShares || grant.sharesGranted || grant.numberOfShares;
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
                      <td className="px-4 py-3 text-gray-600">{formatDate(grant.vestingStartDate || grant.startDate || grant.grantDate)}</td>
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

      {/* Grant Equity Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Grant Equity</h2>
              <button
                onClick={() => { setModalOpen(false); setMutationError(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {mutationError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  {mutationError}
                </div>
              )}

              {/* Employee */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Employee <span className="text-red-500">*</span>
                </label>
                {employees.length > 0 ? (
                  <select
                    required
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => {
                      const id = emp.id || emp._id;
                      const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email || id;
                      return (
                        <option key={id} value={id}>{name}</option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    required
                    placeholder="Employee ID"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Equity Plan */}
              <div>
                <label className="block text-sm font-medium mb-1">Equity Plan</label>
                {equityPlans.length > 0 ? (
                  <select
                    value={form.equityPlanId}
                    onChange={(e) => setForm({ ...form, equityPlanId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No plan selected</option>
                    {equityPlans.map((plan) => {
                      const id = plan.id || plan._id;
                      return (
                        <option key={id} value={id}>{plan.name || plan.planName || id}</option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    placeholder="Equity Plan ID (optional)"
                    value={form.equityPlanId}
                    onChange={(e) => setForm({ ...form, equityPlanId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* Grant Type + Shares */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Grant Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.grantType}
                    onChange={(e) => setForm({ ...form, grantType: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ISO">ISO</option>
                    <option value="NSO">NSO</option>
                    <option value="RSA">RSA</option>
                    <option value="RSU">RSU</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Number of Shares <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.numberOfShares}
                    onChange={(e) => setForm({ ...form, numberOfShares: e.target.value })}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Grant Date */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Grant Date <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="date"
                  value={form.grantDate}
                  onChange={(e) => setForm({ ...form, grantDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Vesting Schedule */}
              <div>
                <label className="block text-sm font-medium mb-1">Vesting Schedule</label>
                <select
                  value={form.vestingScheduleType}
                  onChange={(e) => handleVestingPreset(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {VESTING_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Vesting duration + cliff (always visible for transparency / custom override) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (months)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.vestingDurationMonths}
                    onChange={(e) => setForm({ ...form, vestingDurationMonths: e.target.value, vestingScheduleType: 'custom' })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cliff (months)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.cliffMonths}
                    onChange={(e) => setForm({ ...form, cliffMonths: e.target.value, vestingScheduleType: 'custom' })}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); setMutationError(null); }}
                  className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGrantMut.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 hover:bg-blue-700"
                >
                  {createGrantMut.isPending ? 'Granting...' : 'Grant Equity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
