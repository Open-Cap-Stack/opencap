/**
 * Transaction Controller (ZeroDB)
 *
 * Feature: OCAE-18: Migrate Transaction controller to ZeroDB
 * Handles all transaction-related CRUD operations using ZeroDB as the data store
 */

const zerodbService = require('../services/zerodbService');

// Valid ISO currency codes
const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Valid transaction types
const validTransactionTypes = ['payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'];

// Valid transaction statuses
const validTransactionStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'];

// Immutable fields that cannot be updated
const immutableFields = ['transactionId', 'amount', 'userId', 'currency'];

/**
 * Validate transaction data
 * @param {Object} data - Transaction data to validate
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} - { isValid: boolean, error: string }
 */
const validateTransactionData = (data, isUpdate = false) => {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }

  // For create operations, check required fields
  if (!isUpdate) {
    const requiredFields = ['transactionId', 'userId', 'amount', 'currency', 'type', 'status'];
    const missingFields = requiredFields.filter(field => !data[field] && data[field] !== 0);

    if (missingFields.length > 0) {
      return { isValid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }
  }

  // Validate amount
  if (data.amount !== undefined) {
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      return { isValid: false, error: 'Invalid amount: must be a positive number' };
    }
  }

  // Validate currency
  if (data.currency !== undefined) {
    const upperCurrency = data.currency.toUpperCase();
    if (!validCurrencyCodes.includes(upperCurrency)) {
      return { isValid: false, error: `Invalid currency code: ${data.currency}. Valid codes are: ${validCurrencyCodes.join(', ')}` };
    }
  }

  // Validate transaction type
  if (data.type !== undefined) {
    if (!validTransactionTypes.includes(data.type)) {
      return { isValid: false, error: `Invalid transaction type: ${data.type}. Valid types are: ${validTransactionTypes.join(', ')}` };
    }
  }

  // Validate status
  if (data.status !== undefined) {
    if (!validTransactionStatuses.includes(data.status)) {
      return { isValid: false, error: `Invalid transaction status: ${data.status}. Valid statuses are: ${validTransactionStatuses.join(', ')}` };
    }
  }

  return { isValid: true };
};

/**
 * Check for immutable field updates
 * @param {Object} data - Update data
 * @returns {Object} - { hasImmutable: boolean, fields: string[] }
 */
const checkImmutableFields = (data) => {
  const immutableUpdates = immutableFields.filter(field => data[field] !== undefined);
  return {
    hasImmutable: immutableUpdates.length > 0,
    fields: immutableUpdates
  };
};

/**
 * Create a new transaction
 */
const createTransaction = async (req, res, next) => {
  try {
    const validation = validateTransactionData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const transactionData = {
      ...req.body,
      currency: req.body.currency.toUpperCase(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fees: req.body.fees || {
        processingFee: 0,
        platformFee: 0,
        taxAmount: 0,
        otherFees: 0
      }
    };

    const result = await zerodbService.insertRow('transactions', transactionData);

    const createdTransaction = result.rows && result.rows[0] ? result.rows[0] : transactionData;
    return res.status(201).json(createdTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
};

/**
 * Get a transaction by ID
 */
const getTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const transactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.status(200).json(transactions[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return res.status(500).json({ error: 'Failed to retrieve transaction' });
  }
};

/**
 * List all transactions with filtering and pagination
 */
const listTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      companyId,
      userId,
      status,
      type,
      startDate,
      endDate
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (type) filter.type = type;

    // ZeroDB: Fetch all matching transactions first, then apply date filtering in-memory
    let transactions = await zerodbService.queryTable('transactions', {
      filter,
      sort: { createdAt: -1 }
    });

    // Apply date range filtering in-memory (ZeroDB doesn't support $gte/$lte operators)
    if (startDate || endDate) {
      const startTime = startDate ? new Date(startDate).getTime() : null;
      const endTime = endDate ? new Date(endDate).getTime() : null;
      transactions = transactions.filter(txn => {
        const txnTime = new Date(txn.createdAt).getTime();
        if (startTime && txnTime < startTime) return false;
        if (endTime && txnTime > endTime) return false;
        return true;
      });
    }

    const totalCount = transactions.length;

    // Apply pagination in-memory
    transactions = transactions.slice(skip, skip + limitNum);
    const totalPages = Math.ceil(totalCount / limitNum);

    return res.status(200).json({
      transactions,
      totalCount,
      currentPage: pageNum,
      totalPages,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error listing transactions:', error);
    return res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
};

/**
 * Update a transaction
 */
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Check for immutable field updates
    const immutableCheck = checkImmutableFields(req.body);
    if (immutableCheck.hasImmutable) {
      return res.status(400).json({
        error: `Cannot update immutable fields: ${immutableCheck.fields.join(', ')}`
      });
    }

    // Validate update data
    const validation = validateTransactionData(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if transaction exists
    const existingTransactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    if (!existingTransactions || existingTransactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update transaction
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // ZeroDB: Use direct update without MongoDB $set operator
    await zerodbService.updateRows('transactions', { transactionId: id }, updateData);

    const updatedTransactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    return res.status(200).json(updatedTransactions[0]);
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({ error: 'Failed to update transaction' });
  }
};

/**
 * Delete a transaction
 */
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Check if transaction exists
    const existingTransactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    if (!existingTransactions || existingTransactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await zerodbService.deleteRows('transactions', { transactionId: id });

    return res.status(200).json({
      message: 'Transaction deleted successfully',
      transactionId: id
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

/**
 * Get all transactions for a user
 */
const getTransactionsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const transactions = await zerodbService.queryTable('transactions', {
      filter: { userId },
      sort: { createdAt: -1 }
    });

    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return res.status(500).json({ error: 'Failed to retrieve user transactions' });
  }
};

/**
 * Get all transactions for a company
 */
const getTransactionsByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const transactions = await zerodbService.queryTable('transactions', {
      filter: { companyId },
      sort: { createdAt: -1 }
    });

    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching company transactions:', error);
    return res.status(500).json({ error: 'Failed to retrieve company transactions' });
  }
};

/**
 * Get transaction summary for a company
 */
const getTransactionSummary = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const filter = { companyId };

    let transactions = await zerodbService.queryTable('transactions', {
      filter,
      sort: { createdAt: -1 }
    });

    // ZeroDB: Apply date range filtering in-memory (doesn't support $gte/$lte operators)
    if (startDate || endDate) {
      const startTime = startDate ? new Date(startDate).getTime() : null;
      const endTime = endDate ? new Date(endDate).getTime() : null;
      transactions = transactions.filter(txn => {
        const txnTime = new Date(txn.createdAt).getTime();
        if (startTime && txnTime < startTime) return false;
        if (endTime && txnTime > endTime) return false;
        return true;
      });
    }

    // Calculate summary
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      totalFees: 0,
      netAmount: 0,
      byType: {},
      byStatus: {}
    };

    transactions.forEach(txn => {
      // Calculate amounts
      summary.totalAmount += txn.amount || 0;

      // Calculate fees
      if (txn.fees) {
        const txnFees = (txn.fees.processingFee || 0) +
                       (txn.fees.platformFee || 0) +
                       (txn.fees.taxAmount || 0) +
                       (txn.fees.otherFees || 0);
        summary.totalFees += txnFees;
      }

      // Group by type
      if (txn.type) {
        summary.byType[txn.type] = (summary.byType[txn.type] || 0) + 1;
      }

      // Group by status
      if (txn.status) {
        summary.byStatus[txn.status] = (summary.byStatus[txn.status] || 0) + 1;
      }
    });

    summary.netAmount = summary.totalAmount - summary.totalFees;

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error calculating transaction summary:', error);
    return res.status(500).json({ error: 'Failed to calculate transaction summary' });
  }
};

