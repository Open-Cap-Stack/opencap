/**
 * EmailTracking Controller
 *
 * Issue #87: Implement Email Delivery Tracking
 *
 * Controller for email tracking API endpoints including:
 * - CRUD operations for email tracking records
 * - Pixel and click tracking endpoints
 * - Webhook handlers for email providers
 * - Analytics and reporting endpoints
 * - Suppression list management
 */

const emailTrackingService = require('../services/emailTrackingService');

// Transparent 1x1 GIF pixel for open tracking
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Create a new email tracking record
 * POST /api/v1/email-tracking
 */
exports.createEmailTracking = async (req, res) => {
  try {
    const record = await emailTrackingService.createEmailRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating email tracking record:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get email tracking record by ID
 * GET /api/v1/email-tracking/:id
 */
exports.getEmailTracking = async (req, res) => {
  try {
    const record = await emailTrackingService.getEmailRecord(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Email tracking record not found' });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching email tracking record:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get email tracking record by message ID
 * GET /api/v1/email-tracking/message/:messageId
 */
exports.getEmailTrackingByMessageId = async (req, res) => {
  try {
    const record = await emailTrackingService.getEmailRecordByMessageId(req.params.messageId);
    if (!record) {
      return res.status(404).json({ error: 'Email tracking record not found' });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error('Error fetching email tracking by message ID:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * List email tracking records with filtering
 * GET /api/v1/email-tracking
 */
exports.listEmailTracking = async (req, res) => {
  try {
    const filter = {
      companyId: req.query.companyId,
      status: req.query.status,
      templateId: req.query.templateId,
      recipientEmail: req.query.recipientEmail,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await emailTrackingService.listEmailRecords(filter);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error listing email tracking records:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle pixel tracking (open tracking)
 * GET /api/v1/email-tracking/pixel/:trackingId
 */
exports.handlePixelTracking = async (req, res) => {
  // Always return the pixel, even if tracking fails
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { trackingId } = req.params;
    const openData = {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    // Record open asynchronously (don't wait)
    emailTrackingService.recordOpen(trackingId, openData)
      .catch(err => console.error('Error recording email open:', err));

  } catch (error) {
    console.error('Error in pixel tracking:', error);
  }

  // Always return pixel
  res.status(200).send(TRACKING_PIXEL);
};

/**
 * Handle click tracking
 * GET /api/v1/email-tracking/click/:trackingId
 */
exports.handleClickTracking = async (req, res) => {
  const { trackingId } = req.params;
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const clickData = {
      url: decodeURIComponent(url),
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };

    // Record click asynchronously
    emailTrackingService.recordClick(trackingId, clickData)
      .catch(err => console.error('Error recording email click:', err));

  } catch (error) {
    console.error('Error in click tracking:', error);
  }

  // Always redirect to original URL
  res.redirect(302, decodeURIComponent(url));
};

/**
 * Handle webhooks from email providers
 * POST /api/v1/email-tracking/webhook/:provider
 */
exports.handleWebhook = async (req, res) => {
  const { provider } = req.params;
  const supportedProviders = ['sendgrid', 'mailgun', 'ses', 'postmark', 'sparkpost'];

  if (!supportedProviders.includes(provider)) {
    return res.status(400).json({ error: `Unsupported provider: ${provider}` });
  }

  try {
    // Parse webhook payload based on provider
    const events = parseWebhookPayload(provider, req.body);

    // Process each event
    const results = await Promise.all(
      events.map(event => emailTrackingService.processWebhook({
        provider,
        ...event
      }))
    );

    res.status(200).json({
      success: true,
      processed: results.filter(r => r.processed).length,
      total: results.length
    });
  } catch (error) {
    console.error(`Error processing ${provider} webhook:`, error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get email analytics
 * GET /api/v1/email-tracking/analytics
 */
exports.getAnalytics = async (req, res) => {
  try {
    const { companyId, startDate, endDate, groupBy } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const options = {};
    if (groupBy) options.groupBy = groupBy;

    const analytics = await emailTrackingService.getAnalytics(companyId, dateRange, options);
    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching email analytics:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get engagement report
 * GET /api/v1/email-tracking/engagement
 */
exports.getEngagementReport = async (req, res) => {
  try {
    const { companyId } = req.query;
    const report = await emailTrackingService.getEngagementReport(companyId);
    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching engagement report:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get bounced emails
 * GET /api/v1/email-tracking/bounced
 */
exports.getBouncedEmails = async (req, res) => {
  try {
    const { companyId } = req.query;
    const bounced = await emailTrackingService.getBouncedEmails(companyId);
    res.status(200).json(bounced);
  } catch (error) {
    console.error('Error fetching bounced emails:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get suppressed emails
 * GET /api/v1/email-tracking/suppressed
 */
exports.getSuppressedEmails = async (req, res) => {
  try {
    const { companyId } = req.query;
    const suppressed = await emailTrackingService.getSuppressedEmails(companyId);
    res.status(200).json(suppressed);
  } catch (error) {
    console.error('Error fetching suppressed emails:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check if email is suppressed
 * GET /api/v1/email-tracking/suppression/:email
 */
exports.checkEmailSuppression = async (req, res) => {
  try {
    const { email } = req.params;
    const suppressed = await emailTrackingService.isEmailSuppressed(email);
    res.status(200).json({ email, suppressed });
  } catch (error) {
    console.error('Error checking email suppression:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remove email from suppression list
 * DELETE /api/v1/email-tracking/suppression/:email
 */
exports.removeSuppression = async (req, res) => {
  try {
    const { email } = req.params;
    const result = await emailTrackingService.removeSuppression(email);

    if (!result) {
      return res.status(404).json({ error: 'Email not found in suppression list' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error removing email suppression:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Parse webhook payload based on provider
 * @param {string} provider - Email provider
 * @param {Object} payload - Raw webhook payload
 * @returns {Array} Normalized events
 */
function parseWebhookPayload(provider, payload) {
  switch (provider) {
    case 'sendgrid':
      // SendGrid sends an array of events
      return (Array.isArray(payload) ? payload : [payload]).map(event => ({
        event: event.event,
        messageId: event.sg_message_id?.split('.')[0] || event.sg_message_id,
        timestamp: event.timestamp,
        ip: event.ip,
        userAgent: event.useragent,
        url: event.url,
        bounceType: event.type === 'bounce' ? (event.bounce_classification?.includes('Invalid') ? 'hard' : 'soft') : null,
        reason: event.reason
      }));

    case 'mailgun':
      // Mailgun sends event-data object
      const eventData = payload['event-data'] || payload;
      return [{
        event: eventData.event,
        messageId: eventData.message?.headers?.['message-id'],
        timestamp: Math.floor(eventData.timestamp),
        ip: eventData['client-info']?.['client-ip'],
        userAgent: eventData['client-info']?.['user-agent'],
        url: eventData.url,
        bounceType: eventData.severity === 'permanent' ? 'hard' : 'soft',
        reason: eventData['delivery-status']?.description
      }];

    case 'ses':
      // AWS SES notification format
      const notification = payload.Type === 'Notification' ? JSON.parse(payload.Message) : payload;
      const eventType = notification.notificationType || notification.eventType;
      return [{
        event: eventType?.toLowerCase(),
        messageId: notification.mail?.messageId,
        timestamp: new Date(notification.mail?.timestamp).getTime() / 1000,
        bounceType: notification.bounce?.bounceType === 'Permanent' ? 'hard' : 'soft',
        reason: notification.bounce?.bouncedRecipients?.[0]?.diagnosticCode
      }];

    case 'postmark':
      return [{
        event: payload.RecordType?.toLowerCase(),
        messageId: payload.MessageID,
        timestamp: new Date(payload.DeliveredAt || payload.BouncedAt).getTime() / 1000,
        bounceType: payload.Type === 'HardBounce' ? 'hard' : 'soft',
        reason: payload.Description
      }];

    case 'sparkpost':
      return (payload.results || [payload]).map(result => ({
        event: result.type,
        messageId: result.transmission_id,
        timestamp: new Date(result.timestamp).getTime() / 1000,
        bounceType: result.bounce_class >= 10 && result.bounce_class <= 29 ? 'hard' : 'soft',
        reason: result.reason
      }));

    default:
      return [payload];
  }
}
