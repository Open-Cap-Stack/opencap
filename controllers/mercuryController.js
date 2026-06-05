/**
 * Mercury Controller
 * Issues #671, #672, #673: Mercury banking integration
 * Issues #674, #679: SAFE funding verification + Mercury snapshots
 *
 * Endpoints:
 * - GET  /status          — Mercury connection status
 * - GET  /accounts        — List connected Mercury bank accounts
 * - GET  /balance         — Aggregated balance, 30-day burn rate, runway months
 * - POST /verify-funding  — Verify SAFE funding via Mercury wire transactions
 * - POST /snapshots       — Create a Mercury balance snapshot
 */

const mercuryService = require('../services/mercuryService');
const zerodbService = require('../services/zerodbService');
const SAFE = require('../models/SAFE');
const { errorResponse } = require('../middleware/errorResponse');

const MERCURY_SNAPSHOTS_TABLE = 'mercury_snapshots';

/**
 * GET /status
 * Check whether Mercury banking is connected for the authenticated user.
 */
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const status = await mercuryService.getConnectionStatus(userId);

    res.status(200).json({
      mercury: status,
    });
  } catch (error) {
    console.error('Mercury status check failed:', error.message);
    errorResponse(res, 500, 'Failed to check Mercury connection status', error);
  }
};

/**
 * GET /accounts
 * List all Mercury bank accounts for the authenticated user.
 */
exports.getAccounts = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const result = await mercuryService.getAccounts(userId);

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected — please connect via OAuth first');
    }
    console.error('Mercury accounts fetch failed:', error.message);
    errorResponse(res, 500, 'Failed to fetch Mercury accounts', error);
  }
};

/**
 * GET /balance
 * Returns aggregated balance across all Mercury accounts,
 * 30-day burn rate (sum of outflows), and estimated runway in months.
 */
exports.getBalance = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Fetch all accounts
    const { accounts } = await mercuryService.getAccounts(userId);
    const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    // Calculate 30-day burn rate across all accounts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let totalOutflows = 0;

    for (const account of accounts) {
      try {
        const { transactions } = await mercuryService.getTransactions(userId, {
          accountId: account.id,
          start: thirtyDaysAgo,
        });

        const outflows = (transactions || [])
          .filter((txn) => txn.amount < 0)
          .reduce((sum, txn) => sum + Math.abs(txn.amount), 0);

        totalOutflows += outflows;
      } catch (txnErr) {
        // If we can't fetch transactions for one account, continue
        console.error(`Failed to fetch transactions for account ${account.id}:`, txnErr.message);
      }
    }

    const burnRate30d = totalOutflows;
    const runwayMonths = burnRate30d > 0
      ? Math.round((totalBalance / burnRate30d) * 10) / 10
      : null; // null = infinite runway (no outflows)

    res.status(200).json({
      totalBalance,
      burnRate30d,
      runwayMonths,
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currentBalance: a.currentBalance,
      })),
    });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected — please connect via OAuth first');
    }
    console.error('Mercury balance fetch failed:', error.message);
    errorResponse(res, 500, 'Failed to fetch Mercury balance', error);
  }
};

// ── GET /activity — transaction activity feed (#677) ──────────────────────

/**
 * GET /activity
 * Returns recent transactions formatted as activity feed items.
 * Query params: limit (default 25), offset (default 0), startDate, endDate
 */
exports.getActivityFeed = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit, 10) || 25;
    const offset = parseInt(req.query.offset, 10) || 0;
    const { startDate, endDate } = req.query;

    // Fetch all accounts
    const { accounts } = await mercuryService.getAccounts(userId);

    let allTransactions = [];
    for (const account of (accounts || [])) {
      try {
        const queryParams = {};
        if (startDate) queryParams.start = startDate;
        if (endDate) queryParams.end = endDate;

        const { transactions } = await mercuryService.getTransactions(userId, {
          accountId: account.id,
          ...queryParams,
        });

        // Tag each transaction with account info
        for (const txn of (transactions || [])) {
          allTransactions.push({
            ...txn,
            _accountId: account.id,
            _accountName: account.name,
          });
        }
      } catch (txnErr) {
        console.error(`Failed to fetch transactions for account ${account.id}:`, txnErr.message);
      }
    }

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination
    const paginated = allTransactions.slice(offset, offset + limit);

    // Format as activity feed items
    const items = paginated.map((txn) => ({
      id: txn.id,
      type: txn.kind || 'transaction',
      amount: txn.amount,
      direction: txn.amount >= 0 ? 'credit' : 'debit',
      description: txn.note || txn.bankDescription || txn.counterpartyName || 'Transaction',
      counterparty: txn.counterpartyName || null,
      date: txn.createdAt,
      status: txn.status || 'completed',
      accountId: txn._accountId,
      accountName: txn._accountName,
    }));

    res.status(200).json({
      items,
      total: allTransactions.length,
      limit,
      offset,
    });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury activity feed failed:', error.message);
    errorResponse(res, 500, 'Failed to fetch Mercury activity feed', error);
  }
};

