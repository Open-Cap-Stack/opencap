'use client';

// ─── template data ────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'yc-post-money',
    name: 'YC Post-Money SAFE',
    badge: 'Most Common',
    badgeColor: 'bg-violet-100 text-violet-700',
    tagline: 'The Y Combinator standard SAFE, updated in 2018.',
    description:
      'The YC Post-Money SAFE is the most widely used seed-stage investment instrument in the startup ecosystem. It gives investors a clearly defined ownership percentage upon conversion, making it predictable for both founders and investors. Updated by Y Combinator in 2018, it has become the de facto standard for early-stage fundraising in the US.',
    keyTerms: [
      { label: 'Valuation Cap', value: 'Negotiated (typically $1M – $15M at seed)' },
      { label: 'Discount Rate', value: 'None (standard template)' },
      { label: 'MFN Clause', value: 'Not included' },
      { label: 'Pro-Rata Rights', value: 'Available via separate side letter' },
      { label: 'Conversion Event', value: 'Next equity financing round' },
      { label: 'Liquidity Preference', value: 'Cash out option at 1x' },
      { label: 'Governing Law', value: 'Delaware (standard)' },
    ],
    whenToUse: [
      'First check from a seed investor or angel',
      'Fundraising from multiple investors in a rolling seed round',
      'When you want a simple, well-understood instrument',
      'When working with YC-familiar investors',
    ],
    downloadPath: '/templates/safe-yc-post-money.pdf',
  },
  {
    id: 'standard-pre-money',
    name: 'Standard Pre-Money SAFE',
    badge: 'Investor-Friendly',
    badgeColor: 'bg-amber-100 text-amber-700',
    tagline: 'Cap and discount combine — investor gets the better terms.',
    description:
      'The Pre-Money SAFE predates the YC Post-Money SAFE and remains widely used, particularly with investors who prefer both a valuation cap and a discount rate. Unlike the post-money version, ownership percentage is not fixed at signing — it depends on the fully diluted shares at the next priced round, which can make it harder to model dilution in advance.',
    keyTerms: [
      { label: 'Valuation Cap', value: 'Negotiated (lower of cap or discounted price)' },
      { label: 'Discount Rate', value: '15% – 20% (investor gets the better of cap or discount)' },
      { label: 'MFN Clause', value: 'Sometimes included' },
      { label: 'Pro-Rata Rights', value: 'Often included in the agreement itself' },
      { label: 'Conversion Event', value: 'Next equity financing (typically Series A)' },
      { label: 'Liquidity Preference', value: '1x non-participating' },
      { label: 'Governing Law', value: 'State of incorporation' },
    ],
    whenToUse: [
      'Working with investors who prefer the pre-2018 YC structure',
      'When investors want both a cap and a discount protection',
      'International investors familiar with pre-money structures',
      'When the deal warrants additional investor protections',
    ],
    downloadPath: '/templates/safe-pre-money.pdf',
  },
  {
    id: 'mfn-safe',
    name: 'MFN SAFE',
    badge: 'No Cap / No Discount',
    badgeColor: 'bg-sky-100 text-sky-700',
    tagline: 'Investor automatically receives the best terms offered to any future SAFE investor.',
    description:
      'The Most Favored Nation (MFN) SAFE has no valuation cap and no discount rate. Instead, the investor is granted a contractual right to receive the most favorable terms given to any subsequent SAFE investor. This structure is most commonly used in very early rounds where the company valuation is not yet established, or as a "bridge" instrument before a more formal fundraise.',
    keyTerms: [
      { label: 'Valuation Cap', value: 'None at signing (adopts future investor terms)' },
      { label: 'Discount Rate', value: 'None at signing (adopts future investor terms)' },
      { label: 'MFN Clause', value: 'Yes — core feature of the instrument' },
      { label: 'Pro-Rata Rights', value: 'May be adopted from future SAFE terms' },
      { label: 'Conversion Event', value: 'Next equity financing round' },
      { label: 'Liquidity Preference', value: '1x (adopts future terms if better)' },
      { label: 'Governing Law', value: 'State of incorporation' },
    ],
    whenToUse: [
      'Pre-seed round before company valuation is established',
      'Friends and family rounds where simplicity is key',
      'When founders are not yet comfortable setting a cap',
      'Bridge funding between established milestones',
    ],
    downloadPath: '/templates/safe-mfn.pdf',
  },
];

