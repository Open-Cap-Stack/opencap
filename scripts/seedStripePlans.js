#!/usr/bin/env node

/**
 * Seed Stripe Plans
 *
 * Populates subscription_plans table with plan data from config/stripe.js.
 * Creates Stripe products/prices for plans that don't have them yet.
 *
 * Usage: node scripts/seedStripePlans.js
 */

require('dotenv').config();

const stripeService = require('../services/stripeService');
const databaseAdapter = require('../services/databaseAdapter');
const { getAllPlans } = require('../config/stripe');

async function createStripeProductAndPrice(plan) {
    if (!stripeService.isConfigured()) {
        console.log(`  Stripe not configured, skipping product creation for ${plan.name}`);
        return { stripePriceId: plan.stripePriceId, stripeProductId: plan.stripeProductId };
    }

    if (plan.price === 0) {
        return { stripePriceId: null, stripeProductId: null };
    }

    if (plan.stripePriceId && plan.stripeProductId) {
        console.log(`  ${plan.name} already has Stripe IDs, skipping creation`);
        return { stripePriceId: plan.stripePriceId, stripeProductId: plan.stripeProductId };
    }

    try {
        console.log(`  Creating ${plan.name} product in Stripe...`);
        const product = await stripeService.createProduct({
            name: `${plan.name} Plan`,
            description: `OpenCap ${plan.name} - $${plan.price}/mo`
        });
        console.log(`  Product created: ${product.id}`);

        const price = await stripeService.createPrice({
            productId: product.id,
            amount: plan.price * 100,
            currency: 'usd',
            interval: plan.interval
        });
        console.log(`  Price created: ${price.id}`);

        return { stripePriceId: price.id, stripeProductId: product.id };
    } catch (err) {
        console.error(`  Failed to create Stripe product/price: ${err.message}`);
        return { stripePriceId: plan.stripePriceId, stripeProductId: plan.stripeProductId };
    }
}

async function seedPlans() {
    console.log('Starting plan seed...\n');

    const plans = getAllPlans();

    for (const plan of plans) {
        console.log(`Processing plan: ${plan.name} ($${plan.price}/mo)`);

        const { stripePriceId, stripeProductId } = await createStripeProductAndPrice(plan);

        const planData = {
            name: plan.name,
            description: `OpenCap ${plan.name} Plan`,
            price: plan.price,
            currency: 'USD',
            interval: plan.interval,
            trialPeriodDays: plan.trialPeriodDays,
            stripePriceId,
            stripeProductId,
            features: plan.features,
            limits: plan.limits,
            isActive: true
        };

        try {
            const existing = await databaseAdapter.findOne('SubscriptionPlan', { planId: plan.id });

            if (existing) {
                console.log(`  Plan exists, updating...`);
                await databaseAdapter.findByIdAndUpdate('SubscriptionPlan', existing._id, planData);
                console.log(`  Updated: ${plan.name}`);
            } else {
                console.log(`  Creating new plan...`);
                await databaseAdapter.create('SubscriptionPlan', {
                    planId: plan.id,
                    ...planData
                });
                console.log(`  Created: ${plan.name}`);
            }
        } catch (err) {
            console.error(`  Error for ${plan.name}: ${err.message}`);
        }
    }

    console.log('\nPlan seed complete!');
    console.log('\nPlan summary:');
    plans.forEach(p => {
        const priceId = p.stripePriceId || process.env[`STRIPE_${p.id.toUpperCase()}_PRICE_ID`] || 'none';
        console.log(`  ${p.name}: $${p.price}/mo | Stripe Price: ${priceId}`);
    });
}

seedPlans().then(() => process.exit(0)).catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
