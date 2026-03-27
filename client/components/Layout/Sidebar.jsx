'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/stakeholders', label: 'Stakeholders' },
  { path: '/share-classes', label: 'Share Classes' },
  { path: '/equity-plans', label: 'Equity Plans' },
  { path: '/securities', label: 'Securities' },
  { path: '/fundraise', label: 'Fundraise' },
  { path: '/documents', label: 'Documents' },
  { path: '/reports', label: 'Reports' },
  { path: '/valuations', label: '409A Valuation' },
  { path: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="w-56 h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">OpenCap Stack</h1>
        {user && <p className="text-xs text-gray-400 mt-1 truncate">{user.email}</p>}
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
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
