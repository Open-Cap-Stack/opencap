'use client';

import { useState, useMemo } from 'react';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(value, opts = {}) {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return num.toLocaleString('en-US', opts);
}

function fmtCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return '$0';
  return `$${fmt(num, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(value, decimals = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `${num.toFixed(decimals)}%`;
}

// ─── math ─────────────────────────────────────────────────────────────────────

/**
 * Post-money SAFE conversion math:
 *
 * The SAFE converts at the lower of:
 *   - Conversion price via cap = valuation_cap / (existing_shares + safe_shares_via_cap)  [iterative]
 *   - Conversion price via discount = priced_round_price * (1 - discount_rate)
 *
 * For simplicity (and matching common SAFE modelling practice) we use:
 *   Safe shares = investment / conversion_price
 *   Conversion price = min(cap_price, discounted_price)
 *   Cap price = valuation_cap / existing_shares
 *   Post-money valuation = pre_money + investment
 *   Priced round price = pre_money / existing_shares
 *   Discounted price = priced_round_price * (1 - discount/100)
 */
function calculate(inputs) {
  const {
    preMoney,
    investment,
    valuationCap,
    discountRate,
    existingShares,
  } = inputs;

  const pre = Number(preMoney);
  const inv = Number(investment);
  const cap = Number(valuationCap);
  const disc = Number(discountRate);
  const shares = Number(existingShares);

  if (!pre || !inv || !shares) return null;

  const postMoney = pre + inv;
  const pricedRoundPrice = pre / shares;

  // Conversion price via cap (if cap provided)
  const capPrice = cap > 0 ? cap / shares : Infinity;

  // Conversion price via discount (if discount provided)
  const discountedPrice = disc > 0 ? pricedRoundPrice * (1 - disc / 100) : Infinity;

  // SAFE converts at the lower of the two mechanisms
  const conversionPrice = Math.min(
    capPrice < Infinity ? capPrice : Infinity,
    discountedPrice < Infinity ? discountedPrice : Infinity,
    pricedRoundPrice, // can never be worse than the round price
  );

  if (!isFinite(conversionPrice) || conversionPrice <= 0) return null;

  const safeShares = inv / conversionPrice;
  const totalSharesAfter = shares + safeShares;
  const ownershipPct = (safeShares / totalSharesAfter) * 100;
  const foundersOwnershipBefore = 100; // simplified: founders own 100% before
  const foundersOwnershipAfter = (shares / totalSharesAfter) * 100;
  const dilution = foundersOwnershipBefore - foundersOwnershipAfter;

  return {
    postMoney,
    pricedRoundPrice,
    capPrice: cap > 0 ? capPrice : null,
    discountedPrice: disc > 0 ? discountedPrice : null,
    conversionPrice,
    safeShares,
    totalSharesAfter,
    ownershipPct,
    foundersOwnershipAfter,
    dilution,
    capActive: cap > 0 && capPrice <= discountedPrice,
    discountActive: disc > 0 && discountedPrice < capPrice,
  };
}

// ─── input field ──────────────────────────────────────────────────────────────

function Field({ label, hint, prefix, suffix, value, onChange, placeholder, min = '0', step = '1' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── result row ───────────────────────────────────────────────────────────────

function ResultRow({ label, value, highlight, sub }) {
  return (
    <div className={`flex items-start justify-between py-3 border-b border-gray-100 last:border-0 ${highlight ? 'bg-blue-50 -mx-4 px-4 rounded-md' : ''}`}>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm font-semibold tabular-nums ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

// ─── dilution table ───────────────────────────────────────────────────────────

function DilutionTable({ result, inputs }) {
  const existingShares = Number(inputs.existingShares);
  const safeShares = result.safeShares;
  const totalShares = result.totalSharesAfter;

  const rows = [
    {
      party: 'Existing shareholders (pre-SAFE)',
      sharesBefore: existingShares,
      sharesAfter: existingShares,
      ownershipBefore: '100.00%',
      ownershipAfter: fmtPct(result.foundersOwnershipAfter),
      dilution: `-${fmtPct(result.dilution)}`,
      dilutionClass: 'text-red-600',
    },
    {
      party: 'SAFE investor',
      sharesBefore: 0,
      sharesAfter: safeShares,
      ownershipBefore: '0.00%',
      ownershipAfter: fmtPct(result.ownershipPct),
      dilution: `+${fmtPct(result.ownershipPct)}`,
      dilutionClass: 'text-green-600',
    },
    {
      party: 'Total',
      sharesBefore: existingShares,
      sharesAfter: totalShares,
      ownershipBefore: '100.00%',
      ownershipAfter: '100.00%',
      dilution: '-',
      dilutionClass: 'text-gray-500',
      isTotal: true,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Party</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Shares Before</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Shares After</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Ownership Before</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Ownership After</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.party} className={row.isTotal ? 'bg-gray-50 font-semibold' : ''}>
              <td className="px-4 py-3 text-gray-900">{row.party}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{fmt(Math.round(row.sharesBefore))}</td>
              <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{fmt(Math.round(row.sharesAfter))}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{row.ownershipBefore}</td>
              <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{row.ownershipAfter}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-medium ${row.dilutionClass}`}>{row.dilution}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const defaultInputs = {
  preMoney: '',
  investment: '',
  valuationCap: '',
  discountRate: '',
  existingShares: '',
};

