export const metadata = {
  title: 'Documents',
  description:
    'Manage equity-related documents: term sheets, stock certificates, SAFE agreements, option grants, and board consents. Supports digital signatures.',
  openGraph: {
    title: 'Documents | OpenCap Stack',
    description: 'Upload, manage, and digitally sign equity documents.',
  },
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://opencapstack.com/documents' },
};

export default function DocumentsLayout({ children }) {
  return children;
}
