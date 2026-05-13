'use client';

import Link from 'next/link';
import { useState } from 'react';
import OCSLogo from '@/components/OCSLogo';

const navLinks = [
  { label: 'Developers', href: '/developers' },
  { label: 'Open Source', href: '/open-source' },
  { label: 'Pricing', href: '/pricing' },
];

export default function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" aria-label="OpenCap Stack home">
            <OCSLogo variant="full" color="dark" height={32} />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="text-sm font-semibold px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Get started free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-sm font-medium text-gray-700 py-2 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
            <Link href="/login" className="text-sm text-gray-600 py-2">Sign in</Link>
            <Link href="/register" className="text-sm font-semibold text-center px-4 py-2 bg-gray-900 text-white rounded-lg">
              Get started free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
