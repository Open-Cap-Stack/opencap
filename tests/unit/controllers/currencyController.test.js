/**
 * Currency Controller Test Suite
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Tests for currency controller endpoints
 */

const currencyController = require('../../../controllers/currencyController');
const currencyService = require('../../../services/currencyService');

// Mock the service
jest.mock('../../../services/currencyService');

describe('Currency Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('convertCurrency', () => {
    it('should convert currency successfully', async () => {
      mockReq.body = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      const expectedResult = {
        originalAmount: 100,
        convertedAmount: 85,
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        exchangeRate: 0.85
      };

      currencyService.convertCurrency.mockResolvedValue(expectedResult);

      await currencyController.convertCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing amount', async () => {
      mockReq.body = {
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      await currencyController.convertCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Amount is required' });
    });

    it('should return 400 for missing from currency', async () => {
      mockReq.body = {
        amount: 100,
        toCurrency: 'EUR'
      };

      await currencyController.convertCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'From currency is required' });
    });

    it('should return 400 for missing to currency', async () => {
      mockReq.body = {
        amount: 100,
        fromCurrency: 'USD'
      };

      await currencyController.convertCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'To currency is required' });
    });

    it('should return 400 for unsupported currency', async () => {
      mockReq.body = {
        amount: 100,
        fromCurrency: 'USD',
        toCurrency: 'XYZ'
      };

      currencyService.convertCurrency.mockRejectedValue(
        new Error('Unsupported currency: XYZ')
      );

      await currencyController.convertCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid amount', async () => {
      mockReq.body = {
        amount: -100,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      currencyService.convertCurrency.mockRejectedValue(
        new Error('Amount must be a positive number')
      );

      await currencyController.convertCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getExchangeRate', () => {
    it('should get exchange rate successfully', async () => {
      mockReq.query = {
        from: 'USD',
        to: 'EUR'
      };

      const expectedResult = {
        rate: 0.85,
        fromCurrency: 'USD',
        toCurrency: 'EUR'
      };

      currencyService.getExchangeRate.mockResolvedValue(expectedResult);

      await currencyController.getExchangeRate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing from currency', async () => {
      mockReq.query = { to: 'EUR' };

      await currencyController.getExchangeRate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'From currency is required' });
    });

    it('should return 400 for missing to currency', async () => {
      mockReq.query = { from: 'USD' };

      await currencyController.getExchangeRate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'To currency is required' });
    });

    it('should handle historical date', async () => {
      mockReq.query = {
        from: 'USD',
        to: 'EUR',
        date: '2023-06-15'
      };

      const expectedResult = {
        rate: 0.92,
        historical: true
      };

      currencyService.getExchangeRate.mockResolvedValue(expectedResult);

      await currencyController.getExchangeRate(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateRates', () => {
    it('should update rates successfully', async () => {
      mockReq.body = { baseCurrency: 'USD' };

      const expectedResult = {
        success: true,
        baseCurrency: 'USD',
        ratesUpdated: 10
      };

      currencyService.updateRates.mockResolvedValue(expectedResult);

      await currencyController.updateRates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle update errors', async () => {
      mockReq.body = {};

      currencyService.updateRates.mockRejectedValue(
        new Error('External API unavailable')
      );

      await currencyController.updateRates(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should get supported currencies successfully', async () => {
      mockReq.query = { includeDetails: 'true' };

      const expectedResult = {
        currencies: ['USD', 'EUR', 'GBP'],
        currencyDetails: {
          USD: { name: 'US Dollar', symbol: '$' }
        }
      };

      currencyService.getSupportedCurrencies.mockResolvedValue(expectedResult);

      await currencyController.getSupportedCurrencies(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency successfully', async () => {
      mockReq.query = {
        amount: '1234.56',
        currency: 'USD'
      };

      currencyService.formatCurrency.mockReturnValue('$1,234.56');

      await currencyController.formatCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        amount: 1234.56,
        currency: 'USD',
        formatted: '$1,234.56'
      });
    });

    it('should return 400 for missing amount', async () => {
      mockReq.query = { currency: 'USD' };

      await currencyController.formatCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Amount is required' });
    });

    it('should return 400 for missing currency', async () => {
      mockReq.query = { amount: '1234.56' };

      await currencyController.formatCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Currency is required' });
    });

    it('should return 400 for invalid amount', async () => {
      mockReq.query = { amount: 'invalid', currency: 'USD' };

      await currencyController.formatCurrency(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Amount must be a valid number' });
    });
  });

  describe('getRateHistory', () => {
    it('should get rate history successfully', async () => {
      mockReq.query = {
        from: 'USD',
        to: 'EUR',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      const expectedResult = {
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        history: [],
        statistics: {}
      };

      currencyService.getRateHistory.mockResolvedValue(expectedResult);

      await currencyController.getRateHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing from currency', async () => {
      mockReq.query = { to: 'EUR' };

      await currencyController.getRateHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for missing to currency', async () => {
      mockReq.query = { from: 'USD' };

      await currencyController.getRateHistory(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('batchConvert', () => {
    it('should batch convert successfully', async () => {
      mockReq.body = {
        conversions: [
          { amount: 100, currency: 'USD' },
          { amount: 50, currency: 'EUR' }
        ],
        targetCurrency: 'USD'
      };

      const expectedResult = {
        conversions: [],
        total: 150,
        targetCurrency: 'USD'
      };

      currencyService.batchConvert.mockResolvedValue(expectedResult);

      await currencyController.batchConvert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should return 400 for missing conversions', async () => {
      mockReq.body = { targetCurrency: 'USD' };

      await currencyController.batchConvert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Conversions array is required' });
    });

    it('should return 400 for missing target currency', async () => {
      mockReq.body = { conversions: [] };

      await currencyController.batchConvert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Target currency is required' });
    });

    it('should return 400 for invalid conversions type', async () => {
      mockReq.body = {
        conversions: 'invalid',
        targetCurrency: 'USD'
      };

      await currencyController.batchConvert(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
