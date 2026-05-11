export const metadata = {
  title: 'Analytics',
  description:
    'Advanced fundraise modeling and analytics dashboard. Track capital raised, investor activity, current valuation, runway, and equity metrics across your cap table.',
  openGraph: {
    title: 'Analytics | OpenCap Stack',
    description: 'Advanced fundraise modeling and analytics for your cap table.',
  },
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://opencapstack.com/analytics' },
};

export default function AnalyticsLayout({ children }) {
  return children;
}
