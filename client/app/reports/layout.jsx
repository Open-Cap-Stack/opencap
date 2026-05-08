export const metadata = {
  title: 'Reports',
  description:
    'Generate investor-ready cap table reports, financial summaries, waterfall analyses, and equity analytics. Export to PDF, CSV, or JSON.',
  openGraph: {
    title: 'Reports | OpenCap Stack',
    description: 'Generate cap table reports, waterfall analyses, and investor summaries.',
  },
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://opencapstack.com/reports' },
};

export default function ReportsLayout({ children }) {
  return children;
}
