/**
 * Invoice Model Tests
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Test suite for Invoice model including:
 * - Schema validation
 * - Status transitions
 * - Methods and computed properties
 * Adapted for ZeroDB model interface
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const Invoice = require('../../../models/Invoice');
const zerodbService = require('../../../services/zerodbService');

describe('Invoice Model', () => {
  // In-memory store for mocking ZeroDB
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        if (typeof value === 'object' && value !== null && value.$in) {
          results = results.filter(doc => value.$in.includes(doc[key]));
        } else {
          results = results.filter(doc => doc[key] === value);
        }
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });
  });

  describe('Schema Validation', () => {
    it('should require invoiceId', () => {
      expect(Invoice.schema.invoiceId.required).toBe(true);
    });

    it('should require companyId', () => {
      expect(Invoice.schema.companyId.required).toBe(true);
    });

    it('should require invoiceNumber', () => {
      expect(Invoice.schema.invoiceNumber.required).toBe(true);
    });

    it('should have currency field with default USD', () => {
      expect(Invoice.schema.currency.default).toBe('USD');
    });

    it('should accept valid currency codes', () => {
      const validCurrencies = Invoice.VALID_CURRENCY_CODES;
      expect(validCurrencies).toContain('USD');
      expect(validCurrencies).toContain('EUR');
      expect(validCurrencies).toContain('GBP');
      expect(validCurrencies).toContain('CAD');
      expect(validCurrencies).toContain('AUD');
      expect(validCurrencies).toContain('JPY');
      expect(validCurrencies).toContain('CNY');
      expect(validCurrencies).toContain('INR');
      expect(validCurrencies).toContain('CHF');
      expect(validCurrencies).toContain('BRL');
    });

    it('should validate status enum values in schema', () => {
      const validStatuses = Invoice.schema.status.enum;
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('sent');
      expect(validStatuses).toContain('paid');
      expect(validStatuses).toContain('overdue');
      expect(validStatuses).toContain('void');
      expect(validStatuses).toContain('refunded');
      expect(validStatuses).not.toContain('invalid_status');
    });

    it('should accept valid statuses', () => {
      const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'void', 'refunded'];
      for (const status of validStatuses) {
        expect(Invoice.VALID_STATUSES).toContain(status);
      }
    });

    it('should default status to draft', () => {
      expect(Invoice.schema.status.default).toBe('draft');
    });

    it('should default currency to USD', () => {
      expect(Invoice.schema.currency.default).toBe('USD');
    });
  });

  describe('Line Items', () => {
    it('should have lineItems field as array type', () => {
      expect(Invoice.schema.lineItems.type).toBe('array');
    });

    it('should default to empty lineItems array', () => {
      expect(Invoice.schema.lineItems.default).toEqual([]);
    });
  });

  describe('Billing Details', () => {
    it('should have billingDetails as object type', () => {
      expect(Invoice.schema.billingDetails.type).toBe('object');
    });

    it('should have default billing details with address structure', () => {
      const defaultBilling = Invoice.schema.billingDetails.default;
      expect(defaultBilling).toHaveProperty('name');
      expect(defaultBilling).toHaveProperty('email');
      expect(defaultBilling).toHaveProperty('company');
      expect(defaultBilling).toHaveProperty('address');
      expect(defaultBilling.address).toHaveProperty('city');
      expect(defaultBilling.address).toHaveProperty('state');
      expect(defaultBilling.address).toHaveProperty('postalCode');
      expect(defaultBilling.address).toHaveProperty('country');
    });
  });

  describe('Methods', () => {
    it('should mark invoice as paid via markAsPaid', async () => {
      // Create an invoice
      const invoice = await Invoice.create({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'sent',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      await Invoice.markAsPaid('INV-12345678', 'PAY-12345678', 'card');

      // Verify the store was updated
      const updatedDoc = store.find(doc => doc.invoiceId === 'INV-12345678');
      expect(updatedDoc.status).toBe('paid');
      expect(updatedDoc.paymentId).toBe('PAY-12345678');
      expect(updatedDoc.paymentMethod).toBe('card');
      expect(updatedDoc.paidAt).toBeDefined();
    });

    it('should void an invoice via voidInvoice', async () => {
      await Invoice.create({
        invoiceId: 'INV-VOID',
        companyId: 'company-123',
        invoiceNumber: '202601-0002',
        status: 'draft',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      await Invoice.voidInvoice('INV-VOID', 'Customer requested cancellation');

      const updatedDoc = store.find(doc => doc.invoiceId === 'INV-VOID');
      expect(updatedDoc.status).toBe('void');
      expect(updatedDoc.metadata.voidReason).toBe('Customer requested cancellation');
      expect(updatedDoc.metadata.voidedAt).toBeDefined();
    });

    it('should not void a paid invoice', async () => {
      await Invoice.create({
        invoiceId: 'INV-PAID',
        companyId: 'company-123',
        invoiceNumber: '202601-0003',
        status: 'paid',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      await expect(Invoice.voidInvoice('INV-PAID')).rejects.toThrow('Cannot void a paid invoice');
    });

    it('should format amount with currency symbol', () => {
      const invoiceDoc = {
        currency: 'USD',
        total: 1234.56,
        amount: 1234.56
      };

      const formatted = Invoice.getFormattedAmount(invoiceDoc);
      expect(formatted).toContain('$');
      expect(formatted).toContain('1,234.56');
    });
  });

  describe('Computed Properties', () => {
    it('should check isOverdue for past due date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const invoiceDoc = {
        status: 'sent',
        dueDate: pastDate.toISOString()
      };

      expect(Invoice.isOverdue(invoiceDoc)).toBe(true);
    });

    it('should not be overdue if paid', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const invoiceDoc = {
        status: 'paid',
        dueDate: pastDate.toISOString()
      };

      expect(Invoice.isOverdue(invoiceDoc)).toBe(false);
    });

    it('should calculate daysUntilDue', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const invoiceDoc = {
        status: 'sent',
        dueDate: futureDate.toISOString()
      };

      expect(Invoice.getDaysUntilDue(invoiceDoc)).toBe(10);
    });

    it('should return negative days if overdue', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const invoiceDoc = {
        status: 'sent',
        dueDate: pastDate.toISOString()
      };

      expect(Invoice.getDaysUntilDue(invoiceDoc)).toBeLessThan(0);
    });

    it('should return null for daysUntilDue when no due date', () => {
      const invoiceDoc = {
        status: 'sent'
      };
      expect(Invoice.getDaysUntilDue(invoiceDoc)).toBeNull();
    });
  });

  describe('Status Transitions', () => {
    it('should get valid status transitions', () => {
      const transitions = Invoice.getValidStatusTransitions();

      expect(transitions.draft).toEqual(['sent', 'void']);
      expect(transitions.sent).toEqual(['paid', 'overdue', 'void']);
      expect(transitions.overdue).toEqual(['paid', 'void']);
      expect(transitions.paid).toEqual(['refunded']);
      expect(transitions.void).toEqual([]);
      expect(transitions.refunded).toEqual([]);
    });

    it('should validate status transition', () => {
      expect(Invoice.isValidStatusTransition('draft', 'sent')).toBe(true);
      expect(Invoice.isValidStatusTransition('draft', 'void')).toBe(true);
      expect(Invoice.isValidStatusTransition('draft', 'paid')).toBe(false);
      expect(Invoice.isValidStatusTransition('sent', 'paid')).toBe(true);
      expect(Invoice.isValidStatusTransition('paid', 'draft')).toBe(false);
      expect(Invoice.isValidStatusTransition('void', 'paid')).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('should include timestamps in schema', () => {
      expect(Invoice.schema).toHaveProperty('createdAt');
      expect(Invoice.schema).toHaveProperty('updatedAt');
    });
  });
});
