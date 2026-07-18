#!/usr/bin/env node

/**
 * Setup Stripe Products & Prices
 *
 * Creates OpenCap Stack subscription products and recurring prices in Stripe.
 * Idempotent — skips creation if products with matching names already exist.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js
 *
 * Or set STRIPE_SECRET_KEY in .env and run:
 *   node scripts/setup-stripe-products.js
 */

// Load .env if dotenv is available
try {
  require('dotenv').config();
} catch (_) {
  // dotenv not installed — rely on env vars being set externally
}

const PLAN_DEFINITIONS = [
  {
    key: 'STARTER',
    name: 'OpenCap Stack Starter',
    description:
      'OpenCap Stack Starter plan. Unlimited team members, 100GB storage, SAFE tracking, investor database access.',
    amountCents: 2500, // $25/month
    interval: 'month',
    currency: 'usd'
  },
  {
    key: 'PROFESSIONAL',
    name: 'OpenCap Stack Professional',
    description:
      'OpenCap Stack Professional plan. 409A valuations, SPV management, full investor database, advanced reporting.',
    amountCents: 7500, // $75/month
    interval: 'month',
    currency: 'usd'
  },
  {
    key: 'ENTERPRISE',
    name: 'OpenCap Stack Enterprise',
    description:
      'OpenCap Stack Enterprise plan. Unlimited everything, bulk export, MCP access, custom integrations, dedicated support.',
    amountCents: 25000, // $250/month
    interval: 'month',
    currency: 'usd'
  }
];

/**
 * Find an existing Stripe product by exact name.
 * Returns the product object or null.
 */
async function findExistingProduct(stripe, name) {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find((p) => p.name === name) || null;
}

/**
 * Find the active recurring price for a product.
 * Returns the price object or null.
 */
async function findExistingPrice(stripe, productId) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring',
    limit: 10
  });
  return prices.data.length > 0 ? prices.data[0] : null;
}

/**
 * Create (or reuse) a single product + price pair.
 * Returns { product, price, created }.
 */
async function ensureProductAndPrice(stripe, plan) {
  let product = await findExistingProduct(stripe, plan.name);
  let created = false;

  if (product) {
    console.log(`  [skip] Product "${plan.name}" already exists (${product.id})`);
  } else {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description
    });
    console.log(`  [create] Product "${plan.name}" created (${product.id})`);
    created = true;
  }

  let price = await findExistingPrice(stripe, product.id);

  if (price) {
    console.log(`  [skip] Price for "${plan.name}" already exists (${price.id})`);
  } else {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amountCents,
      currency: plan.currency,
      recurring: { interval: plan.interval }
    });
    console.log(`  [create] Price for "${plan.name}" created (${price.id})`);
    created = true;
  }

  return { product, price, created };
}

/**
 * Create a Stripe client from the secret key.
 * Separated for testability.
 */
function createStripeClient(secretKey) {
  return require('stripe')(secretKey);
}

/**
 * Main entry point.
 * Creates all products/prices and prints the env vars to set.
 *
 * @param {Object} [stripeOverride] - Optional Stripe instance (for testing)
 */
async function main(stripeOverride) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeOverride && !secretKey) {
    console.error('Error: STRIPE_SECRET_KEY environment variable is not set.');
    console.error('');
    console.error('Usage:');
    console.error('  STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe-products.js');
    process.exit(1);
  }

  const stripe = stripeOverride || createStripeClient(secretKey);

  console.log('');
  console.log('Setting up OpenCap Stack Stripe products...');
  console.log('');

  const results = {};

  for (const plan of PLAN_DEFINITIONS) {
    const result = await ensureProductAndPrice(stripe, plan);
    results[plan.key] = result;
    console.log('');
  }

  // Build env output
  const envLines = [];
  for (const plan of PLAN_DEFINITIONS) {
    const { product, price } = results[plan.key];
    envLines.push(`STRIPE_${plan.key}_PRICE_ID=${price.id}`);
    envLines.push(`STRIPE_${plan.key}_PRODUCT_ID=${product.id}`);
  }

  console.log('='.repeat(60));
  console.log('Add the following to your .env or Railway variables:');
  console.log('='.repeat(60));
  console.log('');
  envLines.forEach((line) => console.log(line));
  console.log('');
  console.log('='.repeat(60));
  console.log('Done! Copy the variables above into your environment.');
  console.log('='.repeat(60));

  return { results, envLines };
}

// Export for testing
module.exports = {
  PLAN_DEFINITIONS,
  findExistingProduct,
  findExistingPrice,
  ensureProductAndPrice,
  createStripeClient,
  main
};

// Run when invoked directly
if (require.main === module) {
  main().catch((err) => {
    console.error('');
    console.error('Failed to set up Stripe products:', err.message);
    process.exit(1);
  });
}
