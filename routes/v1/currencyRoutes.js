/**
 * Currency Routes
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * REST API routes for currency features
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const currencyController = require('../../controllers/currencyController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/v1/currency/convert
 * @desc Convert amount from one currency to another
 * @access Public
 */
router.post('/convert', currencyController.convertCurrency);

/**
 * @route GET /api/v1/currency/rate
 * @desc Get exchange rate between two currencies
 * @access Public
 */
router.get('/rate', currencyController.getExchangeRate);

/**
 * @route POST /api/v1/currency/rates/update
 * @desc Update exchange rates from external source
 * @access Private (Admin)
 */
router.post('/rates/update', currencyController.updateRates);

/**
 * @route GET /api/v1/currency/supported
 * @desc Get list of supported currencies
 * @access Public
 */
router.get('/supported', currencyController.getSupportedCurrencies);

/**
 * @route GET /api/v1/currency/format
 * @desc Format currency amount
 * @access Public
 */
router.get('/format', currencyController.formatCurrency);

/**
 * @route GET /api/v1/currency/history
 * @desc Get exchange rate history
 * @access Public
 */
router.get('/history', currencyController.getRateHistory);

/**
 * @route POST /api/v1/currency/batch-convert
 * @desc Batch convert multiple amounts
 * @access Public
 */
router.post('/batch-convert', currencyController.batchConvert);

module.exports = router;
