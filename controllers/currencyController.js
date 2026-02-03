/**
 * Currency Controller
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API endpoints for currency features
 */

const currencyService = require('../services/currencyService');

/**
 * Convert currency
 * POST /api/v1/currency/convert
 */
const convertCurrency = async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency, precision } = req.body;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (!fromCurrency) {
      return res.status(400).json({ error: 'From currency is required' });
    }

    if (!toCurrency) {
      return res.status(400).json({ error: 'To currency is required' });
    }

    const options = { precision: precision || 2 };

    const result = await currencyService.convertCurrency(amount, fromCurrency, toCurrency, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Convert currency error:', error);

    if (error.message.includes('Unsupported currency') ||
        error.message.includes('Amount must be')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to convert currency',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get exchange rate
 * GET /api/v1/currency/rate
 */
const getExchangeRate = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    if (!from) {
      return res.status(400).json({ error: 'From currency is required' });
    }

    if (!to) {
      return res.status(400).json({ error: 'To currency is required' });
    }

    const options = {
      date: date ? new Date(date) : undefined
    };

    const result = await currencyService.getExchangeRate(from, to, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get exchange rate error:', error);

    if (error.message.includes('Unsupported currency') ||
        error.message.includes('not available')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to get exchange rate',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update exchange rates from external source
 * POST /api/v1/currency/rates/update
 */
const updateRates = async (req, res) => {
  try {
    const { baseCurrency } = req.body;

    const options = {
      baseCurrency: baseCurrency || 'USD'
    };

    const result = await currencyService.updateRates(options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Update rates error:', error);
    res.status(500).json({
      error: 'Failed to update exchange rates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get supported currencies
 * GET /api/v1/currency/supported
 */
const getSupportedCurrencies = async (req, res) => {
  try {
    const { includeDetails } = req.query;

    const options = {
      includeDetails: includeDetails === 'true'
    };

    const result = await currencyService.getSupportedCurrencies(options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get supported currencies error:', error);
    res.status(500).json({
      error: 'Failed to get supported currencies',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Format currency amount
 * GET /api/v1/currency/format
 */
const formatCurrency = async (req, res) => {
  try {
    const { amount, currency, locale } = req.query;

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    if (!currency) {
      return res.status(400).json({ error: 'Currency is required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    const options = { locale };

    const formatted = currencyService.formatCurrency(numAmount, currency, options);

    res.status(200).json({
      amount: numAmount,
      currency: currency.toUpperCase(),
      formatted
    });
  } catch (error) {
    console.error('Format currency error:', error);
    res.status(500).json({
      error: 'Failed to format currency',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get rate history
 * GET /api/v1/currency/history
 */
const getRateHistory = async (req, res) => {
  try {
    const { from, to, startDate, endDate } = req.query;

    if (!from) {
      return res.status(400).json({ error: 'From currency is required' });
    }

    if (!to) {
      return res.status(400).json({ error: 'To currency is required' });
    }

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    const result = await currencyService.getRateHistory(from, to, options);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get rate history error:', error);
    res.status(500).json({
      error: 'Failed to get rate history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Batch convert multiple amounts
 * POST /api/v1/currency/batch-convert
 */
const batchConvert = async (req, res) => {
  try {
    const { conversions, targetCurrency } = req.body;

    if (!conversions || !Array.isArray(conversions)) {
      return res.status(400).json({ error: 'Conversions array is required' });
    }

    if (!targetCurrency) {
      return res.status(400).json({ error: 'Target currency is required' });
    }

    const result = await currencyService.batchConvert(conversions, targetCurrency);

    res.status(200).json(result);
  } catch (error) {
    console.error('Batch convert error:', error);

    if (error.message.includes('Unsupported currency')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to batch convert',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  convertCurrency,
  getExchangeRate,
  updateRates,
  getSupportedCurrencies,
  formatCurrency,
  getRateHistory,
  batchConvert
};
