'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, BarChart2, FileText, ExternalLink, Percent } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

function formatCurrency(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '-';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function formatNumber(n) {
  const num = parseInt(n, 10);
  return isNaN(num) ? '-' : num.toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatPct(n) {
  const num = parseFloat(n);
  return isNaN(num) ? '-' : `${num.toFixed(2)}%`;
}

function SummaryCard({ icon: Icon, label, value, sub, iconColor }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon size={18} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function EmptySection({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon size={40} className="text-gray-200 mb-3" />
      <p className="text-gray-500 font-medium">{title}</p>
      {message && <p className="text-gray-400 text-sm mt-1 max-w-xs">{message}</p>}
    </div>
  );
}

export default function InvestorPortalPage() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;

  // Holdings / securities data — filter by current user
  const holdingsQuery = useQuery({
    queryKey: ['investor-holdings', userId],
    queryFn: async () => {
      try {
        const res = await api.get('/securities', { params: userId ? { investorId: userId, stakeholderId: userId } : {} });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  // Investor documents
  const docsQuery = useQuery({
    queryKey: ['investor-documents'],
    queryFn: async () => {
      try {
        const res = await api.get('/documents', { params: { type: 'investor' } });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  // Reports
  const reportsQuery = useQuery({
    queryKey: ['investor-reports'],
    queryFn: async () => {
      try {
        const res = await api.get('/reports');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      } catch {
        return [];
      }
    },
  });

  const holdings = holdingsQuery.data ?? [];
  const documents = docsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];

  // Compute summary from holdings
  const totalShares = holdings.reduce((sum, h) => sum + (parseInt(h.shares || h.quantity, 10) || 0), 0);
  const totalInvestment = holdings.reduce((sum, h) => sum + (parseFloat(h.costBasis || h.investmentAmount || 0)), 0);
  const totalCurrentValue = holdings.reduce((sum, h) => sum + (parseFloat(h.currentValue || h.estimatedValue || 0)), 0);
  const ownershipPct = holdings.reduce((sum, h) => sum + (parseFloat(h.ownershipPercentage || h.ownership || 0)), 0);

  const isLoading = holdingsQuery.isLoading;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Investor Portal</h1>
        <p className="text-sm text-gray-500 mt-1">Your investment overview and holdings</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={DollarSign}
          label="Total Investment"
          value={isLoading ? '...' : formatCurrency(totalInvestment)}
          iconColor="bg-green-50 text-green-600"
        />
        <SummaryCard
          icon={Percent}
          label="Current Ownership"
          value={isLoading ? '...' : formatPct(ownershipPct)}
          iconColor="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={BarChart2}
          label="Shares Held"
          value={isLoading ? '...' : formatNumber(totalShares)}
          iconColor="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Estimated Value"
          value={isLoading ? '...' : (totalCurrentValue > 0 ? formatCurrency(totalCurrentValue) : 'N/A')}
          sub={totalCurrentValue > 0 ? 'Based on latest 409A' : 'Requires 409A valuation'}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Holdings table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Holdings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Your securities and share class breakdown</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-gray-400">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Loading holdings...</p>
            </div>
          </div>
        ) : holdings.length === 0 ? (
          <EmptySection
            icon={BarChart2}
            title="No holdings recorded"
            message="Your securities and share positions will appear here once recorded by your administrator."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Share Class</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Shares</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Acquisition Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Cost Basis</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Current Value</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Ownership %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holdings.map((h, i) => {
                  const shares = parseInt(h.shares || h.quantity, 10) || 0;
                  const costBasis = parseFloat(h.costBasis || h.investmentAmount || 0);
                  const currentValue = parseFloat(h.currentValue || h.estimatedValue || 0);
                  const pct = parseFloat(h.ownershipPercentage || h.ownership || 0);
                  const shareClass = h.shareClass || h.shareClassName || h.className || h.type || 'Common';
                  return (
                    <tr key={h.id || h._id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{shareClass}</span>
                        {h.securityType && (
                          <span className="ml-2 text-xs text-gray-400">{h.securityType}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{shares.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(h.acquisitionDate || h.issuanceDate || h.createdAt)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{costBasis > 0 ? formatCurrency(costBasis) : '-'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {currentValue > 0 ? (
                          <span className={currentValue >= costBasis ? 'text-green-700' : 'text-red-700'}>
                            {formatCurrency(currentValue)}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {pct > 0 ? formatPct(pct) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {holdings.length > 0 && (
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{totalShares.toLocaleString()}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{totalInvestment > 0 ? formatCurrency(totalInvestment) : '-'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {totalCurrentValue > 0 ? formatCurrency(totalCurrentValue) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatPct(ownershipPct)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Investor Documents</h2>
            <p className="text-xs text-gray-400 mt-0.5">Term sheets, cap table snapshots, and disclosures</p>
          </div>
          {docsQuery.isLoading ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading documents...
            </div>
          ) : documents.length === 0 ? (
            <EmptySection
              icon={FileText}
              title="No investor documents"
              message="Documents shared with investors will appear here."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {documents.map((doc, i) => {
                const name = doc.name || doc.title || doc.fileName || 'Untitled Document';
                const type = doc.type || doc.category || '';
                const date = formatDate(doc.createdAt || doc.updatedAt);
                return (
                  <li key={doc.id || doc._id || i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <FileText size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400">{type ? `${type} · ` : ''}{date}</p>
                      </div>
                    </div>
                    {(doc.url || doc.fileUrl || doc.downloadUrl) && (
                      <a
                        href={doc.url || doc.fileUrl || doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-3"
                        title="Open document"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Reports section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Investor Reports</h2>
            <p className="text-xs text-gray-400 mt-0.5">Financial reports and cap table snapshots</p>
          </div>
          {reportsQuery.isLoading ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <EmptySection
              icon={BarChart2}
              title="No reports available"
              message="Investor reports will appear here once generated by your administrator."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {reports.map((report, i) => {
                const name = report.name || report.title || report.reportName || 'Untitled Report';
                const type = report.type || report.category || '';
                const date = formatDate(report.createdAt || report.generatedAt || report.updatedAt);
                return (
                  <li key={report.id || report._id || i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <BarChart2 size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400">{type ? `${type} · ` : ''}{date}</p>
                      </div>
                    </div>
                    {(report.url || report.fileUrl || report.downloadUrl) && (
                      <a
                        href={report.url || report.fileUrl || report.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex-shrink-0 ml-3"
                        title="View report"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
