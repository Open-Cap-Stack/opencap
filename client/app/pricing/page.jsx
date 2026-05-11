'use client';

import Link from 'next/link';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'Get started with essential cap table tools.',
    features: [
      'Up to 25 stakeholders',
      '50 documents',
      '500 MB storage',
      '1,000 API calls/month',
      'Basic cap table management',
      'Community support',
    ],
    cta: 'Get started free',
    href: '/register',
    highlighted: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 25,
    interval: 'month',
    description: 'Everything you need to manage equity at an early-stage startup.',
    features: [
      'Unlimited stakeholders',
      '100 GB document storage',
      '10,000 API calls/month',
      'Cap table & equity management',
      'SAFE note tracking',
      'Standard support',
      'Email notifications',
    ],
    cta: 'Start 14-day trial',
    href: '/register?plan=starter',
    highlighted: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 75,
    interval: 'month',
    description: 'Advanced tools for growing companies with complex equity needs.',
    features: [
      'Everything in Starter',
      '500 GB document storage',
      '100,000 API calls/month',
      '409A valuations',
      'SPV management',
      'Dilution modeling & waterfall analysis',
      'Vesting schedules',
      'Advanced reporting',
      'Priority support',
      'API access',
    ],
    cta: 'Start 14-day trial',
    href: '/register?plan=professional',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 250,
    interval: 'month',
    description: 'Full-featured platform for established companies and funds.',
    features: [
      'Everything in Professional',
      'Unlimited document storage',
      'Unlimited API calls',
      'MCP server access',
      'AI agent integrations',
      'Custom integrations',
      'Advanced analytics & fundraise modeling',
      'Dedicated support',
      'SLA guarantee',
      'Dedicated account manager',
      'Custom onboarding & training',
    ],
    cta: 'Contact sales',
    href: '/register?plan=enterprise',
    highlighted: false,
  },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="18" width="7" height="11" rx="1.5" fill="#2563EB"/>
            <rect x="12.5" y="11" width="7" height="18" rx="1.5" fill="#2563EB"/>
            <rect x="22" y="3" width="7" height="26" rx="1.5" fill="#2563EB"/>
          </svg>
          <span className="font-bold text-gray-900">OpenCap Stack</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/register" className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Get started free
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, usage-based pricing</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Pay for access and usage — not seats. Add as many team members as you need at no extra cost.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlighted
                  ? 'border-blue-500 bg-white shadow-lg ring-2 ring-blue-500'
                  : 'border-gray-200 bg-white shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
                  Most popular
                </div>
              )}
              <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500 text-sm ml-1">/ month</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

              <Link
                href={plan.href}
                className={`block text-center py-2.5 px-4 rounded-lg font-medium text-sm mb-6 transition-colors ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckIcon />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ / notes */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 text-sm">
            All paid plans include a 14-day free trial. No credit card required for Free plan.{' '}
            <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link> to manage your subscription.
          </p>
        </div>
      </div>
    </div>
  );
}
