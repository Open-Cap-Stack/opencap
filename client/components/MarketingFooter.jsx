import Link from 'next/link';
import OCSLogo from '@/components/OCSLogo';

const GitHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export default function MarketingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="OpenCap Stack home">
              <OCSLogo variant="full" color="dark" height={28} />
            </Link>
            <p className="mt-3 text-sm text-gray-400 max-w-xs">
              Open-source cap table management aligned with OCTA v2.0.
            </p>
            <a
              href="https://github.com/Open-Cap-Stack/opencapstack"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <GitHubIcon />
              GitHub
            </a>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Product</h3>
            <ul className="space-y-2">
              {[
                { label: 'Pricing', href: '/pricing' },
                { label: 'Get started', href: '/register' },
                { label: 'Sign in', href: '/login' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Developers</h3>
            <ul className="space-y-2">
              {[
                { label: 'API Reference', href: '/developers' },
                { label: 'MCP Server', href: '/developers#mcp' },
                { label: 'API Docs', href: 'https://api.opencapstack.com/docs' },
                { label: 'Open Source', href: '/open-source' },
              ].map((l) => (
                <li key={l.label}>
                  {l.href.startsWith('http') ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {l.label}
                    </a>
                  ) : (
                    <Link href={l.href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">Community</h3>
            <ul className="space-y-2">
              {[
                { label: 'GitHub', href: 'https://github.com/Open-Cap-Stack/opencapstack' },
                { label: 'Issues', href: 'https://github.com/Open-Cap-Stack/opencapstack/issues' },
                { label: 'OCTA Alliance', href: 'https://www.opencaptablecoalition.com/' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} OpenCap Stack. Open source under the MIT License.
          </p>
          <p className="text-xs text-gray-400">
            Aligned with{' '}
            <a href="https://www.opencaptablecoalition.com/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline underline-offset-2">
              OCTA v2.0
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
