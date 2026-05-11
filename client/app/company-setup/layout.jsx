export const metadata = {
  title: 'Company Setup — Open Cap Stack',
  description: 'Set up your company details to get started with cap table management.',
  robots: { index: false, follow: false },
};

export default function CompanySetupLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