// ── GET /financial-summary — auto-populate investor update template (#676) ─

/**
 * GET /financial-summary
 * Returns financial metrics for investor update templates.
 * Calculates burn rate, runway, revenue, expenses from Mercury data.
 */
exports.getFinancialSummary = async (req, res) => {
  try {
    const userId = req.user?.userId;

    // Fetch all accounts
    const { accounts } = await mercuryService.getAccounts(userId);
    const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    // Calculate 30-day metrics across all accounts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    let totalInflows = 0;
    let totalOutflows = 0;

    for (const account of accounts) {
      try {
        const { transactions } = await mercuryService.getTransactions(userId, {
          accountId: account.id,
          start: thirtyDaysAgo,
        });

        for (const txn of (transactions || [])) {
          if (txn.amount >= 0) {
            totalInflows += txn.amount;
          } else {
            totalOutflows += Math.abs(txn.amount);
          }
        }
      } catch (txnErr) {
        console.error(`Failed to fetch transactions for account ${account.id}:`, txnErr.message);
      }
    }

    const burnRate30d = totalOutflows;
    const monthlyRevenue = totalInflows;
    const monthlyExpenses = totalOutflows;
    const runwayMonths = burnRate30d > 0
      ? Math.round((totalBalance / burnRate30d) * 10) / 10
      : null;

    res.status(200).json({
      totalBalance,
      burnRate30d,
      runwayMonths,
      monthlyRevenue,
      monthlyExpenses,
      cashOnHand: totalBalance,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('not connected')) {
      return errorResponse(res, 401, 'Mercury not connected');
    }
    console.error('Mercury financial summary failed:', error.message);
    errorResponse(res, 500, 'Failed to generate financial summary', error);
  }
};

// ── mercury_snapshots table seeding (#679) ─────────────────────────────────

/**
 * Ensure the mercury_snapshots table exists in ZeroDB.
 * Called at app startup (same pattern as reconstruction_jobs in app.js).
 */
exports.ensureMercurySnapshotsTable = async function ensureMercurySnapshotsTable() {
  try {
    await zerodbService.createTable(MERCURY_SNAPSHOTS_TABLE, {
      fields: {
        companyId: { type: 'string' },
        accountId: { type: 'string' },
        accountName: { type: 'string' },
        balance: { type: 'number' },
        currency: { type: 'string' },
        snapshotAt: { type: 'string' },
        burnRate30d: { type: 'number' },
        runwayMonths: { type: 'number' },
      },
    });
  } catch (err) {
    const detail = err.response?.data?.detail || '';
    const alreadyExists =
      err.response?.status === 409 ||
      err.message?.includes('already exist') ||
      detail.includes('UniqueViolation') ||
      detail.includes('already exists');

    if (!alreadyExists) {
      console.warn(`Could not pre-create table "${MERCURY_SNAPSHOTS_TABLE}": ${err.message}`);
    }
  }
};

// ── POST /verify-funding (#674) ────────────────────────────────────────────

/**
 * Resolve a SAFE by safeId first, then fall back to _id.
 * Mirrors the pattern in controllers/safeController.js.
 */
async function resolveSafe(id) {
  let safe = await SAFE.findOne({ safeId: id });
  if (!safe) safe = await SAFE.findOne({ _id: id });
  return safe;
}

/**
 * POST /verify-funding
 * Verify that a SAFE's investment amount was received via Mercury wire transfer.
 *
 * Body: { safeId, amount, tolerance?: 1 }
 *
 * Logic:
 * 1. Look up the SAFE by safeId
 * 2. Search Mercury for incoming wires matching amount +/- tolerance in last 30 days
 * 3. If match found: transition SAFE to 'funded', store fundingVerification object
 * 4. If no match: return verified:false
 */
exports.verifyFunding = async (req, res) => {
  const { safeId, amount, tolerance = 1 } = req.body;

  // Validate required fields
  if (!safeId) {
    return res.status(400).json({ success: false, error: 'safeId is required' });
  }
  if (amount === undefined || amount === null) {
    return res.status(400).json({ success: false, error: 'amount is required' });
  }

  // Resolve the SAFE
  let safe;
  try {
    safe = await resolveSafe(safeId);
  } catch (err) {
    return res.status(500).json({ success: false, error: `Failed to look up SAFE: ${err.message}` });
  }

  if (!safe) {
    return res.status(404).json({ success: false, error: 'SAFE not found' });
  }

  // Search Mercury for matching transactions
  let matchingTxns;
  try {
    const userId = req.user?.userId || req.user?._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    matchingTxns = await mercuryService.searchTransactions({
      userId,
      minAmount: amount - tolerance,
      maxAmount: amount + tolerance,
      direction: 'credit',
      since: thirtyDaysAgo,
    });
  } catch (err) {
    console.error('Mercury API call failed during funding verification:', err.message);
    return res.status(502).json({
      success: false,
      error: `Mercury API error: ${err.message}`,
    });
  }

  // No matching transaction found
  if (!matchingTxns || matchingTxns.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        verified: false,
        safeId: safe.safeId,
        message: 'No matching wire found in the last 30 days',
      },
    });
  }

  // Match found — build fundingVerification payload
  const bestMatch = matchingTxns[0];
  const fundingVerification = {
    method: 'mercury_auto',
    mercuryTransactionId: bestMatch.id,
    verifiedAt: new Date().toISOString(),
    verifiedAmount: Math.abs(bestMatch.amount),
    wireDate: bestMatch.createdAt,
  };

  // Attempt to transition SAFE status to 'funded' if valid
  const canTransition = SAFE.canTransitionTo(safe.status, 'funded');
  let statusUpdated = false;

  if (canTransition) {
    try {
      const userId = req.user?._id || req.user?.userId;
      await SAFE.transitionTo(
        safe.safeId,
        'funded',
        userId,
        'Auto-verified via Mercury wire match'
      );
      // Store the fundingVerification object on the SAFE
      await SAFE.updateOne(
        { safeId: safe.safeId },
        { $set: { fundingVerification } }
      );
      statusUpdated = true;
    } catch (err) {
      console.error('Failed to update SAFE status after verification:', err.message);
      // Verification still succeeded even if status update failed
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      verified: true,
      safeId: safe.safeId,
      statusUpdated,
      fundingVerification,
    },
  });
};

// ── POST /snapshots (#679) ─────────────────────────────────────────────────

/**
 * POST /snapshots
 * Create a Mercury balance snapshot for a company account.
 *
 * Body: { companyId, accountId, accountName, balance, currency, burnRate30d, runwayMonths }
 */
exports.createSnapshot = async (req, res) => {
  const { companyId, accountId, accountName, balance, currency, burnRate30d, runwayMonths } = req.body;

  if (!companyId) {
    return res.status(400).json({ success: false, error: 'companyId is required' });
  }
  if (!accountId) {
    return res.status(400).json({ success: false, error: 'accountId is required' });
  }

  try {
    const snapshot = {
      companyId,
      accountId,
      accountName: accountName || null,
      balance: balance || 0,
      currency: currency || 'USD',
      snapshotAt: new Date().toISOString(),
      burnRate30d: burnRate30d || 0,
      runwayMonths: runwayMonths || null,
    };

    const result = await zerodbService.insertRow(MERCURY_SNAPSHOTS_TABLE, snapshot);

    return res.status(201).json({
      success: true,
      data: { ...snapshot, _rowId: result?.row_id || null },
    });
  } catch (err) {
    console.error('Failed to create Mercury snapshot:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
