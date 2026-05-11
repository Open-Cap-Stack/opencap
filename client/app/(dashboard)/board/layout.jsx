'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { path: '/board/meetings', label: 'Meetings' },
  { path: '/board/documents', label: 'Documents' },
  { path: '/board/members', label: 'Members' },
  { path: '/board/resolutions', label: 'Resolutions' },
];

export default function BoardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Board Management</h1>
        <nav className="flex gap-1 border-b border-gray-200">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
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
