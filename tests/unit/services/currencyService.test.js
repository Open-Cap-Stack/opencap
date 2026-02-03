/**
 * Currency Service Test Suite
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Comprehensive test coverage for currency features including:
 * - Multi-currency support
 * - Exchange rate management
 * - Currency conversion
 */

const currencyService = require('../../../services/currencyService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock database adapter
jest.mock('../../../services/databaseAdapter');

describe('Currency Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock for initialized state
    databaseAdapter.initialized = true;
    databaseAdapter._checkInitialized = jest.fn();

    // Reset the in-memory rates cache
    currencyService._resetRatesCache();
  });

  describe('convertCurrency', () => {
    it('should convert amount from one currency to another', async () => {
      const amount = 100;
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73,
          JPY: 110.5
        },
        updatedAt: new Date()
      });

      const result = await currencyService.convertCurrency(amount, fromCurrency, toCurrency);

      expect(result).toBeDefined();
      expect(result.originalAmount).toBe(100);
      expect(result.convertedAmount).toBeCloseTo(85, 1);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.exchangeRate).toBeCloseTo(0.85, 2);
    });

    it('should handle inverse conversion', async () => {
      const amount = 85;
      const fromCurrency = 'EUR';
      const toCurrency = 'USD';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73,
          JPY: 110.5
        },
        updatedAt: new Date()
      });

      const result = await currencyService.convertCurrency(amount, fromCurrency, toCurrency);

      expect(result.convertedAmount).toBeCloseTo(100, 0);
    });

    it('should handle cross-currency conversion', async () => {
      const amount = 100;
      const fromCurrency = 'EUR';
      const toCurrency = 'GBP';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73,
          JPY: 110.5
        },
        updatedAt: new Date()
      });

      const result = await currencyService.convertCurrency(amount, fromCurrency, toCurrency);

      expect(result).toBeDefined();
      expect(result.convertedAmount).toBeDefined();
      // EUR -> USD -> GBP: 100 / 0.85 * 0.73 = ~85.88
      expect(result.convertedAmount).toBeCloseTo(85.88, 0);
    });

    it('should return same amount for same currency', async () => {
      const amount = 100;
      const currency = 'USD';

      const result = await currencyService.convertCurrency(amount, currency, currency);

      expect(result.convertedAmount).toBe(100);
      expect(result.exchangeRate).toBe(1);
    });

    it('should throw error for unsupported currency', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85
        },
        updatedAt: new Date()
      });

      await expect(currencyService.convertCurrency(100, 'USD', 'XYZ'))
        .rejects.toThrow('Unsupported currency: XYZ');
    });

    it('should throw error for invalid amount', async () => {
      await expect(currencyService.convertCurrency(-100, 'USD', 'EUR'))
        .rejects.toThrow('Amount must be a positive number');

      await expect(currencyService.convertCurrency('abc', 'USD', 'EUR'))
        .rejects.toThrow('Amount must be a positive number');
    });

    it('should throw error for missing currencies', async () => {
      await expect(currencyService.convertCurrency(100, null, 'EUR'))
        .rejects.toThrow('From currency is required');

      await expect(currencyService.convertCurrency(100, 'USD', null))
        .rejects.toThrow('To currency is required');
    });

    it('should apply precision option', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85123
        },
        updatedAt: new Date()
      });

      const result = await currencyService.convertCurrency(100, 'USD', 'EUR', { precision: 4 });

      expect(result.convertedAmount).toBeCloseTo(85.123, 4);
    });
  });

  describe('getExchangeRate', () => {
    it('should get current exchange rate between two currencies', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73
        },
        updatedAt: new Date()
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency);

      expect(result).toBeDefined();
      expect(result.rate).toBeCloseTo(0.85, 2);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.timestamp).toBeDefined();
    });

    it('should return 1 for same currency', async () => {
      const result = await currencyService.getExchangeRate('USD', 'USD');

      expect(result.rate).toBe(1);
    });

    it('should get historical exchange rate', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      const date = new Date('2023-06-15');

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.92
        },
        date: new Date('2023-06-15'),
        updatedAt: new Date('2023-06-15')
      });

      const result = await currencyService.getExchangeRate(fromCurrency, toCurrency, { date });

      expect(result.rate).toBeCloseTo(0.92, 2);
      expect(result.historical).toBe(true);
    });

    it('should throw error for unsupported currency', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85
        },
        updatedAt: new Date()
      });

      await expect(currencyService.getExchangeRate('USD', 'INVALID'))
        .rejects.toThrow('Unsupported currency: INVALID');
    });
  });

  describe('updateRates', () => {
    it('should update exchange rates from external source', async () => {
      // Mock external API response
      currencyService._fetchExternalRates = jest.fn().mockResolvedValue({
        base: 'USD',
        rates: {
          EUR: 0.86,
          GBP: 0.74,
          JPY: 112.5,
          CAD: 1.25
        },
        timestamp: Date.now()
      });

      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);
      databaseAdapter.create = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.86,
          GBP: 0.74,
          JPY: 112.5,
          CAD: 1.25
        },
        updatedAt: new Date()
      });

      const result = await currencyService.updateRates();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.ratesUpdated).toBeGreaterThan(0);
      expect(result.baseCurrency).toBe('USD');
    });

    it('should update existing rates', async () => {
      currencyService._fetchExternalRates = jest.fn().mockResolvedValue({
        base: 'USD',
        rates: {
          EUR: 0.87,
          GBP: 0.75
        },
        timestamp: Date.now()
      });

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        _id: 'rate123',
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73
        }
      });

      databaseAdapter.findByIdAndUpdate = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.87,
          GBP: 0.75
        },
        updatedAt: new Date()
      });

      const result = await currencyService.updateRates();

      expect(result.success).toBe(true);
    });

    it('should handle external API errors gracefully', async () => {
      currencyService._fetchExternalRates = jest.fn().mockRejectedValue(
        new Error('External API unavailable')
      );

      await expect(currencyService.updateRates())
        .rejects.toThrow('Failed to update exchange rates');
    });

    it('should update specific base currency', async () => {
      currencyService._fetchExternalRates = jest.fn().mockResolvedValue({
        base: 'EUR',
        rates: {
          USD: 1.18,
          GBP: 0.86
        },
        timestamp: Date.now()
      });

      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);
      databaseAdapter.create = jest.fn().mockResolvedValue({
        baseCurrency: 'EUR',
        rates: {
          USD: 1.18,
          GBP: 0.86
        }
      });

      const result = await currencyService.updateRates({ baseCurrency: 'EUR' });

      expect(result.baseCurrency).toBe('EUR');
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return list of supported currencies', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73,
          JPY: 110.5,
          CAD: 1.25,
          AUD: 1.35
        }
      });

      const result = await currencyService.getSupportedCurrencies();

      expect(result).toBeDefined();
      expect(result.currencies).toContain('USD');
      expect(result.currencies).toContain('EUR');
      expect(result.currencies).toContain('GBP');
      expect(result.baseCurrency).toBe('USD');
    });

    it('should return currency details with names', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73
        }
      });

      const result = await currencyService.getSupportedCurrencies({ includeDetails: true });

      expect(result.currencyDetails).toBeDefined();
      expect(result.currencyDetails.USD).toBeDefined();
      expect(result.currencyDetails.USD.name).toBe('US Dollar');
      expect(result.currencyDetails.USD.symbol).toBe('$');
    });
  });

  describe('formatCurrency', () => {
    it('should format amount with currency symbol', () => {
      const result = currencyService.formatCurrency(1234.56, 'USD');

      expect(result).toBe('$1,234.56');
    });

    it('should format with different locales', () => {
      const result = currencyService.formatCurrency(1234.56, 'EUR', { locale: 'de-DE' });

      expect(result).toContain('1.234,56');
    });

    it('should handle large numbers', () => {
      const result = currencyService.formatCurrency(1000000, 'USD');

      expect(result).toBe('$1,000,000.00');
    });

    it('should handle zero', () => {
      const result = currencyService.formatCurrency(0, 'USD');

      expect(result).toBe('$0.00');
    });

    it('should use default locale for unknown currency', () => {
      const result = currencyService.formatCurrency(1234.56, 'XYZ');

      expect(result).toBeDefined();
    });
  });

  describe('getRateHistory', () => {
    it('should get exchange rate history for a currency pair', async () => {
      const fromCurrency = 'USD';
      const toCurrency = 'EUR';
      const options = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      };

      databaseAdapter.find = jest.fn().mockResolvedValue([
        { date: new Date('2023-01-01'), baseCurrency: 'USD', rates: { EUR: 0.93 } },
        { date: new Date('2023-04-01'), baseCurrency: 'USD', rates: { EUR: 0.91 } },
        { date: new Date('2023-07-01'), baseCurrency: 'USD', rates: { EUR: 0.89 } },
        { date: new Date('2023-10-01'), baseCurrency: 'USD', rates: { EUR: 0.86 } }
      ]);

      const result = await currencyService.getRateHistory(fromCurrency, toCurrency, options);

      expect(result).toBeDefined();
      expect(result.history).toHaveLength(4);
      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
    });

    it('should calculate rate statistics', async () => {
      databaseAdapter.find = jest.fn().mockResolvedValue([
        { date: new Date('2023-01-01'), baseCurrency: 'USD', rates: { EUR: 0.93 } },
        { date: new Date('2023-04-01'), baseCurrency: 'USD', rates: { EUR: 0.91 } },
        { date: new Date('2023-07-01'), baseCurrency: 'USD', rates: { EUR: 0.89 } },
        { date: new Date('2023-10-01'), baseCurrency: 'USD', rates: { EUR: 0.86 } }
      ]);

      const result = await currencyService.getRateHistory('USD', 'EUR');

      expect(result.statistics).toBeDefined();
      expect(result.statistics.min).toBeCloseTo(0.86, 2);
      expect(result.statistics.max).toBeCloseTo(0.93, 2);
      expect(result.statistics.average).toBeDefined();
    });
  });

  describe('batchConvert', () => {
    it('should convert multiple amounts to a single currency', async () => {
      const conversions = [
        { amount: 100, currency: 'USD' },
        { amount: 50, currency: 'EUR' },
        { amount: 75, currency: 'GBP' }
      ];
      const targetCurrency = 'USD';

      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85,
          GBP: 0.73
        }
      });

      const result = await currencyService.batchConvert(conversions, targetCurrency);

      expect(result).toBeDefined();
      expect(result.conversions).toHaveLength(3);
      expect(result.total).toBeDefined();
      expect(result.targetCurrency).toBe('USD');
    });

    it('should handle empty conversions array', async () => {
      const result = await currencyService.batchConvert([], 'USD');

      expect(result.conversions).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('Caching', () => {
    it('should cache exchange rates to reduce database calls', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85
        },
        updatedAt: new Date()
      });

      // First call
      await currencyService.convertCurrency(100, 'USD', 'EUR');

      // Second call should use cache
      await currencyService.convertCurrency(200, 'USD', 'EUR');

      // Database should only be called once
      expect(databaseAdapter.findOne).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue({
        baseCurrency: 'USD',
        rates: {
          EUR: 0.85
        },
        updatedAt: new Date()
      });

      // First call
      await currencyService.convertCurrency(100, 'USD', 'EUR');

      // Simulate cache expiration
      currencyService._expireCache();

      // Second call after expiration
      await currencyService.convertCurrency(200, 'USD', 'EUR');

      // Database should be called twice
      expect(databaseAdapter.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      databaseAdapter.findOne = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(currencyService.getExchangeRate('USD', 'EUR'))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle missing rate data', async () => {
      databaseAdapter.findOne = jest.fn().mockResolvedValue(null);

      await expect(currencyService.getExchangeRate('USD', 'EUR'))
        .rejects.toThrow('Exchange rate data not available');
    });
  });
});
