/**
 * Billing Service - Stripe Integration Tests
 *
 * Tests for webhook handling, upgrade/downgrade Stripe wiring,
 * customer management, and subscription lifecycle.
 */

const databaseAdapter = require('../../../services/databaseAdapter');
const stripeService = require('../../../services/stripeService');

jest.mock('../../../services/databaseAdapter');
jest.mock('../../../services/stripeService');
jest.mock('../../../models/WebhookEvent');

const BillingService = require('../../../services/billingService');
const WebhookEvent = require('../../../models/WebhookEvent');

describe('BillingService - Stripe Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        stripeService.isConfigured.mockReturnValue(true);
    });

    describe('getOrCreateStripeCustomer', () => {
        it('should return existing customer mapping if found', async () => {
            const existing = { companyId: 'comp_1', stripeCustomerId: 'cus_existing' };
            databaseAdapter.findOne.mockResolvedValue(existing);

            const result = await BillingService.getOrCreateStripeCustomer('comp_1', 'test@test.com', 'Test');

            expect(databaseAdapter.findOne).toHaveBeenCalledWith('StripeCustomer', { companyId: 'comp_1' });
            expect(result).toEqual(existing);
            expect(stripeService.createCustomer).not.toHaveBeenCalled();
        });

        it('should create Stripe customer and save mapping when not found', async () => {
            databaseAdapter.findOne.mockResolvedValue(null);
            stripeService.createCustomer.mockResolvedValue({ id: 'cus_new' });
            databaseAdapter.create.mockResolvedValue({
                companyId: 'comp_1',
                stripeCustomerId: 'cus_new',
                email: 'test@test.com'
            });

            const result = await BillingService.getOrCreateStripeCustomer('comp_1', 'test@test.com', 'Test');

            expect(stripeService.createCustomer).toHaveBeenCalledWith({
                email: 'test@test.com',
                name: 'Test',
                metadata: { companyId: 'comp_1' }
            });
            expect(databaseAdapter.create).toHaveBeenCalledWith('StripeCustomer', expect.objectContaining({
                companyId: 'comp_1',
                stripeCustomerId: 'cus_new'
            }));
            expect(result.stripeCustomerId).toBe('cus_new');
        });

        it('should throw when Stripe is not configured', async () => {
            stripeService.isConfigured.mockReturnValue(false);

            await expect(
                BillingService.getOrCreateStripeCustomer('comp_1', 'test@test.com', 'Test')
            ).rejects.toThrow('Stripe is not configured');
        });
    });

    describe('upgradePlan - Stripe wiring', () => {
        beforeEach(() => {
            databaseAdapter.findOne.mockReset();
            databaseAdapter.findByIdAndUpdate.mockReset();
        });

        const mockSubscription = {
            _id: 'sub_id',
            companyId: 'comp_1',
            planId: 'starter',
            status: 'active',
            stripeSubscriptionId: 'sub_stripe_1',
            currentPeriodEnd: new Date(Date.now() + 86400000).toISOString()
        };

        const mockCurrentPlan = {
            planId: 'starter',
            price: 49,
            isActive: true
        };

        const mockNewPlan = {
            planId: 'professional',
            price: 149,
            isActive: true,
            stripePriceId: 'price_pro'
        };

        it('should call Stripe API when subscription has stripeSubscriptionId', async () => {
            databaseAdapter.findOne
                .mockResolvedValueOnce(mockSubscription) // find subscription
                .mockResolvedValueOnce(mockCurrentPlan)   // find current plan
                .mockResolvedValueOnce(mockNewPlan);       // find new plan

            const mockStripeSub = {
                id: 'sub_stripe_1',
                status: 'active',
                customer: 'cus_1',
                items: { data: [{ price: { id: 'price_pro' } }] },
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 86400
            };

            stripeService.updateSubscription.mockResolvedValue(mockStripeSub);

            // Mock _syncSubscriptionFromStripe dependencies
            databaseAdapter.findOne
                .mockResolvedValueOnce(mockNewPlan)        // find plan by stripePriceId
                .mockResolvedValueOnce(mockSubscription);  // find existing subscription

            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.upgradePlan('comp_1', 'professional');

            expect(stripeService.updateSubscription).toHaveBeenCalledWith('sub_stripe_1', {
                priceId: 'price_pro'
            });
            expect(result.success).toBe(true);
        });

        it('should fallback to local-only update when no stripeSubscriptionId', async () => {
            const localSub = { ...mockSubscription, stripeSubscriptionId: null };
            databaseAdapter.findOne
                .mockResolvedValueOnce(localSub)
                .mockResolvedValueOnce(mockCurrentPlan)
                .mockResolvedValueOnce(mockNewPlan);

            databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...localSub, planId: 'professional' });

            const result = await BillingService.upgradePlan('comp_1', 'professional');

            expect(stripeService.updateSubscription).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.prorationAmount).toBeDefined();
        });

        it('should throw when already on the plan', async () => {
            databaseAdapter.findOne
                .mockResolvedValueOnce({ ...mockSubscription, planId: 'professional' })
                .mockResolvedValueOnce(mockCurrentPlan);

            await expect(
                BillingService.upgradePlan('comp_1', 'professional')
            ).rejects.toThrow('Already on this plan');
        });

        it('should throw when no active subscription', async () => {
            // First findOne (for Subscription) returns null
            databaseAdapter.findOne.mockResolvedValueOnce(null);

            await expect(
                BillingService.upgradePlan('comp_1', 'professional')
            ).rejects.toThrow('No active subscription');

            // Verify only subscription lookup was called
            expect(databaseAdapter.findOne).toHaveBeenCalledTimes(1);
        });
    });

    describe('cancelSubscription', () => {
        it('should cancel via Stripe when stripeSubscriptionId exists', async () => {
            const sub = {
                _id: 'sub_id',
                companyId: 'comp_1',
                status: 'active',
                stripeSubscriptionId: 'sub_stripe_1'
            };
            databaseAdapter.findOne.mockResolvedValueOnce(sub);
            stripeService.cancelSubscription.mockResolvedValue({});
            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.cancelSubscription('comp_1', true);

            expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_stripe_1', { atPeriodEnd: true });
            expect(result.success).toBe(true);
            expect(result.cancelAtPeriodEnd).toBe(true);
        });

        it('should handle immediate cancel (not at period end)', async () => {
            const sub = {
                _id: 'sub_id',
                companyId: 'comp_1',
                status: 'active',
                stripeSubscriptionId: 'sub_stripe_1'
            };
            databaseAdapter.findOne.mockResolvedValueOnce(sub);
            stripeService.cancelSubscription.mockResolvedValue({});
            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.cancelSubscription('comp_1', false);

            expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub_stripe_1', { atPeriodEnd: false });
            expect(result.cancelAtPeriodEnd).toBe(false);
        });

        it('should skip Stripe call when no stripeSubscriptionId', async () => {
            const sub = {
                _id: 'sub_id',
                companyId: 'comp_1',
                status: 'active',
                stripeSubscriptionId: null
            };
            databaseAdapter.findOne.mockResolvedValueOnce(sub);
            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            await BillingService.cancelSubscription('comp_1', true);

            expect(stripeService.cancelSubscription).not.toHaveBeenCalled();
        });
    });

    describe('reactivateSubscription', () => {
        it('should reactivate via Stripe when linked', async () => {
            const sub = {
                _id: 'sub_id',
                companyId: 'comp_1',
                cancelAtPeriodEnd: true,
                stripeSubscriptionId: 'sub_stripe_1'
            };
            databaseAdapter.findOne.mockResolvedValue(sub);
            stripeService.reactivateSubscription.mockResolvedValue({});
            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.reactivateSubscription('comp_1');

            expect(stripeService.reactivateSubscription).toHaveBeenCalledWith('sub_stripe_1');
            expect(result.success).toBe(true);
        });

        it('should throw when no subscription to reactivate', async () => {
            databaseAdapter.findOne.mockResolvedValue(null);

            await expect(
                BillingService.reactivateSubscription('comp_1')
            ).rejects.toThrow('No subscription to reactivate');
        });
    });

    describe('handleWebhookEvent', () => {
        beforeEach(() => {
            WebhookEvent.isProcessed.mockResolvedValue(false);
            WebhookEvent.recordEvent.mockResolvedValue({});
            WebhookEvent.markProcessed.mockResolvedValue({});
            WebhookEvent.markFailed.mockResolvedValue({});
        });

        it('should skip already processed events (idempotency)', async () => {
            WebhookEvent.isProcessed.mockResolvedValue(true);

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_123',
                type: 'checkout.session.completed',
                data: { object: {} }
            });

            expect(result.status).toBe('already_processed');
            expect(WebhookEvent.recordEvent).not.toHaveBeenCalled();
        });

        it('should process checkout.session.completed', async () => {
            const session = {
                metadata: { companyId: 'comp_1' },
                subscription: 'sub_stripe_1'
            };

            const stripeSub = {
                id: 'sub_stripe_1',
                status: 'active',
                customer: 'cus_1',
                items: { data: [{ price: { id: 'price_pro' } }] },
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 2592000
            };

            stripeService.getSubscription.mockResolvedValue(stripeSub);
            databaseAdapter.findOne.mockResolvedValue(null);
            databaseAdapter.create.mockResolvedValue({});

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_checkout',
                type: 'checkout.session.completed',
                data: { object: session }
            });

            expect(WebhookEvent.recordEvent).toHaveBeenCalledWith('evt_checkout', 'checkout.session.completed');
            expect(WebhookEvent.markProcessed).toHaveBeenCalledWith('evt_checkout');
            expect(result.status).toBe('processed');
        });

        it('should process customer.subscription.updated', async () => {
            const stripeSub = {
                id: 'sub_stripe_1',
                status: 'active',
                customer: 'cus_1',
                items: { data: [{ price: { id: 'price_pro' } }] },
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 2592000
            };

            databaseAdapter.findOne
                .mockResolvedValueOnce({ companyId: 'comp_1', stripeCustomerId: 'cus_1' }) // customer mapping
                .mockResolvedValueOnce(null)  // plan by stripePriceId
                .mockResolvedValueOnce({ _id: 'sub_id', stripeSubscriptionId: 'sub_stripe_1' }); // existing sub

            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_sub_updated',
                type: 'customer.subscription.updated',
                data: { object: stripeSub }
            });

            expect(result.status).toBe('processed');
        });

        it('should process customer.subscription.deleted', async () => {
            databaseAdapter.findOne.mockResolvedValue({
                _id: 'sub_id',
                stripeSubscriptionId: 'sub_stripe_1'
            });
            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_sub_deleted',
                type: 'customer.subscription.deleted',
                data: { object: { id: 'sub_stripe_1', customer: 'cus_1' } }
            });

            expect(result.status).toBe('processed');
            expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
                'Subscription', 'sub_id',
                expect.objectContaining({ status: 'canceled' })
            );
        });

        it('should process invoice.paid', async () => {
            databaseAdapter.findOne
                .mockResolvedValueOnce({ companyId: 'comp_1', stripeCustomerId: 'cus_1' }) // customer mapping
                .mockResolvedValueOnce(null); // no existing invoice
            databaseAdapter.count.mockResolvedValue(5);
            databaseAdapter.create.mockResolvedValue({});

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_inv_paid',
                type: 'invoice.paid',
                data: {
                    object: {
                        id: 'in_123',
                        customer: 'cus_1',
                        amount_paid: 14900,
                        subtotal: 14900,
                        total: 14900,
                        currency: 'usd',
                        hosted_invoice_url: 'https://invoice.stripe.com/in_123'
                    }
                }
            });

            expect(result.status).toBe('processed');
            expect(databaseAdapter.create).toHaveBeenCalledWith('Invoice', expect.objectContaining({
                companyId: 'comp_1',
                stripeInvoiceId: 'in_123',
                status: 'paid',
                total: 149
            }));
        });

        it('should process invoice.payment_failed', async () => {
            databaseAdapter.findOne
                .mockResolvedValueOnce({ companyId: 'comp_1', stripeCustomerId: 'cus_1' }) // customer mapping
                .mockResolvedValueOnce({ _id: 'sub_id', companyId: 'comp_1', status: 'active' }); // subscription

            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_inv_failed',
                type: 'invoice.payment_failed',
                data: {
                    object: { customer: 'cus_1' }
                }
            });

            expect(result.status).toBe('processed');
            expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
                'Subscription', 'sub_id',
                { status: 'past_due' }
            );
        });

        it('should mark event as failed on error', async () => {
            databaseAdapter.findOne.mockRejectedValue(new Error('DB error'));

            await expect(
                BillingService.handleWebhookEvent({
                    id: 'evt_fail',
                    type: 'customer.subscription.deleted',
                    data: { object: { id: 'sub_1' } }
                })
            ).rejects.toThrow('DB error');

            expect(WebhookEvent.markFailed).toHaveBeenCalledWith('evt_fail', 'DB error');
        });

        it('should log unhandled event types without error', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = await BillingService.handleWebhookEvent({
                id: 'evt_unknown',
                type: 'some.unknown.event',
                data: { object: {} }
            });

            expect(result.status).toBe('processed');
            expect(WebhookEvent.markProcessed).toHaveBeenCalledWith('evt_unknown');
            consoleSpy.mockRestore();
        });
    });

    describe('createCheckoutSession', () => {
        it('should create checkout session with Stripe customer', async () => {
            databaseAdapter.findOne.mockResolvedValue({
                companyId: 'comp_1',
                stripeCustomerId: 'cus_1'
            });

            stripeService.createCheckoutSession.mockResolvedValue({
                id: 'cs_123',
                url: 'https://checkout.stripe.com/test'
            });

            const result = await BillingService.createCheckoutSession(
                'comp_1', 'price_pro',
                'http://localhost/success', 'http://localhost/cancel',
                { email: 'test@test.com', name: 'Test', userId: 'user_1' }
            );

            expect(result.sessionId).toBe('cs_123');
            expect(result.url).toBe('https://checkout.stripe.com/test');
            expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
                customerId: 'cus_1',
                priceId: 'price_pro'
            }));
        });
    });

    describe('verifyCheckoutSession', () => {
        it('should verify paid session and sync subscription', async () => {
            stripeService.retrieveCheckoutSession.mockResolvedValue({
                payment_status: 'paid',
                metadata: { companyId: 'comp_1' },
                subscription: 'sub_stripe_1'
            });

            const stripeSub = {
                id: 'sub_stripe_1',
                status: 'active',
                customer: 'cus_1',
                items: { data: [{ price: { id: 'price_pro' } }] },
                current_period_start: Math.floor(Date.now() / 1000),
                current_period_end: Math.floor(Date.now() / 1000) + 2592000
            };
            stripeService.getSubscription.mockResolvedValue(stripeSub);
            databaseAdapter.findOne.mockResolvedValue(null);
            databaseAdapter.create.mockResolvedValue({});

            const result = await BillingService.verifyCheckoutSession('cs_123');

            expect(result.success).toBe(true);
            expect(result.companyId).toBe('comp_1');
        });

        it('should throw for unpaid session', async () => {
            stripeService.retrieveCheckoutSession.mockResolvedValue({
                payment_status: 'unpaid',
                metadata: { companyId: 'comp_1' }
            });

            await expect(
                BillingService.verifyCheckoutSession('cs_123')
            ).rejects.toThrow('Payment not completed');
        });
    });

    describe('setDefaultPaymentMethod', () => {
        it('should update Stripe and local records', async () => {
            const method = {
                _id: 'pm_db_id',
                methodId: 'pm_123',
                customerId: 'comp_1',
                stripePaymentMethodId: 'pm_stripe_1',
                isDefault: false
            };

            databaseAdapter.findOne
                .mockResolvedValueOnce(method) // find payment method
                .mockResolvedValueOnce({ companyId: 'comp_1', stripeCustomerId: 'cus_1' }); // find stripe customer

            stripeService.setDefaultPaymentMethod.mockResolvedValue({});
            databaseAdapter.find.mockResolvedValue([
                { _id: 'pm_other', methodId: 'pm_old', isDefault: true }
            ]);
            databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

            const result = await BillingService.setDefaultPaymentMethod('comp_1', 'pm_123');

            expect(stripeService.setDefaultPaymentMethod).toHaveBeenCalledWith('cus_1', 'pm_stripe_1');
            expect(result.success).toBe(true);
        });
    });
});
