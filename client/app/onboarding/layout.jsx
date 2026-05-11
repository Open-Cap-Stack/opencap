export const metadata = {
  title: 'Welcome to Open Cap Stack',
  description: 'Get your cap table set up in minutes.',
  robots: { index: false, follow: false },
};

/**
 * Minimal layout for the onboarding route group.
 * No dashboard sidebar — full-page centered content on a light gray background.
 */
export default function OnboardingLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
