'use client';

import { useQuery } from '@tanstack/react-query';
import { safeNoteService } from '@/lib/safeNoteService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

// ─── static market benchmark data ────────────────────────────────────────────

const BENCHMARKS = [
  {
    name: 'YC Post-Money SAFE (Standard)',
    source: 'Y Combinator (2024)',
    capRange: '$1M – $2M',
    discount: 'None',
    mfn: 'No',
    proRata: 'Pro-rata side letter',
    notes: 'Most common seed-stage SAFE. Cap is the primary protection mechanism.',
  },
  {
    name: 'Pre-Money SAFE (Typical)',
    source: 'Industry average',
    capRange: '$3M – $10M',
    discount: '15% – 20%',
    mfn: 'Sometimes',
    proRata: 'Sometimes included',
    notes: 'More investor-friendly. Cap and discount can both apply; investor gets the better of the two.',
  },
  {
    name: 'MFN SAFE (No cap/discount)',
    source: 'Industry average',
    capRange: 'None',
    discount: 'None',
    mfn: 'Yes',
    proRata: 'Varies',
    notes: 'Investor gets the most favorable terms offered to any future investor. Used in very early rounds.',
  },
  {
    name: 'Bridge SAFE (Late seed)',
    source: 'Industry average',
    capRange: '$8M – $20M',
    discount: '10% – 20%',
    mfn: 'No',
    proRata: 'Yes',
    notes: 'Used between priced rounds. Higher caps reflect later-stage company valuation.',
  },
];

