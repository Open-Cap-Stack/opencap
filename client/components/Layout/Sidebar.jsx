'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import OCSLogo from '@/components/OCSLogo';

const navItems = [
  { path: '/dashboard', label: 'Overview' },
  { path: '/cap-table', label: 'Cap Table' },
  { path: '/stakeholders', label: 'Stakeholders' },
  { path: '/share-classes', label: 'Share Classes' },
  { path: '/equity-plans', label: 'Equity Plans' },
  { path: '/employee-equity', label: 'Employee Equity' },
  { path: '/my-equity', label: 'My Equity' },
  { path: '/investor-portal', label: 'Investor Portal' },
  { path: '/securities', label: 'Securities' },
  { path: '/fundraise', label: 'Fundraise' },
  { path: '/board', label: 'Board', href: '/board/meetings' },
  { path: '/documents', label: 'Documents' },
  { path: '/reports', label: 'Reports' },
  { path: '/valuations', label: '409A Valuation' },
  { path: '/tax', label: 'Tax Center' },
  { path: '/compliance', label: 'Compliance' },
  { path: '/messages', label: 'Messages' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/communications', label: 'Communications' },
  { path: '/billing', label: 'Billing' },
  { path: '/integrations', label: 'Integrations' },
  { path: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="w-56 h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Link href="/dashboard">
          <OCSLogo variant="full" color="light" height={28} />
        </Link>
        {user && <p className="text-xs text-gray-400 mt-2 truncate">{user.email}</p>}
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.path === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.href ?? item.path}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button onClick={logout} className="w-full text-left text-sm text-gray-400 hover:text-white">
          Sign out
        </button>
      </div>
    </div>
  );
}
