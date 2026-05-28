'use strict';

/**
 * Document Generator Service Tests
 * Issue #666: Document generation engine with RSPA, stock certificate, and 83(b) templates
 */

const {
  generateRSPA,
  generateStockCertificate,
  generate83bElection,
  validateRequired,
  REQUIRED_RSPA_FIELDS,
  REQUIRED_CERT_FIELDS,
  REQUIRED_83B_FIELDS,
} = require('../../../services/documentGeneratorService');

// ── Fixtures ────────────────────────────────────────────────────────────────

const rspaParams = {
  companyName: 'Acme Corp',
  companyState: 'Delaware',
  purchaserName: 'Jane Doe',
  purchaserAddress: '123 Main St, San Francisco, CA 94105',
  shares: 100000,
  pricePerShare: 0.001,
  totalPrice: 100,
  paymentForm: 'Cash',
  vestingSchedule: '4-year vesting with 1-year cliff',
  vestingMonths: 48,
  cliffMonths: 12,
  effectiveDate: '2026-01-15',
  accelerationProvisions: '100% single-trigger acceleration on Change of Control',
};

const certParams = {
  companyName: 'Acme Corp',
  companyState: 'Delaware',
  holderName: 'Jane Doe',
  shares: 100000,
  certificateNumber: '0001',
  date: '2026-01-15',
  officerName: 'John Smith',
  officerTitle: 'CEO',
};

const election83bParams = {
  taxpayerName: 'Jane Doe',
  companyName: 'Acme Corp',
  shares: 100000,
  transferDate: '2026-01-15',
  taxYear: 2026,
  fairMarketValue: 10000,
  amountPaid: 100,
  restrictions: 'Shares are subject to a 4-year vesting schedule with a 1-year cliff.',
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('documentGeneratorService', () => {
  // ------------------------------------------------------------------
  // generateRSPA
  // ------------------------------------------------------------------
  describe('generateRSPA', () => {
    it('should return a valid PDF buffer', async () => {
      const buf = await generateRSPA(rspaParams);
      expect(Buffer.isBuffer(buf)).toBe(true);
      // PDF files start with %PDF
      expect(buf.slice(0, 5).toString()).toMatch(/^%PDF-/);
    });

    it('should produce a non-trivially sized PDF', async () => {
      const buf = await generateRSPA(rspaParams);
      // Even a minimal PDFKit doc is > 1 KB
      expect(buf.length).toBeGreaterThan(1000);
    });

    it('should work without optional vesting/acceleration params', async () => {
      const minimal = {
        companyName: 'Beta Inc',
        companyState: 'California',
        purchaserName: 'Bob Builder',
        purchaserAddress: '456 Elm St',
        shares: 5000,
        pricePerShare: 0.01,
        totalPrice: 50,
        paymentForm: 'Promissory Note',
        effectiveDate: '2026-06-01',
      };
      const buf = await generateRSPA(minimal);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.slice(0, 5).toString()).toMatch(/^%PDF-/);
    });
  });

  // ------------------------------------------------------------------
  // generateStockCertificate
  // ------------------------------------------------------------------
  describe('generateStockCertificate', () => {
    it('should return a valid PDF buffer', async () => {
      const buf = await generateStockCertificate(certParams);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.slice(0, 5).toString()).toMatch(/^%PDF-/);
    });

    it('should produce a non-trivially sized PDF', async () => {
      const buf = await generateStockCertificate(certParams);
      expect(buf.length).toBeGreaterThan(1000);
    });
  });

  // ------------------------------------------------------------------
  // generate83bElection
  // ------------------------------------------------------------------
  describe('generate83bElection', () => {
    it('should return a valid PDF buffer', async () => {
      const buf = await generate83bElection(election83bParams);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.slice(0, 5).toString()).toMatch(/^%PDF-/);
    });

    it('should produce a non-trivially sized PDF', async () => {
      const buf = await generate83bElection(election83bParams);
      expect(buf.length).toBeGreaterThan(1000);
    });

    it('should use default restriction text when none provided', async () => {
      const params = { ...election83bParams };
      delete params.restrictions;
      const buf = await generate83bElection(params);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.slice(0, 5).toString()).toMatch(/^%PDF-/);
    });
  });

  // ------------------------------------------------------------------
  // validateRequired
  // ------------------------------------------------------------------
  describe('validateRequired', () => {
    it('should return empty array when all required fields are present', () => {
      const missing = validateRequired(REQUIRED_RSPA_FIELDS, rspaParams);
      expect(missing).toEqual([]);
    });

    it('should return missing field names for RSPA', () => {
      const missing = validateRequired(REQUIRED_RSPA_FIELDS, { companyName: 'X' });
      expect(missing).toContain('companyState');
      expect(missing).toContain('purchaserName');
      expect(missing).toContain('shares');
    });

    it('should return missing field names for stock certificate', () => {
      const missing = validateRequired(REQUIRED_CERT_FIELDS, {});
      expect(missing.length).toBe(REQUIRED_CERT_FIELDS.length);
    });

    it('should return missing field names for 83(b) election', () => {
      const missing = validateRequired(REQUIRED_83B_FIELDS, { taxpayerName: 'X', companyName: 'Y' });
      expect(missing).toContain('shares');
      expect(missing).toContain('transferDate');
      expect(missing).not.toContain('taxpayerName');
    });

    it('should treat empty string as missing', () => {
      const missing = validateRequired(['companyName'], { companyName: '' });
      expect(missing).toContain('companyName');
    });

    it('should treat null as missing', () => {
      const missing = validateRequired(['shares'], { shares: null });
      expect(missing).toContain('shares');
    });
  });

  // ------------------------------------------------------------------
  // Required field constants
  // ------------------------------------------------------------------
  describe('required field constants', () => {
    it('REQUIRED_RSPA_FIELDS should include key fields', () => {
      expect(REQUIRED_RSPA_FIELDS).toContain('companyName');
      expect(REQUIRED_RSPA_FIELDS).toContain('shares');
      expect(REQUIRED_RSPA_FIELDS).toContain('effectiveDate');
    });

    it('REQUIRED_CERT_FIELDS should include key fields', () => {
      expect(REQUIRED_CERT_FIELDS).toContain('holderName');
      expect(REQUIRED_CERT_FIELDS).toContain('certificateNumber');
    });

    it('REQUIRED_83B_FIELDS should include key fields', () => {
      expect(REQUIRED_83B_FIELDS).toContain('taxpayerName');
      expect(REQUIRED_83B_FIELDS).toContain('fairMarketValue');
    });
  });
});
