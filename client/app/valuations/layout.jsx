export const metadata = {
  title: '409A Valuations',
  description:
    'Manage IRS Section 409A fair market value determinations. Track valuation history, methodology (OPM, PWERM, DCF), and validity periods for option pricing.',
  openGraph: {
    title: '409A Valuations | OpenCap Stack',
    description: 'Track 409A valuations and fair market value determinations for option pricing.',
  },
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://opencapstack.com/valuations' },
};

export default function ValuationsLayout({ children }) {
  return children;
}
