export const metadata = {
  title: 'Share Classes',
  description:
    'Define and manage share classes: common stock, preferred series, options pool, and warrants. Configure liquidation preferences, anti-dilution, and voting rights.',
  openGraph: {
    title: 'Share Classes | OpenCap Stack',
    description:
      'Manage common stock, preferred series, and options pool share classes for your cap table.',
  },
  alternates: { canonical: 'https://opencapstack.com/share-classes' },
};

export default function ShareClassesLayout({ children }) {
  return children;
}
