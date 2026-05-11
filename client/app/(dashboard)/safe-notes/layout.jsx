export const metadata = {
  title: 'SAFE Notes',
  description:
    'Manage Simple Agreement for Future Equity (SAFE) notes: track investors, investment amounts, valuation caps, discount rates, and conversion status.',
  openGraph: {
    title: 'SAFE Notes | OpenCap Stack',
    description:
      'Track and manage SAFE notes for your cap table, including valuation caps, discount rates, and conversion events.',
  },
  alternates: { canonical: 'https://opencapstack.com/safe-notes' },
};

export default function SafeNotesLayout({ children }) {
  return children;
}
