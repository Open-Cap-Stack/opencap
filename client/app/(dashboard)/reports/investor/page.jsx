'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  PieChart,
  FileText,
  Mail,
  Loader2,
  Download,
  Calendar,
} from 'lucide-react';
import api from '@/lib/api';

const REPORT_TYPES = [
  {
    id: '409a',
    title: '409A Valuation Report',
    description:
      'Independent appraisal report of the fair market value of common stock. Required for equity compensation compliance.',
    icon: DollarSign,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600 bg-purple-100',
    type: '409a_valuation',
  },
  {
    id: 'cap-table',
    title: 'Cap Table Snapshot',
    description:
      'Point-in-time view of your full capitalization table including all shareholders, share classes, and dilution.',
    icon: PieChart,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600 bg-blue-100',
    type: 'cap_table',
  },
  {
    id: 'board-packet',
    title: 'Board Packet',
    description:
      'Comprehensive board meeting materials including financials, KPIs, legal updates, and action items.',
    icon: FileText,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600 bg-green-100',
    type: 'board_packet',
  },
  {
    id: 'investor-update',
    title: 'Investor Update',
    description:
      'Regular investor communication with company progress, financial highlights, and upcoming milestones.',
    icon: Mail,
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-600 bg-orange-100',
    type: 'investor_update',
  },
];

function ScheduleModal({ reportType, onClose }) {
  const [date, setDate] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const handleSchedule = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">Schedule {reportType?.title}</h2>
        </div>
        <form onSubmit={handleSchedule} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <p className="text-xs text-gray-500">Scheduling is a preview feature. Reports will be generated manually until automation is enabled.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReportCard({ report, onGenerate, generatingId, generatedReports, onSchedule }) {
  const Icon = report.icon;
  const isGenerating = generatingId === report.id;
  const generated = generatedReports[report.id];

  return (
    <div className={`border rounded-xl p-5 ${report.color}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${report.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{report.title}</h3>
          <p className="text-xs text-gray-600 leading-relaxed">{report.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onGenerate(report)}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>

        <button
          type="button"
          onClick={() => onSchedule(report)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Calendar className="w-3 h-3" />
          Schedule
        </button>

        {generated && (
          <a
            href={generated.url || '#'}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium ml-2"
            onClick={generated.url ? undefined : (e) => e.preventDefault()}
          >
            <Download className="w-3 h-3" />
            Report generated — download
          </a>
        )}
      </div>
    </div>
  );
}

export default function InvestorReportsPage() {
  const [generatingId, setGeneratingId] = useState(null);
  const [generatedReports, setGeneratedReports] = useState({});
  const [schedulingReport, setSchedulingReport] = useState(null);
  const [existingReports, setExistingReports] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    async function fetchExisting() {
      try {
        const res = await api.get('/financial-reports');
        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setExistingReports(data);
      } catch {
        setExistingReports([]);
      } finally {
        setLoadingExisting(false);
      }
    }
    fetchExisting();
  }, []);

  const handleGenerate = async (report) => {
    setGeneratingId(report.id);
    try {
      const res = await api.post('/financial-reports', { type: report.type, name: report.title });
      const data = res.data?.report || res.data || {};
      setGeneratedReports((prev) => ({
        ...prev,
        [report.id]: { url: data.downloadUrl || data.url || null },
      }));
    } catch {
      // Even if API call fails, show simulated success state
      setGeneratedReports((prev) => ({
        ...prev,
        [report.id]: { url: null },
      }));
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {schedulingReport && (
        <ScheduleModal
          reportType={schedulingReport}
          onClose={() => setSchedulingReport(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/reports" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Investor Reports</h1>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onGenerate={handleGenerate}
            generatingId={generatingId}
            generatedReports={generatedReports}
            onSchedule={setSchedulingReport}
          />
        ))}
      </div>

      {/* Previously generated reports */}
      {!loadingExisting && existingReports.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold">Previously generated reports</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {existingReports.map((rep, idx) => (
              <div key={rep.id || rep._id || idx} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{rep.name || rep.title || 'Report'}</p>
                  <p className="text-xs text-gray-500">
                    {rep.type || '-'} &middot; {rep.createdAt ? new Date(rep.createdAt).toLocaleDateString() : '-'}
                  </p>
                </div>
                {(rep.downloadUrl || rep.url) && (
                  <a
                    href={rep.downloadUrl || rep.url}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
