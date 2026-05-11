'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  Users,
  FileText,
  Shield,
  TrendingUp,
  Layers,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';

const CATEGORIES = [
  {
    key: 'stakeholders',
    label: 'Stakeholders',
    icon: Users,
    endpoint: '/stakeholders',
    nameKey: 'name',
    subtitleKey: 'email',
    linkBase: '/stakeholders',
    idKey: 'id',
  },
  {
    key: 'documents',
    label: 'Documents',
    icon: FileText,
    endpoint: '/documents',
    nameKey: 'name',
    subtitleKey: 'type',
    linkBase: '/documents',
    idKey: 'id',
  },
  {
    key: 'safe-notes',
    label: 'SAFE Notes',
    icon: Shield,
    endpoint: '/safe-notes',
    nameKey: 'name',
    subtitleKey: 'status',
    linkBase: '/safe-notes',
    idKey: 'id',
  },
  {
    key: 'equity-plans',
    label: 'Equity Plans',
    icon: TrendingUp,
    endpoint: '/equity-plans',
    nameKey: 'name',
    subtitleKey: 'planType',
    linkBase: '/equity-plans',
    idKey: 'id',
  },
  {
    key: 'share-classes',
    label: 'Share Classes',
    icon: Layers,
    endpoint: '/share-classes',
    nameKey: 'name',
    subtitleKey: 'classType',
    linkBase: '/share-classes',
    idKey: 'id',
  },
];

function normalize(item, cat) {
  const id = item[cat.idKey] || item._id || item.id || '';
  const name =
    item[cat.nameKey] ||
    item.title ||
    item.firstName
      ? [item.firstName, item.lastName].filter(Boolean).join(' ')
      : item.name || 'Untitled';
  const subtitle = item[cat.subtitleKey] || item.email || item.type || '';
  const link = id ? `${cat.linkBase}/${id}` : cat.linkBase;
  return { id, name: typeof name === 'string' ? name : 'Untitled', subtitle, link };
}

function matchesQuery(item, cat, q) {
  const lower = q.toLowerCase();
  const n = normalize(item, cat);
  return (
    n.name.toLowerCase().includes(lower) ||
    n.subtitle.toLowerCase().includes(lower)
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults(null);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      // Try the unified search endpoint first
      try {
        const res = await api.get('/search', { params: { q: query.trim() } });
        const data = res.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setResults(data);
          setIsLoading(false);
          return;
        }
      } catch {
        // Unified endpoint unavailable — fall through to parallel client-side fetch
      }

      // Parallel fetch of each resource type, then filter in memory
      try {
        const fetches = CATEGORIES.map((cat) =>
          api
            .get(cat.endpoint)
            .then((r) => {
              const items = Array.isArray(r.data)
                ? r.data
                : Array.isArray(r.data?.data)
                ? r.data.data
                : [];
              return {
                key: cat.key,
                items: items.filter((item) => matchesQuery(item, cat, query.trim())),
                cat,
              };
            })
            .catch(() => ({ key: cat.key, items: [], cat }))
        );

        const settled = await Promise.all(fetches);
        const grouped = {};
        settled.forEach(({ key, items, cat }) => {
          grouped[key] = items.map((item) => normalize(item, cat));
        });
        setResults(grouped);
      } catch (err) {
        setError('Search failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const totalResults = results
    ? Object.values(results).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
    : 0;

  const hasQuery = query.trim().length > 0;
  const hasResults = results !== null && totalResults > 0;
  const noResults = results !== null && totalResults === 0 && !isLoading;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Search</h1>

      {/* Search input */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stakeholders, documents, SAFE notes..."
          className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
        )}
      </div>

      {/* Empty / idle state */}
      {!hasQuery && (
        <div className="text-center py-20 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Search across your entire cap table</p>
          <p className="text-sm mt-2">Stakeholders, documents, SAFE notes, equity plans, share classes</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* No results state */}
      {noResults && !error && (
        <div className="text-center py-20 text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-600">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-2">Try a different search term</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => {
            const catResults = results[cat.key];
            if (!Array.isArray(catResults) || catResults.length === 0) return null;
            const Icon = cat.icon;

            return (
              <section key={cat.key}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-gray-500" />
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {cat.label}
                  </h2>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 ml-1">
                    {catResults.length}
                  </span>
                </div>
                <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
                  {catResults.map((item) => (
                    <Link
                      key={item.id || item.name}
                      href={item.link}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                          {item.name}
                        </p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{cat.label}</span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
