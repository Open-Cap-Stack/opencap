import Link from 'next/link';
import MarketingNav from '@/components/MarketingNav';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata = {
  title: 'Developers — OpenCap Stack',
  description: 'REST API, MCP server, and SDK docs for OpenCap Stack. 60+ endpoints, full OpenAPI spec, and AI-native cap table tooling.',
};

function CodeBlock({ children, language = 'bash' }) {
  return (
    <div className="rounded-lg bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs text-white/40 font-mono">{language}</span>
      </div>
      <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function SectionAnchor({ id }) {
  return <div id={id} className="scroll-mt-20" />;
}

const endpoints = [
  { method: 'GET', path: '/api/v1/stakeholders', desc: 'List all stakeholders' },
  { method: 'POST', path: '/api/v1/stakeholders', desc: 'Create a stakeholder' },
  { method: 'GET', path: '/api/v1/share-classes', desc: 'List share classes' },
  { method: 'POST', path: '/api/v1/share-classes', desc: 'Create a share class' },
  { method: 'GET', path: '/api/v1/equity-plans', desc: 'List equity plans' },
  { method: 'POST', path: '/api/v1/equity-grants', desc: 'Issue an equity grant' },
  { method: 'GET', path: '/api/v1/safes', desc: 'List SAFE notes' },
  { method: 'POST', path: '/api/v1/safes', desc: 'Record a new SAFE' },
  { method: 'GET', path: '/api/v1/valuations/latest', desc: 'Get latest 409A valuation' },
  { method: 'GET', path: '/api/v1/documents', desc: 'List documents' },
  { method: 'POST', path: '/api/v1/auth/login', desc: 'Authenticate and get JWT' },
  { method: 'POST', path: '/api/v1/auth/ainative-login', desc: 'Sign in with AINative credentials' },
];

const mcpTools = [
  { name: 'whoami', desc: 'Verify auth, returns email and companyId' },
  { name: 'cap_table_summary', desc: 'Full overview of stakeholders, SAFEs, grants, plans' },
  { name: 'list_workflows', desc: 'Step-by-step guides for common operations' },
  { name: 'create_stakeholder', desc: 'Add a new stakeholder' },
  { name: 'list_stakeholders', desc: 'List all stakeholders' },
  { name: 'create_share_class', desc: 'Define a new share class' },
  { name: 'create_safe', desc: 'Record a SAFE investment' },
  { name: 'create_equity_grant', desc: 'Issue an equity grant' },
  { name: 'get_vesting_schedule', desc: 'Get vesting schedule for a grant' },
  { name: 'create_valuation_request', desc: 'Kick off a 409A valuation' },
  { name: 'calculate_dilution', desc: 'Run a dilution analysis' },
  { name: 'run_waterfall_analysis', desc: 'Model a liquidation waterfall' },
];

const methodColor = {
  GET: 'text-blue-400 bg-blue-950',
  POST: 'text-green-400 bg-green-950',
  PUT: 'text-yellow-400 bg-yellow-950',
  DELETE: 'text-red-400 bg-red-950',
};

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav />

      {/* Hero */}
      <section className="bg-gray-50 border-b border-gray-200 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Developer docs
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Build on the cap table API
          </h1>
          <p className="text-xl text-gray-500 mb-8 leading-relaxed">
            60+ REST endpoints, a full OpenAPI 3.0 spec, JWT authentication, and an MCP server for AI-native integrations. Everything you need to integrate equity data into your product or workflow.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://api.opencapstack.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Interactive API docs ↗
            </a>
            <a
              href="https://github.com/Open-Cap-Stack/opencapstack"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View source on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-16 z-40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex gap-6 overflow-x-auto">
          {[
            { label: 'Authentication', href: '#auth' },
            { label: 'REST API', href: '#api' },
            { label: 'MCP Server', href: '#mcp' },
            { label: 'OpenAPI Spec', href: '#openapi' },
            { label: 'Rate Limits', href: '#limits' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-3 text-sm font-medium text-gray-500 hover:text-gray-900 whitespace-nowrap border-b-2 border-transparent hover:border-gray-300 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* Auth */}
        <div>
          <SectionAnchor id="auth" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication</h2>
          <p className="text-gray-500 mb-6">
            All API requests require a JWT Bearer token. Get one by logging in with your OpenCap Stack credentials or your AINative account.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-3">Email / password login</h3>
          <CodeBlock language="bash">{`curl -X POST https://api.opencapstack.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "yourpassword"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "email": "you@example.com", "role": "user" }
}`}</CodeBlock>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">Sign in with AINative</h3>
          <CodeBlock language="bash">{`curl -X POST https://api.opencapstack.com/api/v1/auth/ainative-login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@ainative.studio", "password": "yourpassword"}'

# Response
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": { "email": "you@ainative.studio", "name": "...", "role": "user" }
}`}</CodeBlock>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">Using the token</h3>
          <CodeBlock language="bash">{`# Pass the token as a Bearer header on every request
curl https://api.opencapstack.com/api/v1/stakeholders \\
  -H "Authorization: Bearer <your-token>"`}</CodeBlock>
        </div>

        {/* REST API */}
        <div>
          <SectionAnchor id="api" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">REST API</h2>
          <p className="text-gray-500 mb-6">
            Base URL: <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono">https://api.opencapstack.com/api/v1</code>
            {' '}· All requests and responses are JSON.
          </p>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Key endpoints</span>
            </div>
            <div className="divide-y divide-gray-100">
              {endpoints.map((ep) => (
                <div key={ep.path} className="flex items-center gap-4 px-4 py-3">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${methodColor[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-gray-900 flex-1">{ep.path}</code>
                  <span className="text-sm text-gray-500 hidden sm:block">{ep.desc}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <a href="https://api.opencapstack.com/docs" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View all 60+ endpoints in the interactive docs →
              </a>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mt-8 mb-3">Example: create a stakeholder</h3>
          <CodeBlock language="bash">{`curl -X POST https://api.opencapstack.com/api/v1/stakeholders \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "Investor",
    "companyId": "your-company-id"
  }'`}</CodeBlock>

          <h3 className="text-base font-semibold text-gray-900 mt-8 mb-3">Example: issue an equity grant</h3>
          <CodeBlock language="bash">{`curl -X POST https://api.opencapstack.com/api/v1/equity-grants \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "employeeId": "<stakeholder-row-id>",
    "equityPlanId": "<plan-row-id>",
    "shareCount": 50000,
    "vestingSchedule": "4-year/1-year cliff",
    "grantType": "NSO",
    "companyId": "your-company-id"
  }'`}</CodeBlock>
        </div>

        {/* MCP Server */}
        <div>
          <SectionAnchor id="mcp" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">MCP Server</h2>
          <p className="text-gray-500 mb-6">
            The <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 font-mono">@opencapstack/mcp-server</code> package gives any MCP-compatible AI client (Claude, Cursor, etc.) direct access to your cap table via 29 tools.
          </p>

          <h3 className="text-base font-semibold text-gray-900 mb-3">Install</h3>
          <CodeBlock language="bash">{`npm install -g @opencapstack/mcp-server

# The skill auto-installs to ~/.claude/skills/opencap-mcp/
# on npm install — no manual setup needed in Claude Code`}</CodeBlock>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">Configure Claude Code</h3>
          <p className="text-sm text-gray-500 mb-3">Add to your <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">~/.claude.json</code> projects entry:</p>
          <CodeBlock language="json">{`{
  "mcpServers": {
    "opencap": {
      "type": "stdio",
      "command": "opencap-mcp",
      "env": {
        "OPENCAP_API_KEY": "<your-jwt-token>",
        "OPENCAP_BASE_URL": "https://api.opencapstack.com"
      }
    }
  }
}`}</CodeBlock>

          <h3 className="text-base font-semibold text-gray-900 mt-6 mb-3">Configure Cursor</h3>
          <CodeBlock language="json">{`// .cursor/mcp.json
{
  "mcpServers": {
    "opencap": {
      "command": "opencap-mcp",
      "env": {
        "OPENCAP_API_KEY": "<your-jwt-token>",
        "OPENCAP_BASE_URL": "https://api.opencapstack.com"
      }
    }
  }
}`}</CodeBlock>

          <div className="mt-8 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800">
            <strong>Important:</strong> <code className="font-mono bg-amber-100 px-1 rounded">OPENCAP_BASE_URL</code> must <em>not</em> end with <code className="font-mono bg-amber-100 px-1 rounded">/api/v1</code> — the MCP tools add that prefix automatically.
          </div>

          <h3 className="text-base font-semibold text-gray-900 mt-8 mb-3">Get an API key</h3>
          <CodeBlock language="bash">{`# Option 1: login and copy the token
curl -X POST https://api.opencapstack.com/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@example.com", "password": "yourpassword"}' \\
  | jq -r '.token'

# Option 2: sign in with AINative
curl -X POST https://api.opencapstack.com/api/v1/auth/ainative-login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@ainative.studio", "password": "yourpassword"}' \\
  | jq -r '.accessToken'`}</CodeBlock>

          <h3 className="text-base font-semibold text-gray-900 mt-8 mb-3">Available tools (29 total)</h3>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {mcpTools.map((tool) => (
                <div key={tool.name} className="flex items-start gap-4 px-4 py-3">
                  <code className="text-sm font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">{tool.name}</code>
                  <span className="text-sm text-gray-600">{tool.desc}</span>
                </div>
              ))}
              <div className="px-4 py-3 bg-gray-50">
                <span className="text-sm text-gray-500">+ 17 more tools for documents, financial reports, analysis, and more</span>
              </div>
            </div>
          </div>

          <h3 className="text-base font-semibold text-gray-900 mt-8 mb-3">Example session in Claude</h3>
          <div className="rounded-xl bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <span className="text-xs text-white/40 font-mono">Claude · opencap MCP</span>
            </div>
            <div className="p-5 space-y-4 font-mono text-sm">
              <div>
                <span className="text-white/40">You › </span>
                <span className="text-white">Show me the cap table summary</span>
              </div>
              <div className="text-white/60 text-xs leading-relaxed pl-4">
                Cap Table — AINative Studio (ainative-studio)<br />
                Stakeholders: 3 · Share classes: 2 · SAFEs: 2 · Grants: 1<br /><br />
                Stakeholders: Kwanza Hall (Advisor), ...<br />
                Share Classes: Common Stock, Series Seed Preferred<br />
                SAFEs: $250K @ $5M cap · $250K @ $8M cap<br />
                Grants: GRANT-MP34648T (50,000 NSO shares, pending)
              </div>
              <div className="border-t border-white/10 pt-4">
                <span className="text-white/40">You › </span>
                <span className="text-white">Approve Kwanza Hall&apos;s equity grant</span>
              </div>
              <div className="text-white/60 text-xs leading-relaxed pl-4">
                ✓ Updated GRANT-MP34648T status → approved<br />
                Kwanza Hall now holds 50,000 NSO shares vesting 4yr/1yr cliff.
              </div>
            </div>
          </div>
        </div>

        {/* OpenAPI */}
        <div>
          <SectionAnchor id="openapi" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">OpenAPI Spec</h2>
          <p className="text-gray-500 mb-6">
            A full OpenAPI 3.0 specification is available for code generation, documentation, and integration testing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Interactive docs (Swagger UI)', href: 'https://api.opencapstack.com/docs', desc: 'Try every endpoint in your browser' },
              { label: 'OpenAPI JSON spec', href: 'https://api.opencapstack.com/api-docs.json', desc: 'Import into Postman, Insomnia, or your codegen tool' },
              { label: 'Static OpenAPI file', href: '/openapi.json', desc: 'Hosted on the frontend for agent discovery' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="text-sm font-semibold text-gray-900 mb-1">{item.label} ↗</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Rate limits */}
        <div>
          <SectionAnchor id="limits" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rate Limits</h2>
          <p className="text-gray-500 mb-6">Rate limits are enforced per API key and vary by plan.</p>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Plan', 'API calls / month', 'Burst limit'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { plan: 'Free', calls: '1,000', burst: '10 req/min' },
                  { plan: 'Starter', calls: '10,000', burst: '60 req/min' },
                  { plan: 'Professional', calls: '100,000', burst: '200 req/min' },
                  { plan: 'Enterprise', calls: 'Unlimited', burst: 'Custom' },
                ].map((row) => (
                  <tr key={row.plan}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.plan}</td>
                    <td className="px-4 py-3 text-gray-600">{row.calls}</td>
                    <td className="px-4 py-3 text-gray-600">{row.burst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Rate limit headers are returned on every response: <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">x-ratelimit-limit</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">x-ratelimit-remaining</code>, <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-800">x-ratelimit-reset</code>.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-xl bg-gray-900 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to build?</h2>
          <p className="text-gray-400 mb-6">Create a free account to get your API key and start integrating in minutes.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-500 transition-colors">
              Create free account
            </Link>
            <a href="https://api.opencapstack.com/docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-6 py-3 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20 border border-white/20 transition-colors">
              Browse API docs ↗
            </a>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
