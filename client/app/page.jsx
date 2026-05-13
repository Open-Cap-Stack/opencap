import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata = {
  title: 'OpenCap Stack — Open Source Cap Table & Equity Management',
  description:
    'Open-source cap table management for startups. Track stakeholders, issue equity, model dilution, manage SAFE notes, run 409A valuations, and control your equity from any AI chat via MCP. Aligned with OCTA v2.0.',
  openGraph: {
    title: 'OpenCap Stack — Open Source Cap Table & Equity Management',
    description:
      'Open-source cap table management for startups. OCTA v2.0 aligned. SAFE notes, dilution modeling, 409A valuations, MCP server, and document version control.',
    url: 'https://opencapstack.com',
    siteName: 'OpenCap Stack',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'OpenCap Stack' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenCap Stack — Open Source Cap Table & Equity Management',
    description: 'Open-source cap table management for startups. OCTA v2.0 aligned.',
    images: ['/og-image.svg'],
  },
};

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const features = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
    title: 'Cap Table Management',
    description: 'Full OCTA v2.0 schema compliance. Issue, track, and audit every share class, stakeholder, and equity event with industry-standard data structures.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    title: 'SAFE Notes & Convertible Instruments',
    description: 'Model SAFE notes and convertible notes from first principles. Track conversion triggers, discount rates, valuation caps, and pro-rata rights across every round.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
      </svg>
    ),
    title: 'Dilution Modeling & Waterfall Analysis',
    description: 'Run scenario-based dilution models and waterfall analyses. Understand how new rounds, option pool refreshes, and conversion events affect every stakeholder.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: '409A Valuations & Vesting',
    description: 'Support your 409A valuation process with structured data exports. Configure cliff, linear, and custom vesting schedules with full audit trails for option grants.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
    title: 'MCP Server — AI-Native Cap Table',
    description: 'Manage your cap table from Claude, Cursor, or any MCP client. Query stakeholders, issue equity, and run dilution scenarios — all in natural language.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
    title: 'Document Storage & Audit Trail',
    description: 'Store board consents, stock agreements, and option grants with full version history. Every change is tracked, timestamped, and attributable.',
  },
];

const stats = [
  { label: 'API endpoints', value: '60+' },
  { label: 'MCP tools', value: '29' },
  { label: 'OCTA v2.0 aligned', value: '100%' },
  { label: 'MIT licensed', value: 'Free' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-white pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Open source &amp; OCTA v2.0 aligned
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
            Cap table management
            <br />
            <span className="text-blue-600">built for founders</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            OpenCap Stack gives early-stage startups an open-source foundation for equity management — from seed-stage SAFE notes through Series A cap tables, 409A valuations, and AI-native tooling via MCP.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Get started free
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/developers"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-gray-700 text-sm font-semibold rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              Explore the API
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MCP highlight */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                AI-Native Cap Table
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Manage your cap table from Claude or Cursor
              </h2>
              <p className="text-lg text-gray-500 mb-6 leading-relaxed">
                The OpenCap Stack MCP server gives any MCP-compatible AI client direct access to your cap table. Issue equity grants, query dilution scenarios, and run waterfall analyses — all in natural language.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  '29 MCP tools covering stakeholders, SAFEs, grants, valuations, and more',
                  'Works with Claude, Cursor, and any MCP-compatible client',
                  'Skill auto-installs to Claude Code on npm install',
                  'Full audit trail — every AI action is logged',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/developers#mcp"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Install the MCP server
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Terminal card */}
            <div className="rounded-xl bg-gray-900 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-white/40 font-mono">terminal</span>
              </div>
              <div className="p-5 font-mono text-sm space-y-3">
                <div>
                  <span className="text-white/40">$ </span>
                  <span className="text-green-400">npm install -g @opencapstack/mcp-server</span>
                </div>
                <div className="text-white/60 text-xs pl-4">
                  ✓ Installed @opencapstack/mcp-server@1.6.0<br />
                  ✓ Skill installed to ~/.claude/skills/opencap-mcp/
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-white/40">Claude › </span>
                  <span className="text-white">Show me AINative Studio&apos;s cap table</span>
                </div>
                <div className="text-white/60 text-xs pl-4 leading-relaxed">
                  Cap Table Summary — AINative Studio<br />
                  • 3 stakeholders (1 advisor, 2 investors)<br />
                  • 2 share classes (Common, Series Seed Preferred)<br />
                  • 1 equity grant pending approval<br />
                  • 2 SAFEs · $500K total invested
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything your equity stack needs</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A complete platform for managing equity from your first SAFE through complex cap table events — structured, auditable, and interoperable.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Developer callout */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">REST API · Bearer auth · JSON</span>
              </div>
              <div className="p-5 font-mono text-xs space-y-2 text-gray-700">
                <div><span className="text-blue-600">GET</span> <span className="text-gray-900">/api/v1/stakeholders</span></div>
                <div><span className="text-green-600">POST</span> <span className="text-gray-900">/api/v1/equity-grants</span></div>
                <div><span className="text-blue-600">GET</span> <span className="text-gray-900">/api/v1/share-classes</span></div>
                <div><span className="text-green-600">POST</span> <span className="text-gray-900">/api/v1/safes</span></div>
                <div><span className="text-blue-600">GET</span> <span className="text-gray-900">/api/v1/valuations/latest</span></div>
                <div className="pt-2 border-t border-gray-200 text-gray-400"># 60+ endpoints · Full OpenAPI spec</div>
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                REST API
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Build on the cap table API
              </h2>
              <p className="text-lg text-gray-500 mb-6 leading-relaxed">
                60+ REST endpoints with JWT auth, rate limiting, and a full OpenAPI 3.0 spec. Integrate cap table data into your own tools, workflows, and AI agents.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/developers"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Developer docs
                </Link>
                <a
                  href="https://api.opencapstack.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  API reference ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Open source callout */}
      <section className="bg-gray-900 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <GitHubIcon />
                </div>
                <span className="text-white/60 text-sm font-medium">Open-Cap-Stack/opencapstack</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">
                Open source. Self-hostable.<br />Free to start.
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
                MIT licensed. Run it on your own infrastructure or use our managed cloud. Your equity data stays yours.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {['MIT License', 'Self-hostable', 'OCTA v2.0', 'Docker ready'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <a
                href="https://github.com/Open-Cap-Stack/opencapstack"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                <GitHubIcon />
                View on GitHub
              </a>
              <Link
                href="/open-source"
                className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 transition-colors border border-white/20 whitespace-nowrap"
              >
                Self-hosting guide
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="bg-blue-600 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-lg text-blue-100 mb-8">
            Set up your cap table in minutes. No credit card required for the free plan.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Create free account
            </Link>
            <Link
              href="/pricing"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors border border-blue-500"
            >
              See all plans
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
