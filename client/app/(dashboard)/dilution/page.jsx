'use client';

import { useState } from 'react';
import api from '@/lib/api';

// ─── formatters ───────────────────────────────────────────────────────────────

function formatCurrency(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatNumber(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  return num.toLocaleString('en-US');
}

function formatPct(value) {
  const num = Number(value);
  if (value === '' || value === null || value === undefined || Number.isNaN(num)) return '-';
  return `${num.toFixed(2)}%`;
}

// ─── shared primitives ────────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
      {...props}
    />
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
      {message}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function EmptyState({ icon, heading, body }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
      <div className="mb-3 text-4xl">{icon}</div>
      <p className="text-sm font-medium text-gray-500 mb-1">{heading}</p>
      <p className="text-xs text-gray-400 max-w-xs">{body}</p>
    </div>
  );
}

// ─── table primitives ─────────────────────────────────────────────────────────

function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children, highlight }) {
  return (
    <td
      className={`px-4 py-3 whitespace-nowrap ${
        highlight ? 'font-semibold text-gray-900' : 'text-gray-700'
      }`}
    >
      {children}
    </td>
  );
}

// ─── panel card wrapper ───────────────────────────────────────────────────────

function PanelCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-lg shadow flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-6 py-5 flex flex-col gap-6 flex-1">{children}</div>
    </div>
  );
}

// ─── dilution panel ───────────────────────────────────────────────────────────

const DILUTION_DEFAULTS = {
  preMoney: '',
  newInvestment: '',
  existingShares: '',
};

