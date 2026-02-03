/**
 * Transaction Model
 * Feature: OCDI-103: Create Transaction data model
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid ISO currency codes
const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'CHF', 'BRL'];

// Valid transaction types
const validTransactionTypes = ['payment', 'refund', 'payout', 'deposit', 'withdrawal', 'transfer', 'fee', 'adjustment'];

// Valid transaction statuses
const validTransactionStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'declined'];

// Schema definition for documentation and validation
const transactionSchema = {
    transactionId: { type: 'string', required: true, unique: true },
    userId: { type: 'string', required: true },
    companyId: { type: 'string' },
    accountId: { type: 'string' },
    amount: { type: 'number', required: true },
    currency: { type: 'string', required: true, enum: validCurrencyCodes },
    type: { type: 'string', required: true, enum: validTransactionTypes },
    status: { type: 'string', required: true, enum: validTransactionStatuses },
    description: { type: 'string', default: '' },
    metadata: { type: 'object', default: {} },
    fees: {
        type: 'object',
        default: {
            processingFee: 0,
            platformFee: 0,
            taxAmount: 0,
            otherFees: 0
        }
    },
    relatedTransactions: { type: 'array', default: [] },
    paymentMethod: {
        type: 'string',
        enum: ['credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash', 'other'],
        default: 'other'
    },
    failureReason: { type: 'string', default: null },
    processedAt: { type: 'date', default: null },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Currency symbol mapping
const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'CA$',
    'AUD': 'A$',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'CHF': 'CHF',
    'BRL': 'R$'
};

// Create the base model
const baseModel = createModel('transactions', transactionSchema);

// Extended Transaction model with business logic
const Transaction = {
    ...baseModel,
    tableName: 'transactions',
    schema: transactionSchema,
    validCurrencyCodes,
    validTransactionTypes,
    validTransactionStatuses,

    /**
     * Create a new transaction with defaults
     * @param {Object} data - Transaction data
     * @returns {Object} Created transaction
     */
    async create(data) {
        // Generate transactionId if not provided
        if (!data.transactionId) {
            data.transactionId = `txn_${uuidv4()}`;
        }

        // Validate amount
        if (data.amount <= 0) {
            throw new Error('Amount must be a positive number');
        }

        // Validate currency
        if (data.currency && !validCurrencyCodes.includes(data.currency.toUpperCase())) {
            throw new Error(`${data.currency} is not a valid ISO currency code`);
        }
        data.currency = data.currency?.toUpperCase();

        // Set default fees
        if (!data.fees) {
            data.fees = {
                processingFee: 0,
                platformFee: 0,
                taxAmount: 0,
                otherFees: 0
            };
        }

        // Set processedAt if status is completed
        if (data.status === 'completed' && !data.processedAt) {
            data.processedAt = new Date().toISOString();
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find transaction by transactionId
     * @param {string} transactionId - Transaction ID
     * @returns {Object|null} Transaction or null
     */
    async findByTransactionId(transactionId) {
        return baseModel.findOne.call(baseModel, { transactionId });
    },

    /**
     * Find transactions by user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Array} User's transactions
     */
    async findByUser(userId, options = {}) {
        return baseModel.find.call(baseModel, { userId }, options);
    },

    /**
     * Find transactions by company
     * @param {string} companyId - Company ID
     * @param {Object} options - Query options
     * @returns {Array} Company's transactions
     */
    async findByCompany(companyId, options = {}) {
        return baseModel.find.call(baseModel, { companyId }, options);
    },

    /**
     * Find transactions by status
     * @param {string} status - Transaction status
     * @param {Object} options - Query options
     * @returns {Array} Transactions with given status
     */
    async findByStatus(status, options = {}) {
        return baseModel.find.call(baseModel, { status }, options);
    },

    /**
     * Get the net amount of a transaction after fees
     * @param {Object} transaction - Transaction object
     * @returns {number} Net amount
     */
    getNetAmount(transaction) {
        const fees = transaction.fees || {};
        const totalFees = (fees.processingFee || 0) +
            (fees.platformFee || 0) +
            (fees.taxAmount || 0) +
            (fees.otherFees || 0);
        return transaction.amount - totalFees;
    },

    /**
     * Get formatted amount with currency symbol
     * @param {Object} transaction - Transaction object
     * @returns {string} Formatted amount with currency symbol
     */
    getFormattedAmount(transaction) {
        const symbol = currencySymbols[transaction.currency] || '';
        return `${symbol}${transaction.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    },

    /**
     * Update transaction status
     * @param {string} transactionId - Transaction ID
     * @param {string} status - New status
     * @returns {Object} Update result
     */
    async updateStatus(transactionId, status) {
        const update = { status };
        if (status === 'completed') {
            update.processedAt = new Date().toISOString();
        }
        return baseModel.updateOne.call(baseModel,
            { transactionId },
            { $set: update }
        );
    },

    // Expose base model methods
    find: baseModel.find.bind(baseModel),
    findOne: baseModel.findOne.bind(baseModel),
    findById: baseModel.findById.bind(baseModel),
    updateOne: baseModel.updateOne.bind(baseModel),
    updateMany: baseModel.updateMany.bind(baseModel),
    findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
    findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
    deleteOne: baseModel.deleteOne.bind(baseModel),
    deleteMany: baseModel.deleteMany.bind(baseModel),
    findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
    findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
    countDocuments: baseModel.countDocuments.bind(baseModel),
    exists: baseModel.exists.bind(baseModel),
    distinct: baseModel.distinct.bind(baseModel),
    aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = Transaction;
