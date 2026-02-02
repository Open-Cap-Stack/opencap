/**
 * Transaction Routes (ZeroDB)
 *
 * Feature: OCAE-18: Migrate Transaction controller to ZeroDB
 * API routes for transaction management
 */

const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

/**
 * @route   POST /api/transactions
 * @desc    Create a new transaction
 * @access  Private
 */
router.post('/', transactionController.createTransaction);

/**
 * @route   GET /api/transactions
 * @desc    List all transactions with filtering and pagination
 * @access  Private
 */
router.get('/', transactionController.listTransactions);

/**
 * @route   GET /api/transactions/:id
 * @desc    Get a single transaction by ID
 * @access  Private
 */
router.get('/:id', transactionController.getTransaction);

/**
 * @route   PUT /api/transactions/:id
 * @desc    Update a transaction
 * @access  Private
 */
router.put('/:id', transactionController.updateTransaction);

/**
 * @route   DELETE /api/transactions/:id
 * @desc    Delete a transaction
 * @access  Private
 */
router.delete('/:id', transactionController.deleteTransaction);

/**
 * @route   GET /api/transactions/user/:userId
 * @desc    Get all transactions for a user
 * @access  Private
 */
router.get('/user/:userId', transactionController.getTransactionsByUser);

/**
 * @route   GET /api/transactions/company/:companyId
 * @desc    Get all transactions for a company
 * @access  Private
 */
router.get('/company/:companyId', transactionController.getTransactionsByCompany);

/**
 * @route   GET /api/transactions/company/:companyId/summary
 * @desc    Get transaction summary for a company
 * @access  Private
 */
router.get('/company/:companyId/summary', transactionController.getTransactionSummary);

/**
 * @route   POST /api/transactions/:id/process
 * @desc    Process a pending transaction
 * @access  Private
 */
router.post('/:id/process', transactionController.processTransaction);

/**
 * @route   POST /api/transactions/:id/refund
 * @desc    Create a refund for a completed transaction
 * @access  Private
 */
router.post('/:id/refund', transactionController.refundTransaction);

module.exports = router;
