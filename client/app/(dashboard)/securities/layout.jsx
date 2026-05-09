export const metadata = {
  title: 'Securities',
  description:
    'View all issued securities including common shares, preferred stock, SAFE notes, warrants, and convertible instruments. Full OCTA v2.0 schema compliance.',
  openGraph: {
    title: 'Securities | OpenCap Stack',
    description: 'Track all issued securities — shares, SAFEs, warrants, and convertibles.',
  },
  alternates: { canonical: 'https://opencapstack.com/securities' },
};

export default function SecuritiesLayout({ children }) {
  return children;
}
