'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const CATEGORIES = ['Minutes', 'Resolutions', 'Consents', 'Reports', 'Other'];

const CATEGORY_STYLES = {
  Minutes: 'bg-purple-100 text-purple-700',
  Resolutions: 'bg-blue-100 text-blue-700',
  Consents: 'bg-green-100 text-green-700',
  Reports: 'bg-amber-100 text-amber-700',
  Other: 'bg-gray-100 text-gray-700',
};

async function fetchBoardDocuments() {
  try {
    const res = await api.get('/documents', { params: { category: 'board' } });
    return Array.isArray(res.data) ? res.data : res.data?.data ?? [];
  } catch {
    return [];
  }
}

export default function BoardDocumentsPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const fileRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['board-documents'],
    queryFn: fetchBoardDocuments,
  });

  const docs = Array.isArray(data) ? data : [];

  const filtered =
    activeCategory === 'All'
      ? docs
      : docs.filter((d) => d.category === activeCategory || d.type === activeCategory);

  const allTabs = ['All', ...CATEGORIES];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Board Documents</h2>
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            id="board-doc-upload"
            onChange={() => {
              // Upload UI only — backend endpoint not wired yet
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
          <label
            htmlFor="board-doc-upload"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium cursor-pointer"
          >
            Upload Document
          </label>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {allTabs.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No board documents yet</p>
            <p className="text-gray-400 text-xs mt-1">Upload minutes, resolutions, consents, and reports.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Document Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date Added</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((doc, i) => {
                  const cat = doc.category || doc.type || 'Other';
                  const catStyle = CATEGORY_STYLES[cat] || CATEGORY_STYLES.Other;
                  return (
                    <tr key={doc.id || doc._id || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {doc.name || doc.title || doc.fileName || 'Untitled'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${catStyle}`}>
                          {cat}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-3">
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-gray-300 cursor-not-allowed">View</span>
                          )}
                          {doc.url ? (
                            <a
                              href={doc.url}
                              download
                              className="text-blue-600 hover:underline"
                            >
                              Download
                            </a>
                          ) : (
                            <span className="text-gray-300 cursor-not-allowed">Download</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
