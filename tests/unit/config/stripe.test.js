/**
 * Stripe Config Tests
 *
 * Tests for config/stripe.js centralized Stripe configuration.
 */

describe('Stripe Config', () => {
    let stripeConfig;

    beforeEach(() => {
        jest.resetModules();
        // Set env vars for testing
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
        process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
        process.env.STRIPE_STARTER_PRICE_ID = 'price_starter';
        process.env.STRIPE_PROFESSIONAL_PRICE_ID = 'price_pro';
        process.env.STRIPE_ENTERPRISE_PRICE_ID = 'price_ent';
        stripeConfig = require('../../../config/stripe');
    });

    afterEach(() => {
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_PUBLISHABLE_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.STRIPE_STARTER_PRICE_ID;
        delete process.env.STRIPE_PROFESSIONAL_PRICE_ID;
        delete process.env.STRIPE_ENTERPRISE_PRICE_ID;
    });

    describe('PLANS', () => {
        it('should define exactly 4 plans', () => {
            expect(Object.keys(stripeConfig.PLANS)).toHaveLength(4);
        });

        it('should have correct plan IDs', () => {
            expect(stripeConfig.PLANS.free).toBeDefined();
            expect(stripeConfig.PLANS.starter).toBeDefined();
            expect(stripeConfig.PLANS.professional).toBeDefined();
            expect(stripeConfig.PLANS.enterprise).toBeDefined();
        });

        it('should have unified pricing at $1/$49/$149/$499', () => {
            expect(stripeConfig.PLANS.free.price).toBe(1);
            expect(stripeConfig.PLANS.starter.price).toBe(49);
            expect(stripeConfig.PLANS.professional.price).toBe(149);
            expect(stripeConfig.PLANS.enterprise.price).toBe(499);
        });

        it('should read Stripe price IDs from env vars', () => {
            expect(stripeConfig.PLANS.starter.stripePriceId).toBe('price_starter');
            expect(stripeConfig.PLANS.professional.stripePriceId).toBe('price_pro');
            expect(stripeConfig.PLANS.enterprise.stripePriceId).toBe('price_ent');
        });

        it('should have null Stripe IDs for free plan', () => {
            expect(stripeConfig.PLANS.free.stripePriceId).toBeNull();
            expect(stripeConfig.PLANS.free.stripeProductId).toBeNull();
        });

        it('should define features for all plans', () => {
            Object.values(stripeConfig.PLANS).forEach(plan => {
                expect(plan.features).toBeInstanceOf(Array);
                expect(plan.features.length).toBeGreaterThan(0);
            });
        });

        it('should define limits for all plans', () => {
            Object.values(stripeConfig.PLANS).forEach(plan => {
                expect(plan.limits).toBeDefined();
                expect(plan.limits.stakeholders).toBeDefined();
                expect(plan.limits.documents).toBeDefined();
                expect(plan.limits.users).toBeDefined();
            });
        });

        it('should have unlimited (-1) limits for enterprise', () => {
            expect(stripeConfig.PLANS.enterprise.limits.stakeholders).toBe(-1);
            expect(stripeConfig.PLANS.enterprise.limits.documents).toBe(-1);
            expect(stripeConfig.PLANS.enterprise.limits.users).toBe(-1);
        });
    });

    describe('getStripeConfig', () => {
        it('should return Stripe configuration object', () => {
            const config = stripeConfig.getStripeConfig();
            expect(config.secretKey).toBe('sk_test_123');
            expect(config.publishableKey).toBe('pk_test_123');
            expect(config.webhookSecret).toBe('whsec_test_123');
            expect(config.isConfigured).toBe(true);
        });

        it('should report not configured when secret key missing', () => {
            delete process.env.STRIPE_SECRET_KEY;
            jest.resetModules();
            const freshConfig = require('../../../config/stripe');
            const config = freshConfig.getStripeConfig();
            expect(config.isConfigured).toBe(false);
            expect(config.secretKey).toBeNull();
        });
    });

    describe('getPlanById', () => {
        it('should return plan by ID', () => {
            const plan = stripeConfig.getPlanById('starter');
            expect(plan).toBeDefined();
            expect(plan.name).toBe('Starter');
            expect(plan.price).toBe(49);
        });

        it('should return null for unknown plan', () => {
            expect(stripeConfig.getPlanById('nonexistent')).toBeNull();
        });
    });

    describe('getPlanByPriceId', () => {
        it('should find plan by Stripe price ID', () => {
            const plan = stripeConfig.getPlanByPriceId('price_starter');
            expect(plan).toBeDefined();
            expect(plan.id).toBe('starter');
        });

        it('should return null for unknown price ID', () => {
            expect(stripeConfig.getPlanByPriceId('price_unknown')).toBeNull();
        });
    });

    describe('getAllPlans', () => {
        it('should return all plans sorted by price', () => {
            const plans = stripeConfig.getAllPlans();
            expect(plans).toHaveLength(4);
            expect(plans[0].price).toBe(1);
            expect(plans[1].price).toBe(49);
            expect(plans[2].price).toBe(149);
            expect(plans[3].price).toBe(499);
        });
    });

    describe('getPaidPlans', () => {
        it('should return only paid plans', () => {
            const plans = stripeConfig.getPaidPlans();
            expect(plans).toHaveLength(4); // free plan is $1 (not $0), so all plans are "paid"
            plans.forEach(plan => {
                expect(plan.price).toBeGreaterThan(0);
            });
        });
    });
});
