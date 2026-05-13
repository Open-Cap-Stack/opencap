import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata = {
  title: 'Open Source — OpenCap Stack',
  description: 'OpenCap Stack is MIT licensed and fully open source. Self-host on your own infrastructure, contribute on GitHub, and keep your equity data under your control.',
};

function CodeBlock({ children, language = 'bash' }) {
  return (
    <div className="rounded-lg bg-gray-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
        <span className="text-xs text-white/40 font-mono">{language}</span>
      </div>
      <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const values = [
  {
    title: 'MIT Licensed',
    desc: 'The full source code is available under the MIT license. Read it, audit it, fork it, and ship it. No commercial restrictions.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'No vendor lock-in',
    desc: 'Your equity data is yours. Export at any time in OCTA v2.0 format — the industry-standard open schema for cap table data.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    title: 'Self-hostable',
    desc: 'Deploy on your own infrastructure with Docker or Kubernetes. Keep equity data on-premise if your compliance requirements demand it.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    title: 'Community-driven',
    desc: 'Bug fixes, new features, and integrations come from the community. Every contributor shapes the roadmap.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
];

export default function OpenSourcePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gray-900 pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/10 mb-8 text-white">
            <GitHubIcon />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
            Built in the open.<br />
            <span className="text-blue-400">Owned by the community.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            OpenCap Stack is fully open source under the MIT license. Every line of code is public. Run it yourself, contribute back, or just use the managed cloud — your call.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/Open-Cap-Stack/opencapstack"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-900 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              <GitHubIcon />
              View on GitHub
            </a>
            <a
              href="https://github.com/Open-Cap-Stack/opencapstack/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 border border-white/20 transition-colors"
            >
              View open issues
            </a>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  {v.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-hosting */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Self-hosting guide</h2>
          <p className="text-lg text-gray-500 mb-10">
            Run OpenCap Stack on your own infrastructure in minutes with Docker or Kubernetes.
          </p>

          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <h3 className="text-base font-semibold text-gray-900">Clone the repository</h3>
              </div>
              <CodeBlock language="bash">{`git clone https://github.com/Open-Cap-Stack/opencapstack.git
cd opencapstack`}</CodeBlock>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                <h3 className="text-base font-semibold text-gray-900">Configure environment variables</h3>
              </div>
              <CodeBlock language="bash">{`cp .env.example .env

# Edit .env with your values:
# Required
PORT=5000
JWT_SECRET=your-secret-key
NODE_ENV=production

# ZeroDB (primary database — get credentials at ainative.studio)
ENABLE_ZERODB=true
ZERODB_API_KEY=your-zerodb-key
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
AINATIVE_API_TOKEN=your-ainative-token`}</CodeBlock>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                <h3 className="text-base font-semibold text-gray-900">Start with Docker Compose</h3>
              </div>
              <CodeBlock language="bash">{`docker compose up -d

# API available at http://localhost:5000
# Swagger docs at http://localhost:5000/docs`}</CodeBlock>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
                <h3 className="text-base font-semibold text-gray-900">Or run directly with Node</h3>
              </div>
              <CodeBlock language="bash">{`npm install
npm run dev       # development (with nodemon)
npm start         # production`}</CodeBlock>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">5</span>
                <h3 className="text-base font-semibold text-gray-900">Run the test suite</h3>
              </div>
              <CodeBlock language="bash">{`npm test                  # unit tests
npm run test:coverage     # with coverage report (80%+ required)
npm run test:e2e          # Playwright E2E tests`}</CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Tech stack</h2>
          <p className="text-lg text-gray-500 mb-10">
            OpenCap Stack is built with battle-tested open-source tools.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { category: 'Backend', items: ['Node.js + Express', 'JWT authentication', 'ZeroDB (via AINative API)', 'Socket.IO real-time', 'MinIO document storage'] },
              { category: 'Frontend', items: ['Next.js 14 (App Router)', 'React 18', 'Tailwind CSS', 'TanStack Query', 'Chart.js'] },
              { category: 'AI & MCP', items: ['@opencapstack/mcp-server', 'LangChain integration', 'OpenAI + Anthropic', 'MCP SDK v1.0', '29 MCP tools'] },
              { category: 'Infrastructure', items: ['Docker + Kubernetes', 'Railway deployment', 'Playwright E2E tests', 'Jest unit tests', 'OpenAPI 3.0'] },
            ].map((group) => (
              <div key={group.category} className="rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{group.category}</h3>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OCTA section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-50 border-y border-blue-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium mb-6">
                Open Cap Table Alliance
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">OCTA v2.0 aligned</h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                OpenCap Stack stores and exports cap table data in the Open Cap Table Alliance (OCTA) v2.0 format — the industry standard for interoperable equity data.
              </p>
              <p className="text-gray-600 mb-6 leading-relaxed">
                That means your data can move between tools, law firms, and auditors without conversion. No proprietary formats, no lock-in.
              </p>
              <a
                href="https://www.opencaptablecoalition.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                Learn about OCTA →
              </a>
            </div>
            <div className="lg:w-72 rounded-xl bg-white border border-blue-200 p-5 font-mono text-xs text-gray-600 leading-relaxed">
              <div className="text-gray-400 mb-2">// OCTA v2.0 stakeholder</div>
              <div>{'{'}</div>
              <div className="pl-4 space-y-1">
                <div><span className="text-blue-600">&quot;object_type&quot;</span>: <span className="text-green-700">&quot;STAKEHOLDER&quot;</span>,</div>
                <div><span className="text-blue-600">&quot;id&quot;</span>: <span className="text-green-700">&quot;7f8475ad-...&quot;</span>,</div>
                <div><span className="text-blue-600">&quot;name&quot;</span>: <span className="text-green-700">&quot;Kwanza Hall&quot;</span>,</div>
                <div><span className="text-blue-600">&quot;stakeholder_type&quot;</span>: <span className="text-green-700">&quot;INDIVIDUAL&quot;</span>,</div>
                <div><span className="text-blue-600">&quot;current_relationship&quot;</span>: <span className="text-green-700">&quot;ADVISOR&quot;</span></div>
              </div>
              <div>{'}'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contributing */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Contributing</h2>
          <p className="text-lg text-gray-500 mb-10">
            Contributions are welcome — bug reports, features, documentation, and tests all count.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
            {[
              { title: 'Report a bug', desc: 'Open an issue on GitHub with reproduction steps and expected vs actual behavior.', href: 'https://github.com/Open-Cap-Stack/opencapstack/issues/new', cta: 'Open issue' },
              { title: 'Request a feature', desc: 'Start a discussion in GitHub Issues. Label it `enhancement` so it gets triaged quickly.', href: 'https://github.com/Open-Cap-Stack/opencapstack/issues', cta: 'Browse issues' },
              { title: 'Submit a PR', desc: 'Fork the repo, create a branch `feature/issue-{n}-{slug}`, write tests, and open a PR against `main`.', href: 'https://github.com/Open-Cap-Stack/opencapstack/pulls', cta: 'Open PR' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-gray-200 p-5 flex flex-col">
                <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-4">{item.desc}</p>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  {item.cta} →
                </a>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Branch naming</h3>
            <CodeBlock language="bash">{`feature/issue-{n}-{slug}    # new features
bug/issue-{n}-{slug}        # bug fixes
chore/issue-{n}-{slug}      # maintenance

# Examples:
git checkout -b feature/issue-64-safe-data-model
git checkout -b bug/issue-125-enum-mismatch`}</CodeBlock>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start with the managed cloud</h2>
          <p className="text-gray-400 mb-8 text-lg">
            No setup required. Free plan available. Switch to self-hosted at any time — your data exports in full OCTA v2.0 format.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition-colors">
              Create free account
            </Link>
            <a
              href="https://github.com/Open-Cap-Stack/opencapstack"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 border border-white/20 transition-colors"
            >
              <GitHubIcon />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
