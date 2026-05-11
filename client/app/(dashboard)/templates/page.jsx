'use client';

import { useState } from 'react';
import { FileText, Eye, Copy, X, CheckCircle } from 'lucide-react';

// ── Template data (static — no API required) ──────────────────────────────────

const TEMPLATES = [
  {
    id: 'stock-option-grant',
    name: 'Stock Option Grant Agreement',
    category: 'Equity',
    description:
      'Standard ISO/NSO stock option grant agreement covering vesting schedule, exercise price, and terms of the option.',
    preview: `STOCK OPTION GRANT AGREEMENT

This Stock Option Grant Agreement (this "Agreement") is entered into as of [DATE] between [COMPANY NAME], a Delaware corporation (the "Company"), and [GRANTEE NAME] (the "Optionee").

1. GRANT OF OPTION
Subject to the terms and conditions of this Agreement and the Company's [YEAR] Equity Incentive Plan (the "Plan"), the Company hereby grants to the Optionee an option to purchase up to [NUMBER] shares of the Company's Common Stock at an exercise price of $[PRICE] per share.

2. VESTING SCHEDULE
The option shall vest over a four (4) year period, with 25% of the shares vesting on the one-year anniversary of the Vesting Commencement Date and the remaining shares vesting monthly thereafter over the following 36 months, subject to Optionee's continued service.

3. TERM
The option shall expire on the tenth (10th) anniversary of the Grant Date, unless terminated earlier in accordance with the Plan.

[Additional provisions omitted — use full template for complete agreement]`,
  },
  {
    id: 'safe-yc-post-money',
    name: 'SAFE Agreement — YC Post-Money',
    category: 'SAFE',
    description:
      'Y Combinator Post-Money SAFE (Simple Agreement for Future Equity) template for early-stage fundraising.',
    preview: `SIMPLE AGREEMENT FOR FUTURE EQUITY (POST-MONEY SAFE)

THIS CERTIFIES THAT in exchange for the payment by [INVESTOR NAME] (the "Investor") of $[INVESTMENT AMOUNT] (the "Purchase Amount") on or about [DATE], [COMPANY NAME], a Delaware corporation (the "Company"), hereby issues to the Investor the right to certain shares of the Company's capital stock, subject to the terms set forth below.

1. EVENTS
  (a) Equity Financing. If there is an Equity Financing before the expiration or termination of this instrument, the Company will automatically issue to the Investor a number of shares of Safe Preferred Stock equal to the Purchase Amount divided by the Conversion Price.

2. DEFINITIONS
  "Post-Money Valuation Cap" means $[VALUATION CAP].
  "Discount Rate" means [DISCOUNT]%.
  "Conversion Price" means the lower of (i) the Safe Price or (ii) the Discount Price.

[Additional provisions omitted — use full template for complete agreement]`,
  },
  {
    id: 'board-consent-option-grant',
    name: 'Board Consent — Option Grant',
    category: 'Board',
    description:
      'Written consent of the board of directors approving stock option grants to employees and service providers.',
    preview: `WRITTEN CONSENT OF THE BOARD OF DIRECTORS
OF [COMPANY NAME]

In lieu of a special meeting, the undersigned, being all of the members of the Board of Directors (the "Board") of [COMPANY NAME], a Delaware corporation (the "Company"), hereby consent to and adopt the following resolutions:

WHEREAS, the Board has determined that it is in the best interests of the Company and its stockholders to grant stock options to the employees and service providers listed below;

NOW, THEREFORE, BE IT RESOLVED, that the Company is hereby authorized and directed to grant options to purchase shares of Common Stock as follows:

  Grantee: [NAME]
  Shares: [NUMBER]
  Exercise Price: $[PRICE] per share
  Vesting: 4-year, 1-year cliff

RESOLVED FURTHER, that the officers of the Company are authorized to execute all documents necessary to effect the foregoing.

____________________________
[Director Name], Director   Date: __________`,
  },
  {
    id: 'rspa',
    name: 'Restricted Stock Purchase Agreement',
    category: 'Equity',
    description:
      'Agreement for the purchase of restricted shares subject to vesting and right of repurchase by the company.',
    preview: `RESTRICTED STOCK PURCHASE AGREEMENT

This Restricted Stock Purchase Agreement (this "Agreement") is made as of [DATE] between [COMPANY NAME], a Delaware corporation (the "Company"), and [PURCHASER NAME] (the "Purchaser").

1. PURCHASE AND SALE OF RESTRICTED STOCK
Subject to the terms of this Agreement, the Company hereby sells to the Purchaser and the Purchaser hereby purchases from the Company [NUMBER] shares of Common Stock (the "Shares") at a purchase price of $[PRICE] per share, for a total purchase price of $[TOTAL].

2. RESTRICTED STOCK
The Shares shall be subject to the Company's right of repurchase as follows:
  (a) Unvested Shares may be repurchased by the Company at the original purchase price upon termination of the Purchaser's service.
  (b) Shares vest monthly over [PERIOD], subject to continued service.

3. SECTION 83(b) ELECTION
Purchaser acknowledges the advisability of filing an election under Section 83(b) of the Internal Revenue Code within 30 days of the date of this Agreement.

[Additional provisions omitted — use full template for complete agreement]`,
  },
  {
    id: 'cap-table-snapshot',
    name: 'Cap Table Snapshot Export',
    category: 'Cap Table',
    description:
      'Standardized cap table snapshot template for sharing ownership data with investors and legal counsel.',
    preview: `CAP TABLE SNAPSHOT
[COMPANY NAME]
As of [DATE]

===================================================
FULLY DILUTED CAPITALIZATION SUMMARY
===================================================

COMMON STOCK
  Founders                    [SHARES]    [%]
  Employees (issued)          [SHARES]    [%]
  ─────────────────────────────────────────────
  Total Common Outstanding    [SHARES]    [%]

PREFERRED STOCK
  Series Seed                 [SHARES]    [%]
  Series A                    [SHARES]    [%]
  ─────────────────────────────────────────────
  Total Preferred Outstanding [SHARES]    [%]

OPTION POOL
  Options granted (vested)    [SHARES]    [%]
  Options granted (unvested)  [SHARES]    [%]
  Options available           [SHARES]    [%]
  ─────────────────────────────────────────────
  Total Option Pool           [SHARES]    [%]

WARRANTS                      [SHARES]    [%]
SAFEs (converted equiv.)      [SHARES]    [%]

===================================================
TOTAL FULLY DILUTED             [SHARES]  100.00%
===================================================

Note: This snapshot is for informational purposes only.`,
  },
  {
    id: 'investor-update',
    name: 'Investor Update Template',
    category: 'Legal',
    description:
      'Monthly/quarterly investor update template covering key metrics, highlights, and asks.',
    preview: `INVESTOR UPDATE — [MONTH YEAR]

Hi [Investor First Name],

Here is our update for [PERIOD].

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KEY METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ARR:          $[AMOUNT] ([+/-]% MoM)
  MRR:          $[AMOUNT]
  Customers:    [NUMBER] ([+/-] this month)
  Runway:       [X] months
  Cash on hand: $[AMOUNT]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HIGHLIGHTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • [Highlight 1]
  • [Highlight 2]
  • [Highlight 3]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOWLIGHTS / CHALLENGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • [Challenge 1]
  • [Challenge 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • [Intro to X]
  • [Feedback on Y]

Thank you for your continued support.

[FOUNDER NAME]
[TITLE], [COMPANY NAME]`,
  },
];

