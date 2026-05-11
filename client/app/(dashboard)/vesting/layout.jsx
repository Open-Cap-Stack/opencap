export const metadata = {
  title: 'Vesting Schedules',
  description:
    'Manage equity vesting schedules: track grantees, share allocations, cliff periods, vesting timelines, and current vesting progress.',
  openGraph: {
    title: 'Vesting Schedules | OpenCap Stack',
    description:
      'Track and manage equity vesting schedules for your cap table, including cliff dates, vesting milestones, and grantee status.',
  },
  alternates: { canonical: 'https://opencapstack.com/vesting' },
};

export default function VestingLayout({ children }) {
  return children;
}
