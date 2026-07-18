/**
 * Analytics Service
 * Issue #725: Server-side GA4 event tracking via Measurement Protocol
 *
 * Fires conversion events (sign_up, login, begin_checkout, purchase)
 * server-side so they are reliably tracked even when the frontend
 * cannot fire them (ad-blockers, SSR, webhook-only flows).
 *
 * All methods are fire-and-forget safe — they never throw and never
 * block the caller.
 */

class AnalyticsService {
  constructor() {
    this.measurementId = process.env.GA4_MEASUREMENT_ID || null;
    this.apiSecret = process.env.GA4_API_SECRET || null;
  }

  /**
   * Returns true when both GA4_MEASUREMENT_ID and GA4_API_SECRET are set.
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.measurementId && this.apiSecret);
  }

  /**
   * Send a single event to the GA4 Measurement Protocol endpoint.
   * @param {string} clientId - GA4 client_id (userId works as a fallback)
   * @param {string} eventName - GA4 event name (e.g. 'sign_up')
   * @param {Object} params - Additional event parameters
   * @returns {Promise<boolean>} true if sent successfully, false otherwise
   */
  async trackEvent(clientId, eventName, params = {}) {
    if (!this.isConfigured()) return false;

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

    const body = {
      client_id: clientId,
      events: [{
        name: eventName,
        params: {
          ...params,
          engagement_time_msec: '100'
        }
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error(`Analytics event '${eventName}' failed:`, error.message);
      return false;
    }
  }

  // ── Convenience methods ──────────────────────────────────────────

  /**
   * Track a new user registration.
   * @param {string} userId
   * @param {string} email
   * @param {string} [method='email']
   * @returns {Promise<boolean>}
   */
  async trackSignup(userId, email, method = 'email') {
    return this.trackEvent(userId, 'sign_up', { method, user_id: userId });
  }

  /**
   * Track a successful login.
   * @param {string} userId
   * @param {string} [method='email']
   * @returns {Promise<boolean>}
   */
  async trackLogin(userId, method = 'email') {
    return this.trackEvent(userId, 'login', { method, user_id: userId });
  }

  /**
   * Track beginning of a checkout flow.
   * @param {string} userId
   * @param {string} planId
   * @param {number} value - price in USD
   * @returns {Promise<boolean>}
   */
  async trackBeginCheckout(userId, planId, value) {
    return this.trackEvent(userId, 'begin_checkout', {
      currency: 'USD',
      value,
      items: JSON.stringify([{ item_id: planId, item_name: planId }])
    });
  }

  /**
   * Track a completed purchase / subscription activation.
   * @param {string} userId
   * @param {string} planId
   * @param {number} value - amount in USD
   * @param {string} transactionId - Stripe subscription/session ID
   * @returns {Promise<boolean>}
   */
  async trackPurchase(userId, planId, value, transactionId) {
    return this.trackEvent(userId, 'purchase', {
      transaction_id: transactionId,
      currency: 'USD',
      value,
      items: JSON.stringify([{ item_id: planId, item_name: planId }])
    });
  }
}

module.exports = new AnalyticsService();
