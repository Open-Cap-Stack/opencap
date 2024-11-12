import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">{stat.label}</div>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ownership Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ownership by Stakeholders</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Activities */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {activities.map((activity, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{activity.user}</span> {activity.action}:{' '}
                  <span className="text-blue-600">{activity.document}</span>{' '}
                  <span className="text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
            <Button variant="outline">View all activity</Button>
          </CardContent>
        </Card>

        {/* Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Summary of your company's captable</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Share class</TableHead>
                  <TableHead>Authorized shares</TableHead>
                  <TableHead>Diluted shares</TableHead>
                  <TableHead>Ownership</TableHead>
                  <TableHead>Amount raised</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.shareClass}</TableCell>
                    <TableCell>{row.authorizedShares}</TableCell>
                    <TableCell>{row.dilutedShares}</TableCell>
                    <TableCell>{row.ownership}</TableCell>
                    <TableCell>{row.amountRaised}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;