/**
 * Invoice Model Tests
 * Issue #201: Enhance Billing Dashboard APIs
 *
 * Test suite for Invoice model including:
 * - Schema validation
 * - Status transitions
 * - Methods and virtuals
 */

const mongoose = require('mongoose');
const Invoice = require('../../../models/Invoice');

describe('Invoice Model', () => {
  describe('Schema Validation', () => {
    it('should require invoiceId', async () => {
      const invoice = new Invoice({
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      let error;
      try {
        await invoice.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.invoiceId).toBeDefined();
    });

    it('should require companyId', async () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        invoiceNumber: '202601-0001',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      let error;
      try {
        await invoice.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.companyId).toBeDefined();
    });

    it('should require invoiceNumber', async () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      let error;
      try {
        await invoice.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.invoiceNumber).toBeDefined();
    });

    it('should validate currency', async () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        currency: 'INVALID',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      let error;
      try {
        await invoice.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.currency).toBeDefined();
    });

    it('should accept valid currency codes', async () => {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

      for (const currency of validCurrencies) {
        const invoice = new Invoice({
          invoiceId: `INV-${currency}`,
          companyId: 'company-123',
          invoiceNumber: '202601-0001',
          currency,
          subtotal: 99,
          total: 99,
          amount: 99
        });

        let error;
        try {
          await invoice.validate();
        } catch (e) {
          error = e;
        }

        expect(error?.errors?.currency).toBeUndefined();
      }
    });

    it('should validate status enum', async () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'invalid_status',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      let error;
      try {
        await invoice.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    it('should accept valid statuses', () => {
      const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'void', 'refunded'];

      for (const status of validStatuses) {
        const invoice = new Invoice({
          invoiceId: `INV-${status}`,
          companyId: 'company-123',
          invoiceNumber: '202601-0001',
          status,
          subtotal: 99,
          total: 99,
          amount: 99
        });

        expect(invoice.status).toBe(status);
      }
    });

    it('should default status to draft', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.status).toBe('draft');
    });

    it('should default currency to USD', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.currency).toBe('USD');
    });
  });

  describe('Line Items', () => {
    it('should accept line items', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        lineItems: [
          { description: 'Professional Plan', quantity: 1, unitPrice: 99, amount: 99 },
          { description: 'Add-on Feature', quantity: 2, unitPrice: 10, amount: 20 }
        ],
        subtotal: 119,
        total: 119,
        amount: 119
      });

      expect(invoice.lineItems).toHaveLength(2);
      expect(invoice.lineItems[0].description).toBe('Professional Plan');
      expect(invoice.lineItems[1].amount).toBe(20);
    });

    it('should require description for line items', async () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        lineItems: [
          { quantity: 1, unitPrice: 99, amount: 99 }
        ],
        subtotal: 99,
        total: 99,
        amount: 99
      });

      let error;
      try {
        await invoice.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
    });
  });

  describe('Billing Details', () => {
    it('should accept billing details', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        billingDetails: {
          name: 'John Doe',
          email: 'john@example.com',
          company: 'Test Corp',
          address: {
            line1: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94102',
            country: 'USA'
          }
        },
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.billingDetails.name).toBe('John Doe');
      expect(invoice.billingDetails.address.city).toBe('San Francisco');
    });
  });

  describe('Methods', () => {
    it('should mark invoice as paid', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'sent',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      invoice.markAsPaid('PAY-12345678', 'card');

      expect(invoice.status).toBe('paid');
      expect(invoice.amountPaid).toBe(99);
      expect(invoice.amountDue).toBe(0);
      expect(invoice.paymentId).toBe('PAY-12345678');
      expect(invoice.paymentMethod).toBe('card');
      expect(invoice.paidAt).toBeDefined();
    });

    it('should void an invoice', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'draft',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      invoice.voidInvoice('Customer requested cancellation');

      expect(invoice.status).toBe('void');
      expect(invoice.metadata.voidReason).toBe('Customer requested cancellation');
      expect(invoice.metadata.voidedAt).toBeDefined();
    });

    it('should not void a paid invoice', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'paid',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(() => invoice.voidInvoice()).toThrow('Cannot void a paid invoice');
    });

    it('should format amount with currency symbol', () => {
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        currency: 'USD',
        subtotal: 1234.56,
        total: 1234.56,
        amount: 1234.56
      });

      const formatted = invoice.getFormattedAmount();
      expect(formatted).toContain('$');
      expect(formatted).toContain('1,234.56');
    });
  });

  describe('Virtuals', () => {
    it('should calculate isOverdue', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'sent',
        dueDate: pastDate,
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.isOverdue).toBe(true);
    });

    it('should not be overdue if paid', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'paid',
        dueDate: pastDate,
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.isOverdue).toBe(false);
    });

    it('should calculate daysUntilDue', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'sent',
        dueDate: futureDate,
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.daysUntilDue).toBe(10);
    });

    it('should return negative days if overdue', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        status: 'sent',
        dueDate: pastDate,
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.daysUntilDue).toBeLessThan(0);
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
      const invoice = new Invoice({
        invoiceId: 'INV-12345678',
        companyId: 'company-123',
        invoiceNumber: '202601-0001',
        subtotal: 99,
        total: 99,
        amount: 99
      });

      expect(invoice.schema.options.timestamps).toBe(true);
    });
  });
});