const ALL_CATEGORIES = ['All', 'Cap Table', 'Equity', 'Board', 'SAFE', 'Legal'];

const CATEGORY_COLORS = {
  Equity: 'bg-blue-100 text-blue-700',
  SAFE: 'bg-purple-100 text-purple-700',
  Board: 'bg-amber-100 text-amber-700',
  'Cap Table': 'bg-green-100 text-green-700',
  Legal: 'bg-gray-100 text-gray-700',
};

function categoryBadge(cat) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {cat}
    </span>
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────

function PreviewModal({ template, onClose }) {
  if (!template) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">{template.name}</h2>
            <span className="ml-1">{categoryBadge(template.category)}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-500 mb-4">{template.description}</p>
          <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {template.preview}
          </pre>
          <p className="mt-3 text-xs text-gray-400">
            This is an excerpt. The full template contains additional provisions.
          </p>
        </div>
        <div className="p-4 border-t shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function UseTemplateModal({ template, onClose }) {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!template) return null;

  const handleConfirm = async () => {
    setLoading(true);
    // Simulate brief processing — no API required for static templates
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setConfirmed(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={!loading ? onClose : undefined} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Use template</h2>
          {!loading && (
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
              &times;
            </button>
          )}
        </div>
        <div className="p-4">
          {confirmed ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Template copied to your documents</p>
              <p className="text-sm text-gray-500">
                Find <span className="font-medium">{template.name}</span> in your Documents section.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 mb-4">
                <FileText size={20} className="text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">{template.name}</p>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 mb-4">
                This template will be copied to your documents where you can edit and customize it.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Copying...' : 'Confirm — copy to documents'}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, onPreview, onUse }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
          <FileText size={20} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug">{template.name}</p>
          <div className="mt-1">{categoryBadge(template.category)}</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 flex-1 mb-4 leading-relaxed">{template.description}</p>
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onUse(template)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
        >
          <Copy size={12} />
          Use template
        </button>
        <button
          onClick={() => onPreview(template)}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 text-gray-600 border border-gray-300 text-xs rounded-md hover:bg-gray-50"
        >
          <Eye size={12} />
          Preview
        </button>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [useTemplate, setUseTemplate] = useState(null);

  const filtered =
    activeCategory === 'All'
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Start from a professionally drafted template — customize and add to your documents
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { label: 'Documents', href: '/documents' },
          { label: 'Data Rooms', href: '/data-rooms' },
          { label: 'Access Control', href: '/document-access' },
          { label: 'Templates', href: '/templates' },
        ].map((tab) => (
          <a
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab.href === '/templates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
            {cat !== 'All' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({TEMPLATES.filter((t) => t.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No templates in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={setPreviewTemplate}
              onUse={setUseTemplate}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {previewTemplate && (
        <PreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
      {useTemplate && (
        <UseTemplateModal template={useTemplate} onClose={() => setUseTemplate(null)} />
      )}
    </div>
  );
}
