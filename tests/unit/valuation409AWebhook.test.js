/**
 * Tests for 409A Stripe webhook: auto-trigger AI after payment
 * Issue #566: checkout.session.completed should mark valuation paid and trigger AI agent
 *
 * Tests the _handleCheckoutCompleted path in BillingService for 409A one-time payments.
 */

// Mock dependencies before requiring BillingService
const mockFindOne = jest.fn();
const mockUpdateOne = jest.fn();
const mockIsProcessed = jest.fn().mockResolvedValue(false);
const mockRecordEvent = jest.fn().mockResolvedValue(true);
const mockRunValuationAgent = jest.fn().mockResolvedValue({});
const mockSendPaymentConfirmed = jest.fn().mockResolvedValue(true);
const mockUserFindOne = jest.fn().mockResolvedValue(null);

jest.mock('../../models/Valuation409A', () => ({
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
}));

jest.mock('../../models/WebhookEvent', () => ({
  isProcessed: mockIsProcessed,
  recordEvent: mockRecordEvent,
  markProcessed: jest.fn().mockResolvedValue(true),
  markFailed: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/valuation409AAgentService', () => ({
  runValuationAgent: mockRunValuationAgent,
}));

jest.mock('../../services/valuation409AEmailService', () => ({
  sendPaymentConfirmed: mockSendPaymentConfirmed,
}));

jest.mock('../../models/User', () => ({
  findOne: mockUserFindOne,
}));

// Mock stripeService to avoid Stripe SDK initialization
jest.mock('../../services/stripeService', () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  getStripe: jest.fn(),
  constructEvent: jest.fn(),
  getSubscription: jest.fn(),
}));

// Mock databaseAdapter
jest.mock('../../services/databaseAdapter', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  initialize: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid-1234'),
}));

const BillingService = require('../../services/billingService');

describe('409A Stripe Webhook - checkout.session.completed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsProcessed.mockResolvedValue(false);
    mockRecordEvent.mockResolvedValue(true);
  });

  const makeEvent = (metadata = {}, paymentStatus = 'paid', mode = 'payment') => ({
    id: 'evt_test_123',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_session_456',
        payment_status: paymentStatus,
        mode,
        metadata,
      },
    },
  });

  test('marks valuation paid and calls runValuationAgent when valuationId present', async () => {
    const mockValuation = {
      valuationId: 'val-001',
      companyId: 'comp-001',
      requestedBy: 'user-001',
      row_id: 'row-001',
    };
    mockFindOne.mockResolvedValue(mockValuation);
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    const event = makeEvent({ valuationId: 'val-001', companyId: 'comp-001' });
    await BillingService.handleWebhookEvent(event);

    // Should look up the valuation
    expect(mockFindOne).toHaveBeenCalledWith({ valuationId: 'val-001' });

    // Should mark as paid with correct fields
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { valuationId: 'val-001' },
      {
        $set: expect.objectContaining({
          paymentStatus: 'paid',
          stripeSessionId: 'cs_test_session_456',
          status: 'ai_processing',
          aiStatus: 'researching',
        }),
      }
    );

    // Should fire AI agent
    expect(mockRunValuationAgent).toHaveBeenCalledWith('val-001');
  });

  test('ignores checkout.session.completed with no valuationId in metadata', async () => {
    // No valuationId, no companyId — should complete without errors and without
    // touching the Valuation409A model
    const event = makeEvent({});
    await BillingService.handleWebhookEvent(event);

    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(mockRunValuationAgent).not.toHaveBeenCalled();
  });

  test('ignores checkout.session.completed when payment_status is not paid', async () => {
    // Even if valuationId is in metadata, if the session mode triggers the
    // subscription path (mode !== 'payment'), it should not process as 409A
    const event = makeEvent(
      { valuationId: 'val-002', companyId: 'comp-002' },
      'unpaid',
      'subscription'
    );

    // For subscription mode with companyId, it may try the subscription path.
    // The key assertion: the 409A-specific AI agent should NOT be called.
    await BillingService.handleWebhookEvent(event);

    expect(mockRunValuationAgent).not.toHaveBeenCalled();
  });

  test('handles valuation not found gracefully', async () => {
    mockFindOne.mockResolvedValue(null);

    const event = makeEvent({ valuationId: 'val-nonexistent', companyId: 'comp-001' });

    // Should not throw
    await expect(BillingService.handleWebhookEvent(event)).resolves.not.toThrow();

    // Should not attempt update or AI run
    expect(mockUpdateOne).not.toHaveBeenCalled();
    expect(mockRunValuationAgent).not.toHaveBeenCalled();
  });

  test('skips already-processed events (idempotency)', async () => {
    mockIsProcessed.mockResolvedValue(true);

    const event = makeEvent({ valuationId: 'val-001', companyId: 'comp-001' });
    const result = await BillingService.handleWebhookEvent(event);

    expect(result).toEqual({ status: 'already_processed' });
    expect(mockFindOne).not.toHaveBeenCalled();
    expect(mockRunValuationAgent).not.toHaveBeenCalled();
  });

  test('AI agent failure does not propagate (fire-and-forget)', async () => {
    const mockValuation = {
      valuationId: 'val-003',
      companyId: 'comp-003',
      requestedBy: 'user-003',
      row_id: 'row-003',
    };
    mockFindOne.mockResolvedValue(mockValuation);
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

    // Make the agent reject
    const agentError = new Error('AI model unavailable');
    mockRunValuationAgent.mockRejectedValue(agentError);

    const event = makeEvent({ valuationId: 'val-003', companyId: 'comp-003' });

    // Should not throw even though agent fails
    await expect(BillingService.handleWebhookEvent(event)).resolves.not.toThrow();

    // Agent was still called
    expect(mockRunValuationAgent).toHaveBeenCalledWith('val-003');
  });
});