const SAFE_TYPES = [
  {
    name: 'YC Post-Money SAFE',
    tag: 'post-money',
    tagColor: 'bg-violet-100 text-violet-700',
    when: 'Early-stage seed rounds, first institutional check',
    pros: [
      'Clear, predictable ownership at time of investment',
      'Investor knows exact % they will own post-conversion',
      'Widely understood by investors and counsel',
      'Standard YC template widely accepted',
    ],
    cons: [
      'Slightly more dilutive for founders than pre-money SAFE',
      'Multiple SAFEs can stack dilution in a non-obvious way',
    ],
    description:
      'The YC Post-Money SAFE fixes the percentage ownership the investor will receive at conversion. The cap is applied to the post-money valuation (i.e. after the investment), giving the investor certainty about their ownership stake relative to the company at the time of their investment.',
  },
  {
    name: 'Pre-Money SAFE',
    tag: 'pre-money',
    tagColor: 'bg-amber-100 text-amber-700',
    when: 'Pre-seed rounds, angel investments, non-YC startups',
    pros: [
      'Historically more common, many investors familiar with terms',
      'Can include both cap and discount (investor gets the better deal)',
      'Investor protected by both valuation ceiling and price discount',
    ],
    cons: [
      'Ownership percentage is uncertain at time of signing',
      'Multiple pre-money SAFEs can cause unexpected dilution',
      'More complex to model than post-money',
    ],
    description:
      'The Pre-Money SAFE applies the cap to the company\'s pre-money valuation at the next priced round. The investor benefits from whichever mechanism (cap or discount) gives them a lower conversion price. Ownership percentage is not fixed at the time of investment.',
  },
  {
    name: 'MFN SAFE',
    tag: 'mfn',
    tagColor: 'bg-sky-100 text-sky-700',
    when: 'Very early stage, before company has established valuation',
    pros: [
      'No cap negotiation required — useful when valuation is uncertain',
      'Investor protected against better terms given to future investors',
      'Simple to document and understand',
    ],
    cons: [
      'Investor has no defined price certainty',
      'Company must track all future SAFE terms carefully',
      'Can create complications if later SAFEs have complex terms',
    ],
    description:
      'The Most Favored Nation (MFN) SAFE has no valuation cap or discount. Instead, the investor receives an automatic right to adopt the terms of any future SAFE (or convertible note) that offers more favorable conversion terms. Commonly used in very early rounds when company valuation is uncertain.',
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return '-';
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

// ─── your SAFEs comparison ────────────────────────────────────────────────────

function YourSAFEsSection({ notes }) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400">
          No SAFE notes found. Add SAFEs from the Overview tab to compare them against market benchmarks.
        </p>
      </div>
    );
  }

  // Aggregate your SAFE data
  const totalAmount = notes.reduce((s, n) => s + (Number(n.investmentAmount) || 0), 0);
  const caps = notes.filter((n) => Number(n.valuationCap) > 0).map((n) => Number(n.valuationCap));
  const discounts = notes.filter((n) => Number(n.discountRate) > 0).map((n) => Number(n.discountRate));
  const avgCap = caps.length > 0 ? caps.reduce((a, b) => a + b, 0) / caps.length : null;
  const avgDiscount = discounts.length > 0 ? discounts.reduce((a, b) => a + b, 0) / discounts.length : null;
  const minCap = caps.length > 0 ? Math.min(...caps) : null;
  const maxCap = caps.length > 0 ? Math.max(...caps) : null;

  const comparisonRows = [
    {
      metric: 'Number of SAFEs',
      yours: notes.length.toString(),
      ycStandard: '1 – 5',
      industry: '1 – 10',
    },
    {
      metric: 'Total Raised',
      yours: fmtCurrency(totalAmount),
      ycStandard: '$500K – $2M',
      industry: '$250K – $5M',
    },
    {
      metric: 'Average Valuation Cap',
      yours: avgCap ? fmtCurrency(avgCap) : 'No cap',
      ycStandard: '$1M – $2M',
      industry: '$3M – $10M',
    },
    {
      metric: 'Cap Range',
      yours: minCap && maxCap ? `${fmtCurrency(minCap)} – ${fmtCurrency(maxCap)}` : caps.length === 1 ? fmtCurrency(caps[0]) : 'No caps',
      ycStandard: '$1M – $2M',
      industry: '$2M – $20M',
    },
    {
      metric: 'Average Discount Rate',
      yours: avgDiscount ? `${avgDiscount.toFixed(1)}%` : 'None',
      ycStandard: 'None',
      industry: '15% – 20%',
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Metric</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-blue-600 uppercase tracking-wide">Your SAFEs</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">YC Standard</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Industry Avg.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {comparisonRows.map((row) => (
            <tr key={row.metric}>
              <td className="px-4 py-3 font-medium text-gray-700">{row.metric}</td>
              <td className="px-4 py-3 text-blue-700 font-semibold">{row.yours}</td>
              <td className="px-4 py-3 text-gray-500">{row.ycStandard}</td>
              <td className="px-4 py-3 text-gray-500">{row.industry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['safeNotes'],
    queryFn: () => safeNoteService.getSafeNotes(),
  });

  const notes = Array.isArray(data) ? data : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Market Insights</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Compare your SAFE terms against market benchmarks and learn about common SAFE structures.
        </p>
      </div>

      {/* Market benchmarks table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Market Benchmarks</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Typical SAFE terms by structure type. Based on publicly available YC and industry data.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Structure', 'Source', 'Valuation Cap Range', 'Discount', 'MFN', 'Pro-Rata', 'Notes'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {BENCHMARKS.map((b) => (
                <tr key={b.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{b.name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{b.source}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{b.capRange}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{b.discount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      b.mfn === 'Yes' ? 'bg-green-100 text-green-700' : b.mfn === 'No' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.mfn}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{b.proRata}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{b.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
          <p className="text-xs text-gray-400">
            Benchmarks are indicative and based on publicly available data. Actual terms vary by company stage, sector, and negotiation.
          </p>
        </div>
      </div>

      {/* Your SAFEs vs benchmarks */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Your SAFEs vs. Market</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            How your current SAFE notes compare to typical market terms.
          </p>
        </div>
        {isLoading ? (
          <div className="py-8 flex justify-center"><LoadingSpinner /></div>
        ) : error ? (
          <div className="p-4"><ErrorMessage message={error.message || 'Failed to load SAFE notes'} onRetry={refetch} /></div>
        ) : (
          <YourSAFEsSection notes={notes} />
        )}
      </div>

      {/* Common SAFE types explainer */}
      <div className="mb-2">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Common SAFE Types Explained</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {SAFE_TYPES.map((type) => (
            <div key={type.name} className="bg-white rounded-lg shadow p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${type.tagColor}`}>
                  {type.tag.toUpperCase()}
                </span>
                <h3 className="text-sm font-bold text-gray-900">{type.name}</h3>
              </div>

              <p className="text-xs text-gray-600 mb-3 flex-1">{type.description}</p>

              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">Best used when:</p>
                <p className="text-xs text-gray-500">{type.when}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">Advantages</p>
                  <ul className="space-y-1">
                    {type.pros.map((pro) => (
                      <li key={pro} className="flex items-start gap-1 text-xs text-gray-600">
                        <span className="text-green-500 mt-0.5 shrink-0">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Considerations</p>
                  <ul className="space-y-1">
                    {type.cons.map((con) => (
                      <li key={con} className="flex items-start gap-1 text-xs text-gray-600">
                        <span className="text-red-400 mt-0.5 shrink-0">&minus;</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
        <p className="text-xs text-amber-800">
          <strong>Disclaimer:</strong> The information on this page is for educational purposes only and does not constitute legal or financial advice. SAFE terms vary significantly based on jurisdiction, investor preferences, and individual negotiations. Always consult qualified legal counsel before issuing or accepting SAFE instruments.
        </p>
      </div>
    </div>
  );
}
