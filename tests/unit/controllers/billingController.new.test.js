/**
 * Billing Controller - New Endpoint Tests
 *
 * Tests for: getPlans, createCustomerPortalSession, getCheckoutSession,
 * and response format validation for getCurrentPlan, getUsageMetrics,
 * getPaymentMethods, getInvoiceById.
 */

const BillingService = require('../../../services/billingService');
const stripeService = require('../../../services/stripeService');

jest.mock('../../../services/billingService');
jest.mock('../../../services/stripeService');

const billingController = require('../../../controllers/billingController');

function createMockReqRes(overrides = {}) {
    const req = {
        user: { companyId: 'comp_123', userId: 'user_1', email: 'test@test.com', name: 'Test' },
        body: {},
        params: {},
        query: {},
        headers: { origin: 'http://localhost:5173' },
        ...overrides
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        setHeader: jest.fn()
    };
    return { req, res };
}

describe('Billing Controller - New Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        stripeService.isConfigured.mockReturnValue(true);
    });

    describe('getPlans', () => {
        it('should return all plans wrapped in { plans: [...] }', async () => {
            const { req, res } = createMockReqRes();

            await billingController.getPlans(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.plans).toBeInstanceOf(Array);
            expect(response.plans.length).toBe(4);
            expect(response.plans[0].price).toBe(1); // free ($1/month service fee)
            expect(response.plans[1].price).toBe(49); // starter
            expect(response.plans[2].price).toBe(149); // professional
            expect(response.plans[3].price).toBe(499); // enterprise
        });
    });

    describe('createCustomerPortalSession', () => {
        it('should return 503 when Stripe is not configured', async () => {
            stripeService.isConfigured.mockReturnValue(false);
            const { req, res } = createMockReqRes();

            await billingController.createCustomerPortalSession(req, res);

            expect(res.status).toHaveBeenCalledWith(503);
        });

        it('should return 400 when companyId is missing', async () => {
            const { req, res } = createMockReqRes({ user: {} });

            await billingController.createCustomerPortalSession(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should create portal session and return URL', async () => {
            BillingService.getOrCreateStripeCustomer.mockResolvedValue({
                stripeCustomerId: 'cus_123'
            });

            const mockStripe = {
                billingPortal: {
                    sessions: {
                        create: jest.fn().mockResolvedValue({
                            url: 'https://billing.stripe.com/session/test'
                        })
                    }
                }
            };
            stripeService.getStripe.mockReturnValue(mockStripe);

            const { req, res } = createMockReqRes();

            await billingController.createCustomerPortalSession(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                url: 'https://billing.stripe.com/session/test'
            });
        });
    });

    describe('getCheckoutSession', () => {
        it('should return 503 when Stripe is not configured', async () => {
            stripeService.isConfigured.mockReturnValue(false);
            const { req, res } = createMockReqRes({ params: { sessionId: 'cs_123' } });

            await billingController.getCheckoutSession(req, res);

            expect(res.status).toHaveBeenCalledWith(503);
        });

        it('should return 400 when sessionId is missing', async () => {
            const { req, res } = createMockReqRes({ params: {} });

            await billingController.getCheckoutSession(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return session details wrapped in { session: {...} }', async () => {
            stripeService.retrieveCheckoutSession.mockResolvedValue({
                id: 'cs_123',
                status: 'complete',
                payment_status: 'paid',
                customer_details: { email: 'test@test.com' },
                amount_total: 14900,
                currency: 'usd',
                subscription: 'sub_123',
                created: Math.floor(Date.now() / 1000)
            });

            const { req, res } = createMockReqRes({ params: { sessionId: 'cs_123' } });

            await billingController.getCheckoutSession(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.session).toBeDefined();
            expect(response.session.id).toBe('cs_123');
            expect(response.session.paymentStatus).toBe('paid');
            expect(response.session.amountTotal).toBe(149); // cents to dollars
            expect(response.session.customerEmail).toBe('test@test.com');
        });
    });

    describe('Response Format - getCurrentPlan', () => {
        it('should wrap response in { plan: {...} } when companyId is present', async () => {
            BillingService.getCurrentPlan.mockResolvedValue({
                subscription: {},
                plan: { planId: 'starter', name: 'Starter' },
                isActive: true,
                daysRemaining: 25
            });

            const { req, res } = createMockReqRes();

            await billingController.getCurrentPlan(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.plan).toBeDefined();
            expect(response.plan.plan.planId).toBe('starter');
        });

        it('should return default free plan wrapped in { plan: {...} } when no companyId', async () => {
            const { req, res } = createMockReqRes({ user: {}, query: {} });

            await billingController.getCurrentPlan(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.plan).toBeDefined();
            expect(response.plan.planId).toBe('free');
        });

        it('should return default free plan wrapped in { plan: {...} } when no subscription', async () => {
            BillingService.getCurrentPlan.mockResolvedValue(null);

            const { req, res } = createMockReqRes();

            await billingController.getCurrentPlan(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.plan).toBeDefined();
            expect(response.plan.planId).toBe('free');
        });
    });

    describe('Response Format - getUsageMetrics', () => {
        it('should wrap response in { usage: {...} } when companyId is present', async () => {
            const mockUsage = {
                stakeholders: { current: 5, limit: 50, percentUsed: 10 },
                documents: { current: 10, limit: 500, percentUsed: 2 }
            };
            BillingService.getUsageMetrics.mockResolvedValue(mockUsage);

            const { req, res } = createMockReqRes();

            await billingController.getUsageMetrics(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.usage).toBeDefined();
            expect(response.usage.stakeholders.current).toBe(5);
        });

        it('should return default usage wrapped in { usage: {...} } when no companyId', async () => {
            const { req, res } = createMockReqRes({ user: {}, query: {} });

            await billingController.getUsageMetrics(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.usage).toBeDefined();
            expect(response.usage.stakeholders.used).toBe(0);
        });
    });

    describe('Response Format - getPaymentMethods', () => {
        it('should wrap response in { paymentMethods: [...] }', async () => {
            const mockMethods = [
                { methodId: 'pm_1', last4: '4242', isDefault: true }
            ];
            BillingService.getPaymentMethods.mockResolvedValue(mockMethods);

            const { req, res } = createMockReqRes();

            await billingController.getPaymentMethods(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.paymentMethods).toBeInstanceOf(Array);
            expect(response.paymentMethods[0].last4).toBe('4242');
        });

        it('should return { paymentMethods: [] } when no companyId', async () => {
            const { req, res } = createMockReqRes({ user: {}, query: {} });

            await billingController.getPaymentMethods(req, res);

            const response = res.json.mock.calls[0][0];
            expect(response.paymentMethods).toEqual([]);
        });
    });

    describe('Response Format - getInvoiceById', () => {
        it('should wrap response in { invoice: {...} }', async () => {
            const mockInvoice = {
                invoiceId: 'INV-123',
                companyId: 'comp_123',
                status: 'paid',
                amount: 149
            };
            BillingService.getInvoiceById.mockResolvedValue(mockInvoice);

            const { req, res } = createMockReqRes({ params: { id: 'INV-123' } });

            await billingController.getInvoiceById(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const response = res.json.mock.calls[0][0];
            expect(response.invoice).toBeDefined();
            expect(response.invoice.invoiceId).toBe('INV-123');
        });
    });
});
