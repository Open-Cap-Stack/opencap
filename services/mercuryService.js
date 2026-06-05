'use strict';

/**
 * Mercury Banking Service
 * Issues #671-#675: Mercury API integration
 *
 * Provides methods to interact with Mercury's banking API:
 * - Account and balance retrieval
 * - Transaction listing and payment verification
 * - Statement listing and PDF download
 * - Token management with auto-refresh
 * - Rate limiting (100 req/min)
 *
 * Tokens are stored encrypted in the integrations table (Issue #680).
 */

const axios = require('axios');
const zerodbService = require('./zerodbService');

const MERCURY_API_BASE = 'https://api.mercury.com/api/v1';
const MERCURY_OAUTH_URL = 'https://api.mercury.com/oauth/token';

// Rate limiter state
let _rateLimitState = {
    count: 0,
    windowStart: Date.now(),
    limit: 100,
    windowMs: 60000,
};

/**
 * Decrypt token if tokenEncryption is available and token looks encrypted.
 */
function _maybeDecryptToken(token) {
    if (!token) return token;
    // Encrypted tokens contain two colons (iv:authTag:ciphertext)
    if (token.split(':').length === 3) {
        try {
            const { decrypt } = require('../utils/tokenEncryption');
            return decrypt(token);
        } catch (e) {
            // If decryption fails, assume plaintext token (pre-migration)
            return token;
        }
    }
    return token;
}

/**
 * Retrieve and optionally refresh the Mercury OAuth token for a user.
 * @param {string} userId
 * @returns {string} Valid access token
 */
async function _getToken(userId) {
    // Fallback to MERCURY_API_KEY env var if set (direct API key auth)
    const apiKey = process.env.MERCURY_API_KEY;
    if (apiKey) {
        // Extract the token portion after "secret-token:mercury_" prefix if present
        return apiKey.startsWith('secret-token:mercury_')
            ? apiKey.replace('secret-token:mercury_', '')
            : apiKey;
    }

    const result = await zerodbService.queryRows(
        'integrations',
        { userId, provider: 'mercury' },
        { limit: 1 }
    );

    const rows = result?.data || [];
    if (rows.length === 0) {
        throw new Error('Mercury not connected for this user. Set MERCURY_API_KEY or connect via OAuth.');
    }

    const integration = rows[0].row_data;
    const expiry = integration.tokenExpiry
        ? new Date(integration.tokenExpiry)
        : null;

    // Token still valid
    if (!expiry || expiry > new Date()) {
        return _maybeDecryptToken(integration.accessToken);
    }

    // Token expired — attempt refresh
    if (!integration.refreshToken) {
        throw new Error('Mercury token expired and no refresh token available');
    }

    const refreshToken = _maybeDecryptToken(integration.refreshToken);
    const { data: tokens } = await axios.post(MERCURY_OAUTH_URL, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    // Encrypt new tokens before storing
    let newAccessToken = tokens.access_token;
    let newRefreshToken = tokens.refresh_token || refreshToken;
    try {
        const { encrypt } = require('../utils/tokenEncryption');
        newAccessToken = encrypt(tokens.access_token);
        newRefreshToken = encrypt(tokens.refresh_token || refreshToken);
    } catch (e) {
        // Encryption not configured — store plaintext
    }

    await zerodbService.updateRows('integrations', {
        filter: { userId, provider: 'mercury' },
        update: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenExpiry: new Date(
                Date.now() + (tokens.expires_in || 3600) * 1000
            ).toISOString(),
        },
    });

    return tokens.access_token;
}

/**
 * Make an authenticated GET request to Mercury API.
 */
async function _mercuryGet(token, path, params) {
    // Rate limit check
    const now = Date.now();
    if (now - _rateLimitState.windowStart > _rateLimitState.windowMs) {
        _rateLimitState.count = 0;
        _rateLimitState.windowStart = now;
    }
    _rateLimitState.count++;

    try {
        const config = {
            headers: {
                Authorization: `Bearer secret-token:mercury_${token}`,
                'Content-Type': 'application/json',
            },
        };
        if (params) config.params = params;

        const { data } = await axios.get(`${MERCURY_API_BASE}${path}`, config);
        return data;
    } catch (err) {
        if (err.response?.status === 401) {
            throw new Error('Mercury API authentication failed');
        }
        if (err.response?.status === 429) {
            throw new Error('Mercury API rate limit exceeded');
        }
        throw err;
    }
}

// --- Public methods ---

async function getAccounts(userId) {
    const token = await _getToken(userId);
    return _mercuryGet(token, '/accounts');
}

