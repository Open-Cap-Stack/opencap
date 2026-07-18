/**
 * Tests for scripts/setup-stripe-products.js
 *
 * Validates product/price creation, idempotency, error handling,
 * correct cent amounts, and env var output format.
 */

const {
  PLAN_DEFINITIONS,
  findExistingProduct,
  findExistingPrice,
  ensureProductAndPrice,
  main
} = require('../../../scripts/setup-stripe-products');

/**
 * Create a fresh mock Stripe instance for each test.
 */
function createMockStripe() {
  return {
    products: {
      create: jest.fn(),
      list: jest.fn()
    },
    prices: {
      create: jest.fn(),
      list: jest.fn()
    }
  };
}

describe('setup-stripe-products', () => {
  const originalEnv = process.env;
  let mockStripe;
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockStripe = createMockStripe();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  // ─── Plan Definitions ───────────────────────────────────────────

  describe('PLAN_DEFINITIONS', () => {
    it('should define exactly 3 paid plans', () => {
      expect(PLAN_DEFINITIONS).toHaveLength(3);
    });

    it('should define Starter at $25/month (2500 cents)', () => {
      const starter = PLAN_DEFINITIONS.find((p) => p.key === 'STARTER');
      expect(starter).toBeDefined();
      expect(starter.amountCents).toBe(2500);
      expect(starter.interval).toBe('month');
      expect(starter.currency).toBe('usd');
      expect(starter.name).toBe('OpenCap Stack Starter');
    });

    it('should define Professional at $75/month (7500 cents)', () => {
      const pro = PLAN_DEFINITIONS.find((p) => p.key === 'PROFESSIONAL');
      expect(pro).toBeDefined();
      expect(pro.amountCents).toBe(7500);
      expect(pro.interval).toBe('month');
      expect(pro.currency).toBe('usd');
      expect(pro.name).toBe('OpenCap Stack Professional');
    });

    it('should define Enterprise at $250/month (25000 cents)', () => {
      const ent = PLAN_DEFINITIONS.find((p) => p.key === 'ENTERPRISE');
      expect(ent).toBeDefined();
      expect(ent.amountCents).toBe(25000);
      expect(ent.interval).toBe('month');
      expect(ent.currency).toBe('usd');
      expect(ent.name).toBe('OpenCap Stack Enterprise');
    });

    it('should include descriptions for every plan', () => {
      PLAN_DEFINITIONS.forEach((plan) => {
        expect(plan.description).toBeTruthy();
        expect(typeof plan.description).toBe('string');
        expect(plan.description.length).toBeGreaterThan(20);
      });
    });

    it('should use plan keys that match env var naming convention', () => {
      const validKeys = ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
      PLAN_DEFINITIONS.forEach((plan) => {
        expect(validKeys).toContain(plan.key);
      });
    });
  });

  // ─── findExistingProduct ────────────────────────────────────────

  describe('findExistingProduct', () => {
    it('should return matching product when found', async () => {
      const existing = { id: 'prod_abc', name: 'OpenCap Stack Starter' };
      mockStripe.products.list.mockResolvedValue({
        data: [existing, { id: 'prod_other', name: 'Other Product' }]
      });

      const result = await findExistingProduct(mockStripe, 'OpenCap Stack Starter');
      expect(result).toEqual(existing);
      expect(mockStripe.products.list).toHaveBeenCalledWith({ limit: 100, active: true });
    });

    it('should return null when product not found', async () => {
      mockStripe.products.list.mockResolvedValue({
        data: [{ id: 'prod_other', name: 'Other Product' }]
      });

      const result = await findExistingProduct(mockStripe, 'OpenCap Stack Starter');
      expect(result).toBeNull();
    });

    it('should return null when product list is empty', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });

      const result = await findExistingProduct(mockStripe, 'OpenCap Stack Starter');
      expect(result).toBeNull();
    });

    it('should match by exact name only', async () => {
      mockStripe.products.list.mockResolvedValue({
        data: [
          { id: 'prod_1', name: 'OpenCap Stack Starter Extra' },
          { id: 'prod_2', name: 'Starter' }
        ]
      });

      const result = await findExistingProduct(mockStripe, 'OpenCap Stack Starter');
      expect(result).toBeNull();
    });
  });

  // ─── findExistingPrice ──────────────────────────────────────────

  describe('findExistingPrice', () => {
    it('should return first active recurring price for a product', async () => {
      const existing = { id: 'price_abc', unit_amount: 2500 };
      mockStripe.prices.list.mockResolvedValue({ data: [existing] });

      const result = await findExistingPrice(mockStripe, 'prod_123');
      expect(result).toEqual(existing);
      expect(mockStripe.prices.list).toHaveBeenCalledWith({
        product: 'prod_123',
        active: true,
        type: 'recurring',
        limit: 10
      });
    });

    it('should return null when no prices exist', async () => {
      mockStripe.prices.list.mockResolvedValue({ data: [] });

      const result = await findExistingPrice(mockStripe, 'prod_123');
      expect(result).toBeNull();
    });
  });

  // ─── ensureProductAndPrice ──────────────────────────────────────

  describe('ensureProductAndPrice', () => {
    const starterPlan = PLAN_DEFINITIONS[0]; // Starter

    it('should create new product and price when none exist', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_new' });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_new' });

      const result = await ensureProductAndPrice(mockStripe, starterPlan);

      expect(mockStripe.products.create).toHaveBeenCalledWith({
        name: starterPlan.name,
        description: starterPlan.description
      });
      expect(mockStripe.prices.create).toHaveBeenCalledWith({
        product: 'prod_new',
        unit_amount: 2500,
        currency: 'usd',
        recurring: { interval: 'month' }
      });
      expect(result.product.id).toBe('prod_new');
      expect(result.price.id).toBe('price_new');
      expect(result.created).toBe(true);
    });

    it('should skip product creation when product already exists', async () => {
      const existingProduct = { id: 'prod_existing', name: 'OpenCap Stack Starter' };
      mockStripe.products.list.mockResolvedValue({ data: [existingProduct] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_new' });

      const result = await ensureProductAndPrice(mockStripe, starterPlan);

      expect(mockStripe.products.create).not.toHaveBeenCalled();
      expect(result.product.id).toBe('prod_existing');
      expect(result.price.id).toBe('price_new');
      expect(result.created).toBe(true);
    });

    it('should skip both product and price when both already exist', async () => {
      const existingProduct = { id: 'prod_existing', name: 'OpenCap Stack Starter' };
      const existingPrice = { id: 'price_existing', unit_amount: 2500 };
      mockStripe.products.list.mockResolvedValue({ data: [existingProduct] });
      mockStripe.prices.list.mockResolvedValue({ data: [existingPrice] });

      const result = await ensureProductAndPrice(mockStripe, starterPlan);

      expect(mockStripe.products.create).not.toHaveBeenCalled();
      expect(mockStripe.prices.create).not.toHaveBeenCalled();
      expect(result.product.id).toBe('prod_existing');
      expect(result.price.id).toBe('price_existing');
      expect(result.created).toBe(false);
    });

    it('should pass correct cents for Professional plan (7500)', async () => {
      const proPlan = PLAN_DEFINITIONS.find((p) => p.key === 'PROFESSIONAL');
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_pro' });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_pro' });

      await ensureProductAndPrice(mockStripe, proPlan);

      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({ unit_amount: 7500 })
      );
    });

    it('should pass correct cents for Enterprise plan (25000)', async () => {
      const entPlan = PLAN_DEFINITIONS.find((p) => p.key === 'ENTERPRISE');
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_ent' });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_ent' });

      await ensureProductAndPrice(mockStripe, entPlan);

      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({ unit_amount: 25000 })
      );
    });

    it('should propagate Stripe API errors', async () => {
      mockStripe.products.list.mockRejectedValue(new Error('Invalid API Key'));

      await expect(
        ensureProductAndPrice(mockStripe, starterPlan)
      ).rejects.toThrow('Invalid API Key');
    });

    it('should propagate price creation errors', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_new' });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        ensureProductAndPrice(mockStripe, starterPlan)
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  // ─── main() ─────────────────────────────────────────────────────

  describe('main', () => {
    it('should exit with code 1 when STRIPE_SECRET_KEY is not set and no override', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      await expect(main()).rejects.toThrow('process.exit called');

      expect(processExitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: STRIPE_SECRET_KEY environment variable is not set.'
      );
    });

    it('should create all 3 products and prices', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });

      let productCount = 0;
      let priceCount = 0;
      mockStripe.products.create.mockImplementation(({ name }) => {
        productCount++;
        return Promise.resolve({ id: `prod_${productCount}`, name });
      });
      mockStripe.prices.create.mockImplementation(() => {
        priceCount++;
        return Promise.resolve({ id: `price_${priceCount}` });
      });

      const result = await main(mockStripe);

      expect(mockStripe.products.create).toHaveBeenCalledTimes(3);
      expect(mockStripe.prices.create).toHaveBeenCalledTimes(3);
      expect(result.envLines).toHaveLength(6);
    });

    it('should output correct env var names in envLines', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockImplementation(({ name }) =>
        Promise.resolve({ id: 'prod_x', name })
      );
      mockStripe.prices.create.mockResolvedValue({ id: 'price_x' });

      const result = await main(mockStripe);

      const envText = result.envLines.join('\n');
      expect(envText).toContain('STRIPE_STARTER_PRICE_ID=price_x');
      expect(envText).toContain('STRIPE_STARTER_PRODUCT_ID=prod_x');
      expect(envText).toContain('STRIPE_PROFESSIONAL_PRICE_ID=price_x');
      expect(envText).toContain('STRIPE_PROFESSIONAL_PRODUCT_ID=prod_x');
      expect(envText).toContain('STRIPE_ENTERPRISE_PRICE_ID=price_x');
      expect(envText).toContain('STRIPE_ENTERPRISE_PRODUCT_ID=prod_x');
    });

    it('should handle idempotent run (all products exist)', async () => {
      mockStripe.products.list.mockImplementation(() => {
        return Promise.resolve({
          data: [
            { id: 'prod_s', name: 'OpenCap Stack Starter' },
            { id: 'prod_p', name: 'OpenCap Stack Professional' },
            { id: 'prod_e', name: 'OpenCap Stack Enterprise' }
          ]
        });
      });
      mockStripe.prices.list.mockImplementation(({ product }) => {
        const priceMap = {
          prod_s: { id: 'price_s', unit_amount: 2500 },
          prod_p: { id: 'price_p', unit_amount: 7500 },
          prod_e: { id: 'price_e', unit_amount: 25000 }
        };
        return Promise.resolve({ data: [priceMap[product]] });
      });

      const result = await main(mockStripe);

      expect(mockStripe.products.create).not.toHaveBeenCalled();
      expect(mockStripe.prices.create).not.toHaveBeenCalled();

      const envText = result.envLines.join('\n');
      expect(envText).toContain('STRIPE_STARTER_PRICE_ID=price_s');
      expect(envText).toContain('STRIPE_PROFESSIONAL_PRICE_ID=price_p');
      expect(envText).toContain('STRIPE_ENTERPRISE_PRICE_ID=price_e');
    });

    it('should log setup instructions to console', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_1' });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_1' });

      await main(mockStripe);

      const logCalls = consoleLogSpy.mock.calls.map((c) => c[0]);
      expect(logCalls).toContain('Setting up OpenCap Stack Stripe products...');
      expect(logCalls.some((l) => typeof l === 'string' && l.includes('Add the following'))).toBe(true);
      expect(logCalls.some((l) => typeof l === 'string' && l.includes('Done!'))).toBe(true);
    });

    it('should propagate Stripe API errors in main', async () => {
      mockStripe.products.list.mockRejectedValue(new Error('Network error'));

      await expect(main(mockStripe)).rejects.toThrow('Network error');
    });

    it('should return results keyed by plan key', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_1' });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_1' });

      const result = await main(mockStripe);

      expect(result.results).toHaveProperty('STARTER');
      expect(result.results).toHaveProperty('PROFESSIONAL');
      expect(result.results).toHaveProperty('ENTERPRISE');
      expect(result.results.STARTER.product.id).toBe('prod_1');
      expect(result.results.STARTER.price.id).toBe('price_1');
    });
  });

  // ─── Error Scenarios ────────────────────────────────────────────

  describe('error handling', () => {
    it('should show usage instructions when API key is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY;

      await expect(main()).rejects.toThrow('process.exit called');

      const errorCalls = consoleErrorSpy.mock.calls.map((c) => c[0]);
      expect(errorCalls.some((msg) =>
        typeof msg === 'string' && msg.includes('STRIPE_SECRET_KEY')
      )).toBe(true);
      expect(errorCalls.some((msg) =>
        typeof msg === 'string' && msg.includes('Usage:')
      )).toBe(true);
    });

    it('should handle Stripe authentication error', async () => {
      const authError = new Error('Invalid API Key provided: sk_test_*****lid');
      authError.type = 'StripeAuthenticationError';
      mockStripe.products.list.mockRejectedValue(authError);

      await expect(main(mockStripe)).rejects.toThrow('Invalid API Key');
    });

    it('should handle Stripe rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.type = 'StripeRateLimitError';
      mockStripe.products.list.mockRejectedValue(rateLimitError);

      await expect(main(mockStripe)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network connectivity error', async () => {
      const netError = new Error('connect ECONNREFUSED 127.0.0.1:443');
      netError.code = 'ECONNREFUSED';
      mockStripe.products.list.mockRejectedValue(netError);

      await expect(main(mockStripe)).rejects.toThrow('ECONNREFUSED');
    });
  });

  // ─── Price amount validation ────────────────────────────────────

  describe('price amounts', () => {
    it('Starter should be exactly 2500 cents ($25)', () => {
      const plan = PLAN_DEFINITIONS.find((p) => p.key === 'STARTER');
      expect(plan.amountCents).toBe(2500);
    });

    it('Professional should be exactly 7500 cents ($75)', () => {
      const plan = PLAN_DEFINITIONS.find((p) => p.key === 'PROFESSIONAL');
      expect(plan.amountCents).toBe(7500);
    });

    it('Enterprise should be exactly 25000 cents ($250)', () => {
      const plan = PLAN_DEFINITIONS.find((p) => p.key === 'ENTERPRISE');
      expect(plan.amountCents).toBe(25000);
    });

    it('all prices should be in USD', () => {
      PLAN_DEFINITIONS.forEach((plan) => {
        expect(plan.currency).toBe('usd');
      });
    });

    it('all prices should be monthly', () => {
      PLAN_DEFINITIONS.forEach((plan) => {
        expect(plan.interval).toBe('month');
      });
    });
  });

  // ─── Output format ─────────────────────────────────────────────

  describe('output format', () => {
    it('should produce exactly 6 env var lines (2 per plan)', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_1' });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_1' });

      const result = await main(mockStripe);
      expect(result.envLines).toHaveLength(6);
    });

    it('each env line should follow KEY=VALUE format', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_test' });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_test' });

      const result = await main(mockStripe);

      result.envLines.forEach((line) => {
        expect(line).toMatch(/^STRIPE_[A-Z_]+=\S+$/);
      });
    });

    it('should include both PRICE_ID and PRODUCT_ID for each plan', async () => {
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: 'prod_1' });
      mockStripe.prices.create.mockResolvedValue({ id: 'price_1' });

      const result = await main(mockStripe);
      const envText = result.envLines.join('\n');

      ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].forEach((key) => {
        expect(envText).toContain(`STRIPE_${key}_PRICE_ID=`);
        expect(envText).toContain(`STRIPE_${key}_PRODUCT_ID=`);
      });
    });
  });
});