export default function DilutionCalculatorPage() {
  const [inputs, setInputs] = useState(defaultInputs);
  const [calculated, setCalculated] = useState(false);

  const set = (key) => (val) => setInputs((prev) => ({ ...prev, [key]: val }));

  const result = useMemo(() => calculate(inputs), [inputs]);

  const canCalculate =
    inputs.preMoney && inputs.investment && inputs.existingShares &&
    Number(inputs.preMoney) > 0 && Number(inputs.investment) > 0 && Number(inputs.existingShares) > 0;

  const handleCalculate = () => {
    if (canCalculate) setCalculated(true);
  };

  const handleClear = () => {
    setInputs(defaultInputs);
    setCalculated(false);
  };

  const showResults = calculated && result !== null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SAFE Dilution Calculator</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Model how a SAFE note will convert and impact cap table ownership at the next priced round.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Inputs</h2>

          <div className="space-y-4">
            <Field
              label="Pre-money Valuation"
              hint="Company valuation before the SAFE investment"
              prefix="$"
              value={inputs.preMoney}
              onChange={set('preMoney')}
              placeholder="e.g. 8000000"
            />
            <Field
              label="SAFE Investment Amount"
              hint="Total amount being invested via SAFE"
              prefix="$"
              value={inputs.investment}
              onChange={set('investment')}
              placeholder="e.g. 500000"
            />
            <Field
              label="Valuation Cap"
              hint="Maximum company valuation for conversion purposes (optional)"
              prefix="$"
              value={inputs.valuationCap}
              onChange={set('valuationCap')}
              placeholder="e.g. 10000000"
            />
            <Field
              label="Discount Rate"
              hint="Discount applied to the priced round share price at conversion (optional)"
              suffix="%"
              value={inputs.discountRate}
              onChange={set('discountRate')}
              placeholder="e.g. 20"
              min="0"
              step="0.1"
            />
            <Field
              label="Existing Shares Outstanding"
              hint="Total shares currently issued (pre-money, fully diluted)"
              value={inputs.existingShares}
              onChange={set('existingShares')}
              placeholder="e.g. 10000000"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Calculate
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>

          {canCalculate && !showResults && (
            <p className="text-xs text-gray-400 mt-2 text-center">Click Calculate to see results</p>
          )}
        </div>

        {/* Results panel */}
        <div className={`bg-white rounded-lg shadow p-6 transition-opacity ${showResults ? 'opacity-100' : 'opacity-40'}`}>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Results</h2>

          {!showResults ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Enter values and click Calculate to see dilution results.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <ResultRow
                label="Post-money Valuation"
                value={fmtCurrency(result.postMoney)}
                sub="Pre-money + SAFE investment"
              />
              <ResultRow
                label="Priced Round Share Price"
                value={`$${result.pricedRoundPrice.toFixed(4)}`}
                sub="Pre-money valuation / existing shares"
              />
              {result.capPrice !== null && (
                <ResultRow
                  label="Cap Conversion Price"
                  value={`$${result.capPrice.toFixed(4)}`}
                  sub="Valuation cap / existing shares"
                />
              )}
              {result.discountedPrice !== null && (
                <ResultRow
                  label="Discounted Conversion Price"
                  value={`$${result.discountedPrice.toFixed(4)}`}
                  sub={`Priced round price × (1 - ${inputs.discountRate}%)`}
                />
              )}
              <ResultRow
                label="Effective Conversion Price"
                value={`$${result.conversionPrice.toFixed(4)}`}
                highlight
                sub={result.capActive ? 'Cap mechanism applies' : result.discountActive ? 'Discount mechanism applies' : 'At round price (no cap/discount)'}
              />
              <ResultRow
                label="Shares Issued to SAFE Investor"
                value={fmt(Math.round(result.safeShares))}
                sub="Investment amount / conversion price"
              />
              <ResultRow
                label="SAFE Investor Ownership"
                value={fmtPct(result.ownershipPct)}
                highlight
                sub="Shares issued / total shares after conversion"
              />
              <ResultRow
                label="Existing Shareholder Ownership"
                value={fmtPct(result.foundersOwnershipAfter)}
                sub="After SAFE conversion"
              />
              <ResultRow
                label="Dilution Impact"
                value={`-${fmtPct(result.dilution)}`}
                sub="Ownership transferred to SAFE investor"
              />
            </div>
          )}
        </div>
      </div>

      {/* Dilution impact table */}
      {showResults && result && (
        <div className="bg-white rounded-lg shadow mt-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Dilution Impact Table</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ownership breakdown before and after SAFE conversion</p>
          </div>
          <DilutionTable result={result} inputs={inputs} />
        </div>
      )}

      {/* Math explanation */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 mt-6 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">How the math works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-800 mb-1">Conversion Price</p>
              <p>The SAFE converts at the <strong>lower</strong> of two mechanisms:</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-gray-500 ml-2">
                <li><strong>Cap price</strong> = Valuation cap &divide; Existing shares</li>
                <li><strong>Discounted price</strong> = Priced round price &times; (1 &minus; discount%)</li>
              </ul>
              <p className="text-xs text-gray-500 mt-1">
                A lower conversion price means more shares for the investor, which benefits them.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800 mb-1">Shares Issued</p>
              <p className="text-xs text-gray-500">Shares issued = Investment &divide; Conversion price</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-800 mb-1">Ownership Percentage</p>
              <p className="text-xs text-gray-500">
                SAFE investor ownership = Shares issued &divide; (Existing shares + Shares issued)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Note: This is a simplified model. Real-world conversions may include an option pool refresh,
                additional SAFEs, and other securities that further affect ownership.
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800 mb-1">Post-Money Valuation</p>
              <p className="text-xs text-gray-500">
                Post-money = Pre-money + SAFE investment amount
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
