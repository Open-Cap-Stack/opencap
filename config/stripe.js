/**
 * Centralized Stripe Configuration
 * Issue #4: Stripe config centralization
 *
 * Single source of truth for all Stripe-related configuration.
 * All Stripe price IDs, product IDs, and plan metadata live here.
 */

const PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        interval: 'month',
        stripePriceId: null,
        stripeProductId: null,
        trialPeriodDays: 0,
        features: [
            'Basic features',
            'Limited storage',
            '1 user'
        ],
        limits: {
            stakeholders: 10,
            documents: 100,
            storageGB: 1,
            users: 1,
            apiCallsPerMonth: 1000
        }
    },
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 49,
        interval: 'month',
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_STARTER_PRODUCT_ID || null,
        trialPeriodDays: 14,
        features: [
            'Up to 5 team members',
            '100 GB document storage',
            '10,000 API calls per month',
            'Basic equity management',
            'Standard support',
            'Email notifications'
        ],
        limits: {
            stakeholders: 50,
            documents: 500,
            storageGB: 100,
            users: 5,
            apiCallsPerMonth: 10000
        }
    },
    professional: {
        id: 'professional',
        name: 'Professional',
        price: 149,
        interval: 'month',
        stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_PROFESSIONAL_PRODUCT_ID || null,
        trialPeriodDays: 14,
        features: [
            'Up to 25 team members',
            '500 GB document storage',
            '100,000 API calls per month',
            'Advanced equity management',
            'Priority support',
            'Custom workflows',
            'Advanced reporting',
            'API access'
        ],
        limits: {
            stakeholders: 200,
            documents: 2000,
            storageGB: 500,
            users: 25,
            apiCallsPerMonth: 100000
        }
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise',
        price: 499,
        interval: 'month',
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
        stripeProductId: process.env.STRIPE_ENTERPRISE_PRODUCT_ID || null,
        trialPeriodDays: 14,
        features: [
            'Unlimited team members',
            'Unlimited document storage',
            'Unlimited API calls',
            'Full equity management suite',
            'Dedicated support',
            'Custom integrations',
            'Advanced analytics',
            'SLA guarantee',
            'Dedicated account manager',
            'Custom training'
        ],
        limits: {
            stakeholders: -1,
            documents: -1,
            storageGB: -1,
            users: -1,
            apiCallsPerMonth: -1
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
