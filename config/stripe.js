/**
 * Centralized Stripe Configuration
 * Issue #4: Stripe config centralization
 *
 * Single source of truth for all Stripe-related configuration.
 * All Stripe price IDs, product IDs, and plan metadata live here.
 *
 * Pricing model:
 *   free        — seat-capped (5 users max), no investor database access
 *   starter     — usage-based, no seat cap, investor database (read only for SPV FOMO signals)
 *   professional — usage-based, no seat cap, investor database (full access)
 *   enterprise  — usage-based, no seat cap, investor database + bulk export
 *
 * Platform carry: OpenCap Stack takes 5% carried interest on every SPV created
 * through the platform. This is baked into SPV creation and non-negotiable.
 */

const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        stripePriceId: process.env.STRIPE_FREE_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_FREE_PRODUCT_ID || null,
        trialPeriodDays: 0,
        features: [
            'Up to 5 team members',
            'Up to 25 stakeholders',
            '50 documents',
            '500 MB storage',
            '1,000 API calls/month',
            'Basic cap table management',
            'Community support'
        ],
        limits: {
            users: 5,           // seat cap — free plan only
            stakeholders: 25,
            documents: 50,
            storageGB: 0.5,
            apiCallsPerMonth: 1000,
            investorDatabaseAccess: false,  // no investor master db
            investorExport: false
        }
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 25,
        interval: 'month',
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_STARTER_PRODUCT_ID || null,
        trialPeriodDays: 14,
        features: [
            'Unlimited team members',
            'Unlimited stakeholders',
            '100 GB document storage',
            '10,000 API calls/month',
            'Cap table & equity management',
            'SAFE note tracking',
            'SPV co-investor signals (VC & angel fund database)',
            'Standard support',
            'Email notifications'
        ],
        limits: {
            users: -1,          // usage-based, no seat cap
            stakeholders: -1,
            documents: 500,
            storageGB: 100,
            apiCallsPerMonth: 10000,
            investorDatabaseAccess: true,   // search VC/angel database for SPV signals
            investorExport: false
        }
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        price: 75,
        interval: 'month',
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID || null,
        trialPeriodDays: 14,
        features: [
            'Everything in Starter',
            'Unlimited team members',
            '500 GB document storage',
            '100,000 API calls/month',
            '409A valuations',
            'SPV management',
            'Full investor database access',
            'Dilution modeling & waterfall analysis',
            'Vesting schedules',
            'Advanced reporting',
            'Priority support',
            'API access'
        ],
        limits: {
            users: -1,          // usage-based, no seat cap
            stakeholders: -1,
            documents: 2000,
            storageGB: 500,
            apiCallsPerMonth: 100000,
            investorDatabaseAccess: true,
            investorExport: false
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 250,
        interval: 'month',
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || null,
        trialPeriodDays: 14,
        features: [
            'Everything in Professional',
            'Unlimited team members',
            'Unlimited document storage',
            'Unlimited API calls',
            'Investor database bulk export',
            'MCP server access',
            'AI agent integrations',
            'Custom integrations',
            'Advanced analytics & fundraise modeling',
            'Dedicated support',
            'SLA guarantee',
            'Dedicated account manager',
            'Custom onboarding & training'
        ],
        limits: {
            users: -1,          // usage-based, no seat cap
            stakeholders: -1,
            documents: -1,
            storageGB: -1,
            apiCallsPerMonth: -1,
            investorDatabaseAccess: true,
            investorExport: true   // bulk export — enterprise only
        }
    }
};

function getStripeConfig() {
    return {
        secretKey: process.env.STRIPE_SECRET_KEY || null,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
        isConfigured: !!process.env.STRIPE_SECRET_KEY
    };
}

function getPlanByPriceId(stripePriceId) {
    return Object.values(PLANS).find(p => p.stripePriceId === stripePriceId) || null;
}

function getPlanById(planId) {
    return PLANS[planId] || null;
}

function getAllPlans() {
    return Object.values(PLANS).sort((a, b) => a.price - b.price);
}

function getPaidPlans() {
    return getAllPlans().filter(p => p.price > 0);
}

module.exports = {
    PLANS,
    getStripeConfig,
    getPlanByPriceId,
    getPlanById,
    getAllPlans,
    getPaidPlans
};
