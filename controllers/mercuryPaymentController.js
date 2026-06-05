'use strict';

/**
 * Mercury Payment Controller
 * Issue #676-#678: Mercury payment capabilities
 *
 * Endpoints:
 * - POST /recipients       — Add a payment recipient
 * - GET  /recipients       — List payment recipients
 * - POST /payments         — Send a wire/ACH payment
 * - POST /transfers        — Create an internal transfer
 * - GET  /transactions/:id — Get a single transaction by ID
 */

const mercuryService = require('../services/mercuryService');
const { errorResponse } = require('../middleware/errorResponse');

/**
 * POST /recipients
 * Add a payment recipient for outgoing payments.
 * Body: { name, email, accountNumber, routingNumber, type }
 */
exports.addRecipient = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { name, email, accountNumber, routingNumber, type } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const result = await mercuryService.addRecipient(userId, {
      name,
      email: email || null,
      accountNumber: accountNumber || null,
      routingNumber: routingNumber || null,
      type: type || 'individual',
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury add recipient failed:', error.message);
    errorResponse(res, 500, 'Failed to add Mercury recipient', error);
  }
};

/**
 * GET /recipients
 * List all payment recipients.
 */
exports.getRecipients = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const result = await mercuryService.getRecipients(userId);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury list recipients failed:', error.message);
    errorResponse(res, 500, 'Failed to list Mercury recipients', error);
  }
};

/**
 * POST /payments
 * Send a wire or ACH payment.
 * Body: { recipientId, amount, paymentMethod, note }
 */
exports.sendPayment = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { recipientId, amount, paymentMethod, note } = req.body;

    if (!recipientId) {
      return res.status(400).json({ success: false, error: 'recipientId is required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const result = await mercuryService.sendPayment(userId, {
      recipientId,
      amount,
      paymentMethod: paymentMethod || 'ach',
      note: note || null,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury send payment failed:', error.message);
    errorResponse(res, 500, 'Failed to send Mercury payment', error);
  }
};

/**
 * POST /transfers
 * Create an internal transfer between Mercury accounts.
 * Body: { fromAccountId, toAccountId, amount, note }
 */
exports.createTransfer = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { fromAccountId, toAccountId, amount, note } = req.body;

    if (!fromAccountId || !toAccountId) {
      return res.status(400).json({ success: false, error: 'fromAccountId and toAccountId are required' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'amount must be a positive number' });
    }

    const result = await mercuryService.createInternalTransfer(userId, {
      fromAccountId,
      toAccountId,
      amount,
      note: note || null,
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury internal transfer failed:', error.message);
    errorResponse(res, 500, 'Failed to create Mercury internal transfer', error);
  }
};

/**
 * GET /transactions/:id
 * Get a single transaction by ID.
 */
exports.getTransaction = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'transaction id is required' });
    }

    const result = await mercuryService.getTransactionById(userId, id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury get transaction failed:', error.message);
    errorResponse(res, 500, 'Failed to fetch Mercury transaction', error);
  }
};
