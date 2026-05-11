export const metadata = {
  title: 'SPV Management',
  description:
    'Manage Special Purpose Vehicles (SPVs): track LLC, LP, and Corp entities, their formation dates, status, and associated assets.',
  openGraph: {
    title: 'SPV Management | OpenCap Stack',
    description:
      'Create and manage SPVs for your cap table, including entity type, formation details, status, and asset tracking.',
  },
  alternates: { canonical: 'https://opencapstack.com/spv' },
};

export default function SpvLayout({ children }) {
  return children;
}