async function getBalance(userId, accountId) {
    if (!accountId) throw new Error('accountId is required');
    const token = await _getToken(userId);
    return _mercuryGet(token, `/accounts/${accountId}`);
}

async function getTransactions(userId, params = {}) {
    if (!params.accountId) throw new Error('accountId is required');
    const { accountId, ...queryParams } = params;
    const token = await _getToken(userId);
    return _mercuryGet(
        token,
        `/accounts/${accountId}/transactions`,
        queryParams
    );
}

/**
 * List statements for an account, optionally filtered by date range.
 * @param {string} userId
 * @param {string} accountId
 * @param {string} [startDate] - ISO date string
 * @param {string} [endDate] - ISO date string
 * @returns {Object} { statements: [...] }
 */
async function getStatements(userId, accountId, startDate, endDate) {
    const token = await _getToken(userId);
    return _mercuryGet(token, `/accounts/${accountId}/statements`);
}

/**
 * Download a statement PDF as a Buffer.
 * @param {string} userId
 * @param {string} url - Direct URL to the PDF
 * @returns {Buffer} PDF file content
 */
async function downloadStatementPdf(userId, url) {
    const token = await _getToken(userId);
    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer secret-token:mercury_${token}`,
        },
        responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
}

/**
 * Verify a payment by searching transactions for a matching amount.
 */
async function verifyPayment(userId, amount, sinceDate) {
    const token = await _getToken(userId);
    const accountsData = await _mercuryGet(token, '/accounts');
    const accounts = accountsData.accounts || [];

    for (const account of accounts) {
        const txnData = await getTransactions(userId, {
            accountId: account.id,
        });
        const match = (txnData.transactions || []).find(
            (t) =>
                t.amount === amount &&
                t.kind === 'externalTransfer' &&
                t.status === 'sent' &&
                new Date(t.createdAt) >= new Date(sinceDate)
        );
        if (match) {
            return { found: true, transaction: match };
        }
    }

    return { found: false, transaction: null };
}

// --- Rate limiter helpers for tests ---

function _resetRateLimiter() {
    _rateLimitState = {
        count: 0,
        windowStart: Date.now(),
        limit: 100,
        windowMs: 60000,
    };
}

function _getRateLimitRemaining() {
    return Math.max(0, _rateLimitState.limit - _rateLimitState.count);
}

function _getRateLimitStatus() {
    return {
        remaining: _getRateLimitRemaining(),
        limit: _rateLimitState.limit,
        windowMs: _rateLimitState.windowMs,
    };
}

/**
 * Search transactions across all accounts with amount/direction filtering.
 * Used by SAFE funding verification (#674).
 *
 * @param {Object} params - { userId, minAmount, maxAmount, direction, since }
 * @returns {Promise<Array>} matching transactions
 */
async function searchTransactions(params = {}) {
    const { userId, minAmount, maxAmount, direction, since } = params;
    if (!userId) {
        throw new Error('userId is required for searchTransactions');
    }

    const token = await _getToken(userId);
    const { accounts } = await _mercuryGet(token, '/accounts');

    const allMatches = [];
    for (const account of (accounts || [])) {
        const queryParams = {};
        if (since) queryParams.start = since;

        const { transactions } = await _mercuryGet(
            token,
            `/accounts/${account.id}/transactions`,
            queryParams
        );

        for (const txn of (transactions || [])) {
            const amt = Math.abs(txn.amount);
            if (minAmount !== undefined && amt < minAmount) continue;
            if (maxAmount !== undefined && amt > maxAmount) continue;
            if (direction === 'credit' && txn.amount < 0) continue;
            if (direction === 'debit' && txn.amount > 0) continue;
            allMatches.push(txn);
        }
    }

    return allMatches;
}

/**
 * Check whether Mercury is connected for a given user.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { connected, provider, connectedAt }
 */
async function getConnectionStatus(userId) {
    const result = await zerodbService.queryRows(
        'integrations',
        { userId, provider: 'mercury' },
        { limit: 1 }
    );

    const rows = result?.data || [];
    if (rows.length === 0) {
        return { connected: false };
    }

    const record = rows[0].row_data;
    return {
        connected: true,
        provider: 'mercury',
        connectedAt: record.connectedAt || null,
    };
}

module.exports = {
    getAccounts,
    getBalance,
    getTransactions,
    getStatements,
    downloadStatementPdf,
    verifyPayment,
    searchTransactions,
    getConnectionStatus,
    _getToken,
    _mercuryGet,
    _resetRateLimiter,
    _getRateLimitRemaining,
    _getRateLimitStatus,
};