/**
 * Process a pending transaction
 */
const processTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Get the transaction
    const existingTransactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    if (!existingTransactions || existingTransactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = existingTransactions[0];

    // Check if already processed
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        error: `Transaction is already ${transaction.status}. Only pending transactions can be processed.`
      });
    }

    // ZeroDB: Use direct update without MongoDB $set operator
    await zerodbService.updateRows('transactions', { transactionId: id }, {
      status: 'processing',
      updatedAt: new Date().toISOString()
    });

    const updatedTransactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    return res.status(200).json(updatedTransactions[0]);
  } catch (error) {
    console.error('Error processing transaction:', error);
    return res.status(500).json({ error: 'Failed to process transaction' });
  }
};

/**
 * Create a refund for a completed transaction
 */
const refundTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    // Get the original transaction
    const existingTransactions = await zerodbService.queryTable('transactions', {
      filter: { transactionId: id }
    });

    if (!existingTransactions || existingTransactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const originalTransaction = existingTransactions[0];

    // Check if transaction is completed
    if (originalTransaction.status !== 'completed') {
      return res.status(400).json({
        error: 'Only completed transactions can be refunded'
      });
    }

    // Validate refund amount
    const refundAmount = amount || originalTransaction.amount;
    if (refundAmount > originalTransaction.amount) {
      return res.status(400).json({
        error: 'Refund amount cannot exceed the original transaction amount'
      });
    }

    // Create refund transaction
    const refundTransaction = {
      transactionId: `refund-${id}-${Date.now()}`,
      userId: originalTransaction.userId,
      companyId: originalTransaction.companyId,
      accountId: originalTransaction.accountId,
      amount: refundAmount,
      currency: originalTransaction.currency,
      type: 'refund',
      status: 'pending',
      description: reason || `Refund for transaction ${id}`,
      relatedTransactions: [id],
      metadata: {
        originalTransactionId: id,
        refundReason: reason
      },
      fees: {
        processingFee: 0,
        platformFee: 0,
        taxAmount: 0,
        otherFees: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await zerodbService.insertRow('transactions', refundTransaction);

    // ZeroDB: Use direct update without MongoDB $set operator
    await zerodbService.updateRows('transactions', { transactionId: id }, {
      status: 'refunded',
      updatedAt: new Date().toISOString()
    });

    const createdRefund = result.rows && result.rows[0] ? result.rows[0] : refundTransaction;
    return res.status(201).json(createdRefund);
  } catch (error) {
    console.error('Error creating refund:', error);
    return res.status(500).json({ error: 'Failed to create refund' });
  }
};

module.exports = {
  createTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionsByUser,
  getTransactionsByCompany,
  getTransactionSummary,
  processTransaction,
  refundTransaction
};
