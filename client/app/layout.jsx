import './globals.css';
import { Providers } from './providers';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://opencapstack.com'),
  title: {
    default: 'OpenCap Stack — Cap Table & Equity Management',
    template: '%s | OpenCap Stack',
  },
  description:
    'Open-source cap table management for startups. Track stakeholders, issue equity, manage SAFE notes, run 409A valuations, and generate investor reports. Aligned with OCTA schema.',
  keywords: [
    'cap table',
    'equity management',
    'SAFE notes',
    '409A valuation',
    'startup equity',
    'OCTA',
    'open source cap table',
    'investor reporting',
    'dilution modeling',
  ],
  authors: [{ name: 'OpenCap Stack', url: 'https://opencapstack.com' }],
  creator: 'OpenCap Stack',
  publisher: 'OpenCap Stack',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://opencapstack.com',
    siteName: 'OpenCap Stack',
    title: 'OpenCap Stack — Cap Table & Equity Management',
    description:
      'Open-source cap table management for startups. Track stakeholders, issue equity, manage SAFE notes, run 409A valuations.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'OpenCap Stack — Cap Table Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenCap Stack — Cap Table & Equity Management',
    description: 'Open-source cap table management for startups.',
    images: ['/og-image.svg'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
  alternates: {
    canonical: 'https://opencapstack.com',
  },
  other: {
    'llms-txt': 'https://opencapstack.com/llms.txt',
    'agents-md': 'https://opencapstack.com/AGENTS.md',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'OpenCap Stack',
  url: 'https://opencapstack.com',
  description:
    'Open-source cap table and equity management platform aligned with OCTA schema.',
  sameAs: ['https://github.com/Open-Cap-Stack/opencapstack'],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'technical support',
    url: 'https://opencapstack.com/support',
  },
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'OpenCap Stack',
  applicationCategory: 'FinanceApplication',
  applicationSubCategory: 'Cap Table Management',
  operatingSystem: 'Web Browser',
  description:
    'Open-source cap table management for startups. Manage stakeholders, equity grants, SAFE notes, 409A valuations, and investor reports aligned with OCTA v2.0 schema.',
  url: 'https://opencapstack.com',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Open-source, free to self-host',
  },
  softwareHelp: {
    '@type': 'WebPage',
    url: 'https://opencapstack.com/api-docs',
  },
  featureList: [
    'Cap table management',
    'Equity grant issuance',
    'SAFE note tracking',
    '409A valuations',
    'Dilution modeling',
    'Investor reporting',
    'Document management',
    'OCTA v2.0 compliance',
  ],
};

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'OpenCap Stack',
  url: 'https://opencapstack.com',
  description: 'Open-source cap table and equity management platform for startups.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://opencapstack.com/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
        />

        {/* AX discovery link tags */}
        <link rel="alternate" type="text/plain" href="/llms.txt" title="LLMs context" />
        <link rel="alternate" type="application/json" href="/openapi.json" title="OpenAPI spec" />
        <link rel="alternate" type="application/json" href="/agent-card.json" title="Agent card" />

        {/* Google Analytics 4 — set NEXT_PUBLIC_GA_MEASUREMENT_ID in .env */}
        {GA_MEASUREMENT_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', { page_path: window.location.pathname });
                `,
              }}
            />
          </>
        )}
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
