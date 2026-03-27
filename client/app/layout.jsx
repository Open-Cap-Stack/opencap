import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'OpenCap Stack - Cap Table Management',
  description: 'Comprehensive financial management for managing stakeholders, share classes, equity plans, and cap tables.',
  openGraph: {
    title: 'OpenCap Stack',
    description: 'Open-source cap table management aligned with OCTA schema',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