// ─── components ───────────────────────────────────────────────────────────────

function TemplateCard({ template }) {
  return (
    <div className="bg-white rounded-lg shadow flex flex-col">
      {/* Card header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-bold text-gray-900">{template.name}</h3>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${template.badgeColor}`}>
            {template.badge}
          </span>
        </div>
        <p className="text-xs font-medium text-gray-500 mb-2">{template.tagline}</p>
        <p className="text-sm text-gray-600 leading-relaxed">{template.description}</p>
      </div>

      {/* Key terms */}
      <div className="p-6 flex-1">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Key Terms</h4>
        <dl className="space-y-2">
          {template.keyTerms.map((term) => (
            <div key={term.label} className="flex flex-col sm:flex-row sm:gap-2">
              <dt className="text-xs font-medium text-gray-500 sm:w-36 shrink-0">{term.label}</dt>
              <dd className="text-xs text-gray-700">{term.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* When to use */}
      <div className="px-6 pb-4">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">When to use</h4>
        <ul className="space-y-1">
          {template.whenToUse.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
              <svg className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Download button */}
      <div className="px-6 pb-6">
        <a
          href={template.downloadPath}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          aria-label={`Download ${template.name} template`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template
        </a>
        <p className="text-xs text-gray-400 text-center mt-1.5">PDF format</p>
      </div>
    </div>
  );
}

// ─── usage guide rows ─────────────────────────────────────────────────────────

const USAGE_GUIDE = [
  {
    stage: 'Pre-Seed / Friends & Family',
    recommended: 'MFN SAFE',
    reason: 'No valuation needed, simplest instrument, appropriate for small checks from personal network.',
    amount: '$25K – $250K',
  },
  {
    stage: 'Seed (First institutional round)',
    recommended: 'YC Post-Money SAFE',
    reason: 'Widely understood, gives investor predictable ownership %, easy to stack multiple investors.',
    amount: '$500K – $3M',
  },
  {
    stage: 'Seed (Investor-led, seeking discounts)',
    recommended: 'Pre-Money SAFE',
    reason: 'Investor-friendly, provides both cap and discount protection, preferred by some institutional seed funds.',
    amount: '$500K – $5M',
  },
  {
    stage: 'Bridge Round',
    recommended: 'YC Post-Money SAFE',
    reason: 'Established company valuation makes a post-money SAFE easy to model. MFN not appropriate at this stage.',
    amount: '$500K – $2M',
  },
];

// ─── page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">SAFE Templates</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Download standard SAFE note templates. Review with legal counsel before use.
        </p>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {/* Which template to use guide */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Which template should I use?</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            A quick guide based on stage and investor profile.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Stage', 'Recommended', 'Typical Amount', 'Rationale'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {USAGE_GUIDE.map((row) => (
                <tr key={row.stage} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.stage}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                      {row.recommended}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.amount}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-sm">{row.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Important notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Before you use a template</h3>
          <ul className="space-y-1.5">
            {[
              'Have a securities attorney review the document before signing',
              'Ensure compliance with your state and federal securities laws',
              'Confirm your company is incorporated in Delaware (required for standard YC templates)',
              'Discuss pro-rata rights and information rights with your legal counsel',
              'Check if you need to file Form D with the SEC after closing',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs text-blue-800">
                <svg className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Additional resources</h3>
          <ul className="space-y-2">
            {[
              { label: 'Y Combinator SAFE documents', href: 'https://www.ycombinator.com/documents' },
              { label: 'SEC guidance on SAFEs', href: 'https://www.sec.gov/oiea/investor-alerts-and-bulletins/ib_safes' },
              { label: 'NVCA model legal documents', href: 'https://nvca.org/model-legal-documents/' },
              { label: 'SAFE primer (Cooley LLP)', href: 'https://www.cooleygo.com/documents/safe-financing-documents/' },
            ].map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-3">
            External links open in a new tab. OpenCap Stack is not affiliated with these resources.
          </p>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
        <p className="text-xs text-amber-800">
          <strong>Legal Disclaimer:</strong> The SAFE templates provided here are for informational and educational purposes only. They do not constitute legal advice. OpenCap Stack makes no representations about the suitability of these documents for any specific transaction. You should consult a qualified attorney before using any of these templates. Securities laws vary by jurisdiction and individual circumstances.
        </p>
      </div>
    </div>
  );
}
