#!/usr/bin/env node

/**
 * Seed Stripe Plans
 *
 * Populates subscription_plans table with Stripe price/product IDs.
 * Creates Enterprise product/price in Stripe if not already existing.
 *
 * Usage: node scripts/seedStripePlans.js
 */

require('dotenv').config();

const stripeService = require('../services/stripeService');
const databaseAdapter = require('../services/databaseAdapter');
const { v4: uuidv4 } = require('uuid');

const PLANS = [
  {
    planId: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    currency: 'USD',
    interval: 'month',
    trialPeriodDays: 0,
    sortOrder: 0,
    stripePriceId: null,
    stripeProductId: null,
    features: ['Basic features', 'Limited storage', '1 user'],
    limits: {
      stakeholders: 10,
      documents: 100,
      storageGB: 1,
      users: 1,
      apiCallsPerMonth: 1000
    }
  },
  {
    planId: 'starter',
    name: 'Starter',
    description: 'For small teams getting started',
    price: 49,
    currency: 'USD',
    interval: 'month',
    trialPeriodDays: 14,
    sortOrder: 1,
    stripePriceId: 'price_1RNMFGBtQ8USaAGXnchuOfrn',
    stripeProductId: 'prod_SHw7elxIQU8frQ',
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
  {
    planId: 'professional',
    name: 'Professional',
    description: 'Everything you need for a growing company',
    price: 199,
    currency: 'USD',
    interval: 'month',
    trialPeriodDays: 14,
    sortOrder: 2,
    stripePriceId: 'price_1RNMDOBtQ8USaAGXMrrJGKXz',
    stripeProductId: 'prod_SHw5bv6zlfVK78',
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
  {
    planId: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    price: 999,
    currency: 'USD',
    interval: 'month',
    trialPeriodDays: 14,
    sortOrder: 3,
    stripePriceId: null, // Will be created
    stripeProductId: null, // Will be created
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
];

async function seedPlans() {
  console.log('Starting plan seed...\n');

  for (const plan of PLANS) {
    console.log(`Processing plan: ${plan.name}`);

    // Create Enterprise product/price in Stripe if needed
    if (plan.planId === 'enterprise' && !plan.stripePriceId && stripeService.isConfigured()) {
      try {
        console.log('  Creating Enterprise product in Stripe...');
        const product = await stripeService.createProduct({
          name: 'Enterprise Plan',
          description: plan.description
        });
        plan.stripeProductId = product.id;
        console.log(`  Product created: ${product.id}`);

        const price = await stripeService.createPrice({
          productId: product.id,
          amount: plan.price * 100, // cents
          currency: 'usd',
          interval: 'month'
        });
        plan.stripePriceId = price.id;
        console.log(`  Price created: ${price.id}`);
      } catch (err) {
        console.error(`  Failed to create Stripe product/price: ${err.message}`);
      }
    }

    // Check if plan already exists
    try {
      const existing = await databaseAdapter.findOne('SubscriptionPlan', { planId: plan.planId });

      if (existing) {
        console.log(`  Plan exists, updating...`);
        await databaseAdapter.findByIdAndUpdate('SubscriptionPlan', existing._id, {
          name: plan.name,
          description: plan.description,
          price: plan.price,
          stripePriceId: plan.stripePriceId,
          stripeProductId: plan.stripeProductId,
          features: plan.features,
          limits: plan.limits,
          isActive: true
        });
        console.log(`  Updated: ${plan.name}`);
      } else {
        console.log(`  Creating new plan...`);
        await databaseAdapter.create('SubscriptionPlan', {
          planId: plan.planId,
          ...plan,
          isActive: true
        });
        console.log(`  Created: ${plan.name}`);
      }
    } catch (err) {
      console.error(`  Error for ${plan.name}: ${err.message}`);
    }
  }

  console.log('\nPlan seed complete!');
  console.log('\nPlan summary:');
  PLANS.forEach(p => {
    console.log(`  ${p.name}: $${p.price}/mo | Stripe: ${p.stripePriceId || 'none'}`);
  });
}

seedPlans().then(() => process.exit(0)).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
