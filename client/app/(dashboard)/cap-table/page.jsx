'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { stakeholderService } from '@/lib/stakeholderService';
import { shareClassService } from '@/lib/shareClassService';
import { equityPlanService } from '@/lib/equityPlanService';
import { safeNoteService } from '@/lib/safeNoteService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(n) {
  const num = Number(n) || 0;
  return num.toLocaleString();
}

function pct(numerator, denominator) {
  if (!denominator) return '—';
  const val = (Number(numerator) / Number(denominator)) * 100;
  if (Number.isNaN(val)) return '—';
  return `${val.toFixed(2)}%`;
}

// ─── skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-7 w-32 bg-gray-300 rounded" />
    </div>
  );
}

// ─── summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function CapTablePage() {
  const stakeholdersQ = useQuery({
    queryKey: ['stakeholders'],
    queryFn: () => stakeholderService.getStakeholders(),
  });

  const shareClassesQ = useQuery({
    queryKey: ['shareClasses'],
    queryFn: () => shareClassService.getShareClasses(),
  });

  const equityPlansQ = useQuery({
    queryKey: ['equityPlans'],
    queryFn: () => equityPlanService.getEquityPlans(),
  });

  const safeNotesQ = useQuery({
    queryKey: ['safeNotes'],
    queryFn: () => safeNoteService.getSafeNotes(),
  });

  const isLoading =
    stakeholdersQ.isLoading ||
    shareClassesQ.isLoading ||
    equityPlansQ.isLoading ||
    safeNotesQ.isLoading;

  const hasError =
    stakeholdersQ.error ||
    shareClassesQ.error ||
    equityPlansQ.error ||
    safeNotesQ.error;

  function retryAll() {
    stakeholdersQ.refetch();
    shareClassesQ.refetch();
    equityPlansQ.refetch();
    safeNotesQ.refetch();
  }

  // ── derived data ────────────────────────────────────────────────────────────

  const stakeholders = Array.isArray(stakeholdersQ.data) ? stakeholdersQ.data : [];
  const shareClasses = Array.isArray(shareClassesQ.data) ? shareClassesQ.data : [];
  const equityPlans = Array.isArray(equityPlansQ.data) ? equityPlansQ.data : [];
  const safeNotes = Array.isArray(safeNotesQ.data) ? safeNotesQ.data : [];

  // Authorized shares = sum of authorizedShares across all share classes
  const totalAuthorized = shareClasses.reduce(
    (sum, sc) => sum + (parseInt(sc.authorizedShares) || 0),
    0
  );

  // Issued shares = sum of sharesHeld / shares across stakeholders
  const totalIssued = stakeholders.reduce(
    (sum, s) =>
      sum + (parseInt(s.sharesHeld) || parseInt(s.shares) || parseInt(s.sharesOwned) || 0),
    0
  );

  // Options pool = sum of totalShares across equity plans
  const totalOptions = equityPlans.reduce(
    (sum, ep) => sum + (parseInt(ep.totalShares) || 0),
    0
  );

  // SAFE dilution = number of open SAFEs (shares TBD at conversion, so we count investment amount as a proxy note, but for fully diluted we track open SAFE count)
  // Per the task, fully diluted = issued + options + SAFEs (open)
  const openSafeCount = safeNotes.filter((s) => s.status === 'open' || !s.status).length;

  // For fully diluted share count we use options as the additional pool
  const fullyDiluted = totalIssued + totalOptions;

  // Build cap table rows: one per stakeholder with share class info
  // Map share class id -> name for lookup
  const shareClassMap = shareClasses.reduce((acc, sc) => {
    const id = sc.id || sc._id;
    if (id) acc[id] = sc.name || sc.className || 'Unnamed';
    return acc;
  }, {});

  const capTableRows = stakeholders.map((s) => {
    const sharesHeld =
      parseInt(s.sharesHeld) ||
      parseInt(s.shares) ||
      parseInt(s.sharesOwned) ||
      0;

    const shareClassId = s.shareClassId || s.shareClass;
    const shareClassName =
      (typeof shareClassId === 'string' && shareClassMap[shareClassId]) ||
      (typeof s.shareClass === 'string' && s.shareClass) ||
      s.shareClassName ||
      '—';

    const stakeholderName =
      s.name ||
      `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
      s.email ||
      'Unknown';

    return {
      id: s.id || s._id,
      name: stakeholderName,
      shareClass: shareClassName,
      sharesHeld,
      ownershipPct: pct(sharesHeld, totalIssued),
      fullyDilutedPct: pct(sharesHeld, fullyDiluted),
    };
  });

  // Share classes breakdown
  const shareClassBreakdown = shareClasses.map((sc) => ({
    id: sc.id || sc._id,
    name: sc.name || sc.className || 'Unnamed',
    authorized: parseInt(sc.authorizedShares) || 0,
    type: sc.type || '—',
    pricePerShare: sc.pricePerShare,
  }));

  // ── empty state ─────────────────────────────────────────────────────────────

  const isEmpty = !isLoading && !hasError && stakeholders.length === 0 && shareClasses.length === 0;

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cap Table</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ownership summary across all stakeholders and share classes
          </p>
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <ErrorMessage
          message={
            (stakeholdersQ.error || shareClassesQ.error || equityPlansQ.error || safeNotesQ.error)
              ?.message || 'Failed to load cap table data'
          }
          onRetry={retryAll}
        />
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <SummaryCard
              label="Authorized Shares"
              value={fmt(totalAuthorized)}
              sub={`across ${shareClasses.length} share class${shareClasses.length !== 1 ? 'es' : ''}`}
            />
            <SummaryCard
              label="Issued Shares"
              value={fmt(totalIssued)}
              sub={totalAuthorized ? `${pct(totalIssued, totalAuthorized)} of authorized` : undefined}
            />
            <SummaryCard
              label="Shareholders"
              value={stakeholders.length.toLocaleString()}
              sub={stakeholders.length === 1 ? '1 stakeholder' : undefined}
            />
            <SummaryCard
              label="Fully Diluted Shares"
              value={fmt(fullyDiluted)}
              sub={
                openSafeCount > 0
                  ? `+ ${openSafeCount} open SAFE${openSafeCount !== 1 ? 's' : ''} (not counted)`
                  : 'issued + option pool'
              }
            />
          </>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-4xl mb-4" aria-hidden="true">📊</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">No cap table data yet</h2>
          <p className="text-gray-500 text-sm mb-6">
            Start by adding stakeholders and share classes to build your cap table.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/stakeholders"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Add Stakeholders
            </Link>
            <Link
              href="/share-classes"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Add Share Classes
            </Link>
          </div>
        </div>
      )}

      {/* Cap table */}
      {!isEmpty && (
        <>
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Ownership by Stakeholder</h2>
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : capTableRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                No stakeholders found.{' '}
                <Link href="/stakeholders" className="text-blue-600 hover:underline">
                  Add a stakeholder
                </Link>{' '}
                to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Stakeholder
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Share Class
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Shares Held
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Ownership %
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Fully Diluted %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {capTableRows.map((row, i) => (
                      <tr key={row.id || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {row.name}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{row.shareClass}</td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right tabular-nums">
                          {fmt(row.sharesHeld)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right tabular-nums">
                          {row.ownershipPct}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 text-right tabular-nums">
                          {row.fullyDilutedPct}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {capTableRows.length > 0 && (
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900" colSpan={2}>
                          Total
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                          {fmt(totalIssued)}
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                          100.00%
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-600 text-right">
                          {pct(totalIssued, fullyDiluted)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>

          {/* Share classes breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Share Classes</h2>
              <Link
                href="/share-classes"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Manage
              </Link>
            </div>

            {isLoading ? (
              <LoadingSpinner />
            ) : shareClassBreakdown.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                No share classes defined.{' '}
                <Link href="/share-classes" className="text-blue-600 hover:underline">
                  Add a share class
                </Link>
                .
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Class Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Authorized Shares
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Price / Share
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        % of Total Authorized
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {shareClassBreakdown.map((sc, i) => (
                      <tr key={sc.id || i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">{sc.name}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                            {sc.type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right tabular-nums">
                          {fmt(sc.authorized)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 text-right tabular-nums">
                          {sc.pricePerShare ? `$${Number(sc.pricePerShare).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600 text-right tabular-nums">
                          {pct(sc.authorized, totalAuthorized)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {shareClassBreakdown.length > 0 && (
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900" colSpan={2}>
                          Total
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                          {fmt(totalAuthorized)}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right" />
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                          100.00%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
