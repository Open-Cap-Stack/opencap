'use client';

import { useQuery } from '@tanstack/react-query';
import { stakeholderService } from '@/lib/stakeholderService';
import { shareClassService } from '@/lib/shareClassService';
import { activityService } from '@/lib/activityService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';
import OwnershipPieChart from '@/components/charts/OwnershipPieChart';

export default function OverviewPage() {
  const stakeholders = useQuery({ queryKey: ['stakeholders'], queryFn: () => stakeholderService.getStakeholders() });
  const shareClasses = useQuery({ queryKey: ['shareClasses'], queryFn: () => shareClassService.getShareClasses() });
  const activities = useQuery({ queryKey: ['activities'], queryFn: () => activityService.getActivities({ limit: 5 }) });

  const stakeholderList = Array.isArray(stakeholders.data) ? stakeholders.data : [];
  const shareClassList = Array.isArray(shareClasses.data) ? shareClasses.data : [];
  const activityList = Array.isArray(activities.data) ? activities.data : [];

  const totalRaised = shareClassList.reduce((sum, sc) => sum + (parseFloat(sc.amountRaised) || 0), 0);
  const totalDiluted = shareClassList.reduce((sum, sc) => sum + (parseInt(sc.dilutedShares) || 0), 0);

  const ownershipData = stakeholderList.slice(0, 5).map((s) => ({
    name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unknown',
    percentage: parseFloat(s.ownership) || parseFloat(s.ownershipPercentage) || 0,
  }));

  if (stakeholders.isLoading || shareClasses.isLoading) return <LoadingSpinner />;
  if (stakeholders.error || shareClasses.error) return <ErrorMessage message={(stakeholders.error || shareClasses.error)?.message || 'Failed to load dashboard data'} onRetry={() => { stakeholders.refetch(); shareClasses.refetch(); }} />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <p className="text-gray-500 mb-6">View your company&apos;s cap table</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4"><div className="text-sm text-gray-500">Amount Raised</div><div className="text-2xl font-bold">${(totalRaised / 1e6).toFixed(2)}M</div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="text-sm text-gray-500">Diluted Shares</div><div className="text-2xl font-bold">{(totalDiluted / 1e6).toFixed(2)}M</div></div>
        <div className="bg-white rounded-lg shadow p-4"><div className="text-sm text-gray-500">Stakeholders</div><div className="text-2xl font-bold">{stakeholderList.length}</div></div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Ownership by Stakeholders</h2>
        {ownershipData.length > 0 ? <OwnershipPieChart data={ownershipData} /> : <p className="text-gray-400">No stakeholders found</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
        {activities.isLoading ? <LoadingSpinner /> : activities.error ? (
          <ErrorMessage message="Failed to load activities" onRetry={activities.refetch} />
        ) : activityList.length === 0 ? <p className="text-gray-400">No recent activities</p> : (
          <div className="space-y-2">
            {activityList.map((a, i) => (
              <div key={a.id || i} className="text-sm">
                <span className="font-medium">{a.user || a.actor || 'System'}</span>{' '}{a.action || a.type || 'performed an action'}
                {a.document && <span className="text-blue-600 ml-1">{a.document}</span>}
                {a.createdAt && <span className="text-gray-400 ml-2">{new Date(a.createdAt).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Cap Table Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-sm font-semibold">Share Class</th><th className="px-4 py-2 text-left text-sm font-semibold">Authorized Shares</th><th className="px-4 py-2 text-left text-sm font-semibold">Diluted Shares</th><th className="px-4 py-2 text-left text-sm font-semibold">Amount Raised</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {shareClassList.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No share classes</td></tr> : shareClassList.map((sc, i) => (
                <tr key={sc.id || i}><td className="px-4 py-2 text-sm">{sc.name || sc.className || 'Unnamed'}</td><td className="px-4 py-2 text-sm">{(sc.authorizedShares || 0).toLocaleString()}</td><td className="px-4 py-2 text-sm">{(sc.dilutedShares || 0).toLocaleString()}</td><td className="px-4 py-2 text-sm">${(parseFloat(sc.amountRaised) || 0).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
