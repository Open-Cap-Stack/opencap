'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  FileDown,
  Save,
  LayoutList,
} from 'lucide-react';
import api from '@/lib/api';

const SECTION_TYPES = [
  { value: 'summary', label: 'Summary', description: 'High-level company overview and key metrics' },
  { value: 'stakeholder_table', label: 'Stakeholder Table', description: 'Full list of stakeholders with ownership percentages' },
  { value: 'cap_table_snapshot', label: 'Cap Table Snapshot', description: 'Current share distribution across all classes' },
  { value: 'document_list', label: 'Document List', description: 'Index of key company documents' },
  { value: 'safe_summary', label: 'SAFE Summary', description: 'Outstanding SAFE notes and conversion terms' },
];

const SECTION_PREVIEW = {
  summary: '[ Summary ]\nCompany overview, funding stage, total shares authorized vs issued.',
  stakeholder_table: '[ Stakeholder Table ]\nName | Shares | % Ownership | Share Class\n--- | --- | --- | ---\n...',
  cap_table_snapshot: '[ Cap Table Snapshot ]\nShare Class | Authorized | Issued | Available\n--- | --- | --- | ---\n...',
  document_list: '[ Document List ]\n- Certificate of Incorporation\n- Shareholder Agreement\n- ...',
  safe_summary: '[ SAFE Summary ]\nInvestor | Amount | Cap | Discount | Status\n--- | --- | --- | --- | ---\n...',
};

let nextId = 1;

function SectionItem({ section, onMoveUp, onMoveDown, onRemove, canMoveUp, canMoveDown }) {
  const cfg = SECTION_TYPES.find((t) => t.value === section.type);
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
      <LayoutList className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{cfg?.label || section.type}</p>
        <p className="text-xs text-gray-500 truncate">{cfg?.description || ''}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          title="Move up"
          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          title="Move down"
          className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove section"
          className="p-1 text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CustomReportPage() {
  const [reportName, setReportName] = useState('');
  const [sections, setSections] = useState([]);
  const [addingSection, setAddingSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addSection = (type) => {
    setSections((prev) => [...prev, { id: nextId++, type }]);
    setAddingSection(false);
  };

  const moveSection = (index, direction) => {
    setSections((prev) => {
      const arr = [...prev];
      const target = index + direction;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  const removeSection = (index) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!reportName.trim()) {
      showToast('Please enter a report name.', 'error');
      return;
    }
    if (sections.length === 0) {
      showToast('Add at least one section before saving.', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      name: reportName.trim(),
      type: 'custom',
      sections: sections.map((s) => ({ type: s.type })),
    };

    try {
      await api.post('/reports', payload);
      showToast('Report saved successfully.');
    } catch {
      // Fall back to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('custom_reports') || '[]');
        stored.push({ ...payload, id: Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem('custom_reports', JSON.stringify(stored));
        showToast('Report saved locally (server unavailable).');
      } catch {
        showToast('Failed to save report.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    showToast('PDF export coming soon.', 'error');
  };

  const previewText = sections.length === 0
    ? '(No sections added yet. Add sections to preview your report structure.)'
    : `Report: ${reportName || 'Untitled'}\n${'='.repeat(40)}\n\n` +
      sections.map((s) => SECTION_PREVIEW[s.type] || `[ ${s.type} ]`).join('\n\n');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 border rounded-lg px-4 py-3 shadow-md text-sm max-w-xs ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Custom Report Builder</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Builder */}
        <div className="space-y-4">
          {/* Report name */}
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Report name</label>
            <input
              type="text"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="e.g. Q2 2026 Investor Update"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sections */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Sections</h2>
              <button
                type="button"
                onClick={() => setAddingSection((v) => !v)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add section
              </button>
            </div>

            {/* Section type picker */}
            {addingSection && (
              <div className="mb-4 border border-blue-100 rounded-lg bg-blue-50 p-3 space-y-1">
                <p className="text-xs font-medium text-blue-700 mb-2">Choose a section type:</p>
                {SECTION_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => addSection(type.value)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white hover:shadow-sm transition-all"
                  >
                    <span className="font-medium text-gray-800">{type.label}</span>
                    <span className="text-gray-500 ml-2 text-xs">{type.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Section list */}
            {sections.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                No sections added yet. Click &ldquo;Add section&rdquo; to start building.
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <SectionItem
                    key={section.id}
                    section={section}
                    onMoveUp={() => moveSection(idx, -1)}
                    onMoveDown={() => moveSection(idx, 1)}
                    onRemove={() => removeSection(idx)}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < sections.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save report'}
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Preview</h2>
          <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed min-h-[300px] border border-gray-100 overflow-auto">
            {previewText}
          </pre>
        </div>
      </div>
    </div>
  );
}