function DilutionPanel() {
  const [form, setForm] = useState(DILUTION_DEFAULTS);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCalculate(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResults(null);

    const preMoney = Number(form.preMoney);
    const newInvestment = Number(form.newInvestment);
    const existingShares = Number(form.existingShares);

    // Derive newShares from investment and post-money price per share.
    // post-money = preMoney + newInvestment
    // price per share = preMoney / existingShares
    // newShares = newInvestment / pricePerShare
    const pricePerShare = preMoney / existingShares;
    const newShares = Math.round(newInvestment / pricePerShare);

    try {
      const response = await api.post('/dilution/calculate', {
        companyId: 'default',
        newShares,
        preMoney,
        existingShares,
      });
      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to calculate dilution. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Normalise the API response — support both array-of-rows and {ownership:[]} shapes.
  const rows = Array.isArray(results)
    ? results
    : Array.isArray(results?.ownership)
    ? results.ownership
    : [];

  const DILUTION_HEADERS = [
    'Stakeholder / Class',
    'Shares Before',
    'Shares After',
    '% Before',
    '% After',
    'Dilution',
  ];

  return (
    <PanelCard
      title="Dilution Modeling"
      subtitle="Calculate ownership changes from a new investment round."
    >
      {/* Input form */}
      <form onSubmit={handleCalculate} className="space-y-4">
        <ErrorBanner message={error} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label required>Pre-money valuation ($)</Label>
            <Input
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 10000000"
              value={form.preMoney}
              onChange={(e) => setField('preMoney', e.target.value)}
            />
          </div>

          <div>
            <Label required>New investment ($)</Label>
            <Input
              type="number"
              min="1"
              step="any"
              required
              placeholder="e.g. 2000000"
              value={form.newInvestment}
              onChange={(e) => setField('newInvestment', e.target.value)}
            />
          </div>

          <div>
            <Label required>Existing shares (#)</Label>
            <Input
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 10000000"
              value={form.existingShares}
              onChange={(e) => setField('existingShares', e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading && <Spinner />}
            {loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        {rows.length > 0 ? (
          <Table headers={DILUTION_HEADERS}>
            {rows.map((row, i) => {
              const dilutionPct =
                row.dilutionPct ??
                (row.pctBefore !== undefined && row.pctAfter !== undefined
                  ? row.pctBefore - row.pctAfter
                  : null);
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <Td highlight>{row.stakeholder ?? row.shareClass ?? row.name ?? `Row ${i + 1}`}</Td>
                  <Td>{formatNumber(row.sharesBefore ?? row.shares_before)}</Td>
                  <Td>{formatNumber(row.sharesAfter ?? row.shares_after)}</Td>
                  <Td>{formatPct(row.pctBefore ?? row.pct_before)}</Td>
                  <Td>{formatPct(row.pctAfter ?? row.pct_after)}</Td>
                  <Td>
                    {dilutionPct !== null ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          dilutionPct > 0
                            ? 'bg-red-50 text-red-700'
                            : dilutionPct < 0
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {dilutionPct > 0 ? '-' : dilutionPct < 0 ? '+' : ''}
                        {Math.abs(dilutionPct).toFixed(2)}%
                      </span>
                    ) : (
                      '-'
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            icon="&#x1F4CA;"
            heading="No results yet"
            body="Enter a pre-money valuation, new investment amount, and existing share count, then click Calculate."
          />
        )}
      </div>
    </PanelCard>
  );
}

// ─── waterfall panel ──────────────────────────────────────────────────────────

const DEFAULT_SHARE_CLASSES = [
  { name: 'Series A Preferred', preference: '' },
  { name: 'Common', preference: '' },
];

function WaterfallPanel() {
  const [exitProceeds, setExitProceeds] = useState('');
  const [shareClasses, setShareClasses] = useState(DEFAULT_SHARE_CLASSES);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function updateShareClass(index, field, value) {
    setShareClasses((prev) =>
      prev.map((sc, i) => (i === index ? { ...sc, [field]: value } : sc))
    );
  }

  function addShareClass() {
    setShareClasses((prev) => [...prev, { name: '', preference: '' }]);
  }

  function removeShareClass(index) {
    setShareClasses((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResults(null);

    try {
      const response = await api.post('/waterfall/analyze', {
        companyId: 'default',
        exitProceeds: Number(exitProceeds),
        shareClasses: shareClasses.map((sc) => ({
          name: sc.name,
          liquidationPreference: sc.preference !== '' ? Number(sc.preference) : 0,
        })),
      });
      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to run waterfall analysis. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  // Normalise API response — support both array-of-rows and {payouts:[]} shapes.
  const rows = Array.isArray(results)
    ? results
    : Array.isArray(results?.payouts)
    ? results.payouts
    : Array.isArray(results?.waterfall)
    ? results.waterfall
    : [];

  const WATERFALL_HEADERS = ['Share Class', 'Liquidation Preference', 'Payout', '% of Proceeds'];

  return (
    <PanelCard
      title="Waterfall Analysis"
      subtitle="Model exit payout distribution across share classes."
    >
      {/* Input form */}
      <form onSubmit={handleAnalyze} className="space-y-4">
        <ErrorBanner message={error} />

        {/* Exit proceeds */}
        <div>
          <Label required>Exit proceeds ($)</Label>
          <Input
            type="number"
            min="1"
            step="any"
            required
            placeholder="e.g. 50000000"
            value={exitProceeds}
            onChange={(e) => setExitProceeds(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Share classes table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Share classes</Label>
            <button
              type="button"
              onClick={addShareClass}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add row
            </button>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Liquidation Preference ($)
                  </th>
                  <th className="w-10" aria-label="Remove row" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {shareClasses.map((sc, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Series A Preferred"
                        value={sc.name}
                        onChange={(e) => updateShareClass(i, 'name', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={sc.preference}
                        onChange={(e) => updateShareClass(i, 'preference', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {shareClasses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeShareClass(i)}
                          aria-label={`Remove ${sc.name || 'row'}`}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading && <Spinner />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        {rows.length > 0 ? (
          <Table headers={WATERFALL_HEADERS}>
            {rows.map((row, i) => {
              const totalProceeds = Number(exitProceeds) || 1;
              const payout = row.payout ?? row.amount ?? 0;
              const proceedsPct =
                row.pctOfProceeds ??
                row.pct_of_proceeds ??
                ((payout / totalProceeds) * 100);
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <Td highlight>{row.shareClass ?? row.name ?? row.class ?? `Row ${i + 1}`}</Td>
                  <Td>{formatCurrency(row.liquidationPreference ?? row.preference ?? 0)}</Td>
                  <Td>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(payout)}
                    </span>
                  </Td>
                  <Td>{formatPct(proceedsPct)}</Td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <EmptyState
            icon="&#x1F4B0;"
            heading="No results yet"
            body="Enter exit proceeds, configure your share classes with liquidation preferences, then click Analyze."
          />
        )}
      </div>
    </PanelCard>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DilutionPage() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dilution &amp; Waterfall Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Model the impact of new investment rounds on ownership and simulate exit payouts across
          share classes.
        </p>
      </div>

      {/* Two-panel grid: side-by-side on lg+, stacked on mobile */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <DilutionPanel />
        <WaterfallPanel />
      </div>
    </div>
  );
}
