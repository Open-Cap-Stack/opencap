export const metadata = {
  title: 'Fundraising',
  description:
    'Model and manage fundraising rounds. Simulate dilution, track SAFE conversions, and analyze cap table impact of new financing.',
  openGraph: {
    title: 'Fundraising | OpenCap Stack',
    description: 'Model fundraising rounds, simulate dilution, and track SAFE conversions.',
  },
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://opencapstack.com/fundraise' },
};

export default function FundraiseLayout({ children }) {
  return children;
}
