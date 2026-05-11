'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Status indicator ───────────────────────────────────────────────────────────

function StatusIcon({ pass }) {
  if (pass) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-bold">
        ✓
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold">
      !
    </span>
  );
}

// ── OCTA Compliance Checklist ──────────────────────────────────────────────────

function OctaChecklist({ shareholders, shareClasses, valuations }) {
  const shareholderCount = Array.isArray(shareholders) ? shareholders.length : 0;
  const shareClassCount = Array.isArray(shareClasses) ? shareClasses.length : 0;

  // 409A valuation currency check — most recent valuation within 12 months
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const recentValuation = Array.isArray(valuations)
    ? valuations.find(
        (v) =>
          v.status === 'approved' &&
          v.valuationDate &&
          new Date(v.valuationDate) >= twelveMonthsAgo
      )
    : null;

  const checks = [
    {
      id: 'stakeholders',
      label: 'Stakeholder records complete',
      description: `${shareholderCount} stakeholder${shareholderCount !== 1 ? 's' : ''} on record`,
      pass: shareholderCount > 0,
      failHint: 'Add at least one stakeholder record to meet OCTA v2.0 requirements.',
    },
    {
      id: 'share-classes',
      label: 'Share classes defined',
      description: `${shareClassCount} share class${shareClassCount !== 1 ? 'es' : ''} defined`,
      pass: shareClassCount > 0,
      failHint: 'Define at least one share class (e.g., Common, Series A Preferred).',
    },
    {
      id: 'vesting',
      label: 'All equity grants have vesting schedules',
      description: 'Checked against equity plan records',
      pass: null, // indeterminate — we don't have per-grant vesting data here
      failHint: 'Review each equity grant to ensure a vesting schedule is attached.',
    },
    {
      id: 'valuation',
      label: '409A valuation current (within 12 months)',
      description: recentValuation
        ? `Current valuation dated ${formatDate(recentValuation.valuationDate)}`
        : 'No approved valuation within the last 12 months',
      pass: !!recentValuation,
      failHint: 'Request a new 409A valuation from the Valuations page.',
    },
  ];

  return (
    <ul className="divide-y">
      {checks.map((c) => (
        <li key={c.id} className="flex items-start gap-4 py-4">
          <div className="mt-0.5 shrink-0">
            {c.pass === null ? (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                ?
              </span>
            ) : (
              <StatusIcon pass={c.pass} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{c.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>
            {!c.pass && c.pass !== null && (
              <p className="text-xs text-red-600 mt-1">{c.failHint}</p>
            )}
            {c.pass === null && (
              <p className="text-xs text-gray-400 mt-1">Manual verification required.</p>
            )}
          </div>
          <div className="shrink-0 text-xs font-medium">
            {c.pass === null ? (
              <span className="text-gray-400">Manual</span>
            ) : c.pass ? (
              <span className="text-green-700">Pass</span>
            ) : (
              <span className="text-red-600">Action required</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Audit Trail ────────────────────────────────────────────────────────────────

function AuditTrail({ activities, isLoading, error }) {
  if (isLoading) {
    return <p className="text-sm text-gray-500 py-4">Loading activity log...</p>;
  }

  if (error) {
    return (
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center">
        <p className="text-sm text-gray-500">Activity log unavailable.</p>
        <p className="text-xs text-gray-400 mt-1">The activities endpoint could not be reached.</p>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-8 text-center">
        <p className="text-sm text-gray-500">No activity records found.</p>
        <p className="text-xs text-gray-400 mt-1">Activity will appear here as actions are performed in the system.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
            <th className="pb-2 pr-4 font-medium">Action</th>
            <th className="pb-2 pr-4 font-medium">User</th>
            <th className="pb-2 pr-4 font-medium">Resource</th>
            <th className="pb-2 font-medium">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {activities.map((a, i) => (
            <tr key={a.id || a._id || i} className="hover:bg-gray-50">
              <td className="py-3 pr-4">
                <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
                  {a.type || a.action || 'unknown'}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-600 max-w-[160px] truncate">
                {a.userId || a.user || a.performedBy || '-'}
              </td>
              <td className="py-3 pr-4 text-gray-600 max-w-[180px] truncate">
                {a.resourceType || a.resource || a.entityType || '-'}
                {(a.resourceId || a.entityId) && (
                  <span className="ml-1 text-gray-400 text-xs">#{(a.resourceId || a.entityId).toString().slice(-6)}</span>
                )}
              </td>
              <td className="py-3 text-gray-500 whitespace-nowrap">
                {formatTime(a.timestamp || a.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Document Compliance ────────────────────────────────────────────────────────

const REQUIRED_DOCUMENTS = [
  {
    id: 'articles',
    label: 'Articles of Incorporation',
    description: 'State-filed incorporation document establishing the company',
  },
  {
    id: 'shareholder-agreement',
    label: 'Shareholder Agreement',
    description: 'Agreement governing shareholder rights and obligations',
  },
  {
    id: 'stock-plan',
    label: 'Stock Option / Equity Plan',
    description: 'Board-approved plan document for option or RSU grants',
  },
  {
    id: 'cap-table',
    label: 'Cap Table',
    description: 'Complete record of all equity holders and their ownership',
  },
  {
    id: 'bylaws',
    label: 'Corporate Bylaws',
    description: 'Internal rules governing corporate governance',
  },
  {
    id: '83b-template',
    label: '83(b) Election Template',
    description: 'IRS-compliant template for restricted stock elections',
  },
];

function DocumentCompliance({ documents }) {
  const docList = Array.isArray(documents) ? documents : [];

  function isPresent(docId) {
    if (docList.length === 0) return false;
    return docList.some(
      (d) =>
        (d.name || d.title || d.documentType || '')
          .toLowerCase()
          .includes(docId.replace(/-/g, ' ').toLowerCase()) ||
        (d.type || '').toLowerCase().includes(docId.replace(/-/g, ''))
    );
  }

  return (
    <ul className="divide-y">
      {REQUIRED_DOCUMENTS.map((doc) => {
        const present = isPresent(doc.id);
        return (
          <li key={doc.id} className="flex items-start gap-4 py-3">
            <div className="mt-0.5 shrink-0">
              {docList.length === 0 ? (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">?</span>
              ) : (
                <StatusIcon pass={present} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{doc.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
            </div>
            <div className="shrink-0">
              {docList.length === 0 ? (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">Unknown</span>
              ) : present ? (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Present</span>
              ) : (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">Missing</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Section card wrapper ───────────────────────────────────────────────────────

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-lg bg-white shadow">
      <div className="border-b px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  // Parallel data fetching — each query is independently resilient to failure
  const { data: shareholders } = useQuery({
    queryKey: ['shareholders-compliance'],
    queryFn: async () => {
      try {
        const res = await api.get('/shareholders');
        return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: shareClasses } = useQuery({
    queryKey: ['share-classes-compliance'],
    queryFn: async () => {
      try {
        const res = await api.get('/share-classes');
        return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: valuations } = useQuery({
    queryKey: ['valuations-compliance'],
    queryFn: async () => {
      try {
        const res = await api.get('/valuations');
        return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: activitiesData, isLoading: activitiesLoading, error: activitiesError } = useQuery({
    queryKey: ['activities-compliance'],
    queryFn: async () => {
      try {
        const res = await api.get('/activities', { params: { limit: 50 } });
        const raw = res.data;
        return Array.isArray(raw) ? raw : raw?.data ?? raw?.activities ?? [];
      } catch {
        return null; // null signals a fetch failure (different from empty array)
      }
    },
  });

  const { data: documents } = useQuery({
    queryKey: ['documents-compliance'],
    queryFn: async () => {
      try {
        const res = await api.get('/documents');
        return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Compute a simple overall compliance score
  const shareholderCount = Array.isArray(shareholders) ? shareholders.length : 0;
  const shareClassCount = Array.isArray(shareClasses) ? shareClasses.length : 0;
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const hasCurrentValuation = Array.isArray(valuations) && valuations.some(
    (v) => v.status === 'approved' && v.valuationDate && new Date(v.valuationDate) >= twelveMonthsAgo
  );
  const passCount = [shareholderCount > 0, shareClassCount > 0, hasCurrentValuation].filter(Boolean).length;
  const totalChecks = 3; // the deterministic ones
  const scorePercent = Math.round((passCount / totalChecks) * 100);

  const scoreColor =
    scorePercent >= 80 ? 'text-green-700' :
    scorePercent >= 50 ? 'text-amber-600' :
    'text-red-600';

  const scoreBg =
    scorePercent >= 80 ? 'bg-green-500' :
    scorePercent >= 50 ? 'bg-amber-400' :
    'bg-red-500';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            OCTA v2.0 schema compliance, audit trail, and document status.
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${scoreColor}`}>{scorePercent}%</p>
          <p className="text-xs text-gray-500 mt-0.5">compliance score</p>
          <div className="mt-1 h-2 w-24 rounded-full bg-gray-200 overflow-hidden ml-auto">
            <div className={`h-full rounded-full transition-all ${scoreBg}`} style={{ width: `${scorePercent}%` }} />
          </div>
        </div>
      </div>

      {/* OCTA Compliance */}
      <Section
        title="OCTA Schema Compliance"
        subtitle="Open Cap Table Alliance v2.0 requirements"
      >
        <OctaChecklist
          shareholders={shareholders}
          shareClasses={shareClasses}
          valuations={valuations}
        />
      </Section>

      {/* Audit Trail */}
      <Section
        title="Audit Trail"
        subtitle="Recent system activity — last 50 events"
      >
        <AuditTrail
          activities={activitiesData === null ? undefined : activitiesData}
          isLoading={activitiesLoading}
          error={activitiesData === null ? new Error('fetch failed') : activitiesError}
        />
      </Section>

      {/* Document Compliance */}
      <Section
        title="Document Compliance"
        subtitle="Required corporate and equity documents"
      >
        <DocumentCompliance documents={documents} />
        {(!documents || documents.length === 0) && (
          <p className="mt-3 text-xs text-gray-400">
            Upload your corporate documents in the Documents section and they will be matched here automatically.
          </p>
        )}
      </Section>
    </div>
  );
}
