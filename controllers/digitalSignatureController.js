/**
 * Digital Signature Controller
 * Issue #100: Build Digital Signature Workflow
 *
 * API controller for managing digital signature workflows including:
 * - CRUD operations for signature requests
 * - Signing operations (view, sign, decline)
 * - Status and audit trail retrieval
 * - Webhook handling for external providers
 */
const databaseAdapter = require('../services/databaseAdapter');
const DigitalSignatureService = require('../services/digitalSignatureService');

/**
 * Create a new signature request
 */
exports.createSignatureRequest = async (req, res) => {
  try {
    req.body.companyId = req.user?.companyId || req.body.companyId;
    const requestData = {
      ...req.body,
      createdBy: req.user?._id || req.body.createdBy
    };

    const signatureRequest = await DigitalSignatureService.createSignatureRequest(requestData);
    res.status(201).json(signatureRequest);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all signature requests with optional filters
 */
exports.getSignatureRequests = async (req, res) => {
  try {
    const { status, documentId, documentType, provider } = req.query;
    const companyId = req.query.companyId || req.user?.companyId;
    const query = {};

    if (companyId) query.companyId = companyId;
    if (status) query.status = status;
    if (documentId) query.documentId = documentId;
    if (documentType) query.documentType = documentType;
    if (provider) query.provider = provider;

    const requests = await databaseAdapter.find('DigitalSignature', query);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get signature request by ID
 */
exports.getSignatureRequestById = async (req, res) => {
  try {
    const request = await databaseAdapter.findById('DigitalSignature', req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Signature request not found' });
    }
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update signature request
 */
exports.updateSignatureRequest = async (req, res) => {
  try {
    const request = await databaseAdapter.findByIdAndUpdate(
      'DigitalSignature',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!request) {
      return res.status(404).json({ message: 'Signature request not found' });
    }
    res.status(200).json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete signature request
 */
exports.deleteSignatureRequest = async (req, res) => {
  try {
    const request = await databaseAdapter.findByIdAndDelete('DigitalSignature', req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Signature request not found' });
    }
    res.status(200).json({ message: 'Signature request deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Send signature request to signers
 */
exports.sendSignatureRequest = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const result = await DigitalSignatureService.sendSignatureRequest(req.params.id, userId);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Record a view event for a signer
 */
exports.recordView = async (req, res) => {
  try {
    const { signerEmail } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'] || '';

    const result = await DigitalSignatureService.recordView(
      req.params.id,
      signerEmail,
      ipAddress,
      userAgent
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Record a signature
 */
exports.recordSignature = async (req, res) => {
  try {
    const { signerEmail, signatureData } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'] || '';

    const result = await DigitalSignatureService.recordSignature(
      req.params.id,
      signerEmail,
      signatureData,
      ipAddress,
      userAgent
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Record a decline
 */
exports.recordDecline = async (req, res) => {
  try {
    const { signerEmail, reason } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers?.['user-agent'] || '';

    const result = await DigitalSignatureService.recordDecline(
      req.params.id,
      signerEmail,
      reason,
      ipAddress,
      userAgent
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Cancel a signature request
 */
exports.cancelSignatureRequest = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { reason } = req.body;

    const result = await DigitalSignatureService.cancelSignatureRequest(
      req.params.id,
      userId,
      reason
    );

    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Send a reminder to a signer
 */
exports.sendReminder = async (req, res) => {
  try {
    const { signerEmail } = req.body;
    const userId = req.user?._id || req.body.userId;

    const result = await DigitalSignatureService.sendReminder(
      req.params.id,
      signerEmail,
      userId
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get a signing link for a signer
 */
exports.getSigningLink = async (req, res) => {
  try {
    const { signerEmail } = req.query;

    const result = await DigitalSignatureService.generateSigningLink(
      req.params.id,
      signerEmail
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get signature status with progress
 */
exports.getSignatureStatus = async (req, res) => {
  try {
    const result = await DigitalSignatureService.getSignatureStatus(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get audit trail for a signature request
 */
exports.getAuditTrail = async (req, res) => {
  try {
    const auditTrail = await DigitalSignatureService.getAuditTrail(req.params.id);
    res.status(200).json({
      signatureId: req.params.id,
      auditTrail
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle webhook callback from external provider
 */
exports.handleProviderCallback = async (req, res) => {
  try {
    const result = await DigitalSignatureService.handleProviderCallback(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get signature requests by signer email
 */
exports.getRequestsBySignerEmail = async (req, res) => {
  try {
    const { email, status } = req.query;

    const query = { 'signers.email': email };
    if (status) {
      query['signers.status'] = status;
    }

    const requests = await databaseAdapter.find('DigitalSignature', query);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Void a signature request
 */
exports.voidSignatureRequest = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.userId;
    const { reason } = req.body;

    const request = await databaseAdapter.findById('DigitalSignature', req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Signature request not found' });
    }

    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'voided',
        timestamp: new Date(),
        userId,
        reason
      }
    ];

    const result = await databaseAdapter.findByIdAndUpdate(
      'DigitalSignature',
      req.params.id,
      {
        status: 'voided',
        voidedAt: new Date(),
        auditTrail,
        updatedBy: userId
      },
      { new: true }
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending signature requests due for expiration
 */
exports.getExpiringRequests = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + parseInt(days));

    const requests = await databaseAdapter.find('DigitalSignature', {
      status: { $in: ['sent', 'in_progress'] },
      expiresAt: { $lte: cutoffDate, $gt: new Date() }
    });

    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Process expired signature requests
 */
exports.processExpiredRequests = async (req, res) => {
  try {
    const result = await DigitalSignatureService.expireSignatureRequests();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download signed document
 */
exports.downloadSignedDocument = async (req, res) => {
  try {
    const request = await databaseAdapter.findById('DigitalSignature', req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Signature request not found' });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({ message: 'Document not yet fully signed' });
    }

    if (!request.signedDocument?.url) {
      return res.status(404).json({ message: 'Signed document not available' });
    }

    // Add audit event for download
    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'document_downloaded',
        timestamp: new Date(),
        userId: req.user?._id,
        ipAddress: req.ip
      }
    ];

    await databaseAdapter.findByIdAndUpdate('DigitalSignature', req.params.id, { auditTrail });

    res.status(200).json({
      downloadUrl: request.signedDocument.url,
      filename: request.signedDocument.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
