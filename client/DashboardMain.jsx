import React from 'react';

const Dashboard = () => {
  const sidebarItems = [
    'Overview', 'Captable', 'Stakeholders', 'Share classes', 'Equity plans',
    'Securities', 'Fundraise', 'Documents', 'Updates', 'Reports', 'Audits',
    'Settings', 'Form 3921', '409A Valuation'
  ];

  const ownershipData = [
    { name: 'Allen Smith', percentage: 27 },
    { name: 'Toby Mornin', percentage: 25 },
    { name: 'Others', percentage: 18 },
    { name: 'Equity Plan', percentage: 15 },
    { name: 'USA Ventures', percentage: 10 },
  ];

  const activities = [
    { user: 'Allen Smith', action: 'uploaded a document', document: '2023 W-2.pdf', time: 'a day ago' },
    { user: 'Allen Smith', action: 'uploaded a document', document: 'yc-post-money-safe-with-discount.pdf', time: '2 days ago' },
    { user: 'Allen Smith', action: 'uploaded a document', document: 'Atlas-Articles-of-Incorporation.pdf', time: '3 days ago' },
    { user: 'Allen Smith', action: 'uploaded a document', document: 'Atlas-Corp-Operating-Agreement.pdf', time: '3 days ago' },
  ];

  const summaryData = [
    { shareClass: 'Common shares', authorizedShares: '7,000,000', dilutedShares: '4,500,000', ownership: '53%', amountRaised: '$10,000,000' },
    { shareClass: 'Preferred (Series A)', authorizedShares: '2,000,000', dilutedShares: '1,500,000', ownership: '15%', amountRaised: '$18,000,000' },
    { shareClass: 'Preferred (Convertible note)', authorizedShares: '1,000,000', dilutedShares: '500,000', ownership: '7%', amountRaised: '$7,000,000' },
  ];

  return (
    <div className="flex w-full max-w-[1228px] h-[768px]">
      {/* Sidebar */}
      <div className="w-48 h-full bg-gray-100 p-4">
        <div className="text-2xl font-bold mb-4">Musa Capital</div>
        <nav className="space-y-2">
          {sidebarItems.map((item, index) => (
            <button
              key={index}
              className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-6">Overview View your company's captable</h1>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Amount raised', value: '$25.00M' },
            { label: 'Diluted shares', value: '7.56M' },
            { label: 'Stakeholders', value: '4' }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Ownership Chart */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Ownership by Stakeholders</h2>
          <div className="flex gap-8">
            <div className="flex-1">
              {ownershipData.map((item, index) => (
                <div key={index} className="flex justify-between mb-2">
                  <span>{item.name}</span>
                  <span>{item.percentage}%</span>
                </div>
              ))}
            </div>
            <div className="w-48 h-48 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          </div>
        </div>

        {/* Activities */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Activities</h2>
          <div className="space-y-2 mb-4">
            {activities.map((activity, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{activity.user}</span> {activity.action}:{' '}
                <span className="text-blue-600">{activity.document}</span>{' '}
                <span className="text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            View all activity
          </button>
        </div>

        {/* Summary Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Summary of your company's captable</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Share class</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Authorized shares</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Diluted shares</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Ownership</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Amount raised</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {summaryData.map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.shareClass}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.authorizedShares}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.dilutedShares}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.ownership}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{row.amountRaised}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;