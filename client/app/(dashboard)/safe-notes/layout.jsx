'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/safe-notes', label: 'Overview' },
  { href: '/safe-notes/dilution-calculator', label: 'Dilution Calculator' },
  { href: '/safe-notes/insights', label: 'Market Insights' },
  { href: '/safe-notes/templates', label: 'Templates' },
];

export default function SafeNotesLayout({ children }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Sub-navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="SAFE Notes sections">
          {tabs.map((tab) => {
            const isActive =
              tab.href === '/safe-notes'
                ? pathname === '/safe-notes'
                : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
