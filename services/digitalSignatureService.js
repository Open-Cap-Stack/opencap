/**
 * Digital Signature Service
 * Issue #100: Build Digital Signature Workflow
 *
 * Service layer for managing digital signature workflows including:
 * - Signature request creation and management
 * - Provider abstraction (DocuSign, HelloSign, internal)
 * - Status tracking and callbacks
 * - Signing link generation
 */
const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

class DigitalSignatureService {
  /**
   * Create a new signature request
   * @param {Object} requestData - Signature request data
   * @returns {Object} Created signature request
   */
  static async createSignatureRequest(requestData) {
    const {
      documentId,
      documentType,
      documentModel,
      companyId,
      title,
      message,
      signers,
      signingOrder,
      provider,
      settings,
      originalDocument,
      createdBy,
      metadata
    } = requestData;

    // Validate required fields
    if (!documentId || !documentType || !companyId || !title || !signers || !createdBy) {
      throw new Error('Validation error: Missing required fields');
    }

    if (!signers.length) {
      throw new Error('Validation error: At least one signer is required');
    }

    // Generate unique signature ID
    const signatureId = `SIG-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Prepare signer data with defaults
    const preparedSigners = signers.map((signer, index) => ({
      signerId: signer.signerId,
      name: signer.name,
      email: signer.email,
      role: signer.role,
      order: signer.order || index + 1,
      status: 'pending',
      remindersSent: 0
    }));

    // Create signature request data
    const signatureData = {
      signatureId,
      documentId,
      documentType,
      documentModel: documentModel || 'Document',
      companyId,
      title,
      message,
      signers: preparedSigners,
      signingOrder: signingOrder || 'parallel',
      status: 'draft',
      provider: provider || 'internal',
      settings: settings || {
        reminderEnabled: true,
        reminderDays: 3,
        maxReminders: 3,
        expirationDays: 30,
        requireInitials: false,
        allowDecline: true
      },
      originalDocument,
      auditTrail: [{
        event: 'created',
        timestamp: new Date(),
        userId: createdBy,
        metadata: { action: 'create' }
      }],
      createdBy,
      metadata,
      requestedAt: new Date()
    };

    // Handle external provider creation
    if (provider && provider !== 'internal') {
      const externalData = await this._createExternalSignatureRequest(provider, signatureData);
      signatureData.externalSignatureId = externalData.externalSignatureId;
      signatureData.externalData = externalData.data;
    }

    return await databaseAdapter.create('DigitalSignature', signatureData);
  }

  /**
   * Send a signature request to signers
   * @param {string} id - Signature request ID
   * @param {string} userId - User ID sending the request
   * @returns {Object} Updated signature request
   */
  static async sendSignatureRequest(id, userId) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    if (request.status !== 'draft') {
      throw new Error('Can only send requests in draft status');
    }

    // Calculate expiration date
    const expirationDays = request.settings?.expirationDays || 30;
    const expiresAt = new Date(Date.now() + (expirationDays * 24 * 60 * 60 * 1000));

    // Update signer statuses
    const updatedSigners = request.signers.map(signer => ({
      ...signer,
      status: signer.status === 'pending' ? 'sent' : signer.status,
      sentAt: signer.status === 'pending' ? new Date() : signer.sentAt
    }));

    // Add audit event
    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'sent',
        timestamp: new Date(),
        userId,
        metadata: { signersCount: updatedSigners.length }
      }
    ];

    // Update request
    return await databaseAdapter.findByIdAndUpdate('DigitalSignature', id, {
      status: 'sent',
      sentAt: new Date(),
      expiresAt,
      signers: updatedSigners,
      auditTrail,
      updatedBy: userId
    }, { new: true });
  }

  /**
   * Record a view event for a signer
   * @param {string} id - Signature request ID
   * @param {string} signerEmail - Signer's email
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @returns {Object} Updated signature request
   */
  static async recordView(id, signerEmail, ipAddress, userAgent) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
    if (signerIndex === -1) {
      throw new Error('Signer not found');
    }

    const signer = request.signers[signerIndex];

    // Only update if not already viewed
    if (!signer.viewedAt) {
      const updatedSigners = [...request.signers];
      updatedSigners[signerIndex] = {
        ...signer,
        status: 'viewed',
        viewedAt: new Date()
      };

      const auditTrail = [
        ...(request.auditTrail || []),
        {
          event: 'viewed',
          timestamp: new Date(),
          signerEmail,
          ipAddress,
          userAgent
        }
      ];

      return await databaseAdapter.findByIdAndUpdate('DigitalSignature', id, {
        signers: updatedSigners,
        auditTrail
      }, { new: true });
    }

    return request;
  }

  /**
   * Record a signature
   * @param {string} id - Signature request ID
   * @param {string} signerEmail - Signer's email
   * @param {Object} signatureData - Signature data (signature image, initials)
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @returns {Object} Updated signature request
   */
  static async recordSignature(id, signerEmail, signatureData, ipAddress, userAgent) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
    if (signerIndex === -1) {
      throw new Error('Signer not found');
    }

    const signer = request.signers[signerIndex];

    if (signer.status === 'signed') {
      throw new Error('Document already signed by this signer');
    }

    // Update signer with signature
    const updatedSigners = [...request.signers];
    updatedSigners[signerIndex] = {
      ...signer,
      status: 'signed',
      signedAt: new Date(),
      signatureData: {
        ...signatureData,
        ipAddress,
        userAgent,
        timestamp: new Date()
      }
    };

    // Check if all signers have signed
    const allSigned = updatedSigners.every(s => s.status === 'signed');

    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'signed',
        timestamp: new Date(),
        signerEmail,
        ipAddress,
        userAgent
      }
    ];

    // Add completed event if all signed
    if (allSigned) {
      auditTrail.push({
        event: 'completed',
        timestamp: new Date(),
        metadata: { totalSigners: updatedSigners.length }
      });
    }

    const updateData = {
      signers: updatedSigners,
      status: allSigned ? 'completed' : 'in_progress',
      auditTrail
    };

    if (allSigned) {
      updateData.completedAt = new Date();
    }

    return await databaseAdapter.findByIdAndUpdate('DigitalSignature', id, updateData, { new: true });
  }

  /**
   * Record a decline
   * @param {string} id - Signature request ID
   * @param {string} signerEmail - Signer's email
   * @param {string} reason - Decline reason
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @returns {Object} Updated signature request
   */
  static async recordDecline(id, signerEmail, reason, ipAddress, userAgent) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
    if (signerIndex === -1) {
      throw new Error('Signer not found');
    }

    const updatedSigners = [...request.signers];
    updatedSigners[signerIndex] = {
      ...request.signers[signerIndex],
      status: 'declined',
      declinedAt: new Date(),
      declineReason: reason
    };

    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'declined',
        timestamp: new Date(),
        signerEmail,
        reason,
        ipAddress,
        userAgent
      }
    ];

    return await databaseAdapter.findByIdAndUpdate('DigitalSignature', id, {
      signers: updatedSigners,
      status: 'declined',
      auditTrail
    }, { new: true });
  }

  /**
   * Cancel a signature request
   * @param {string} id - Signature request ID
   * @param {string} userId - User ID cancelling the request
   * @param {string} reason - Cancellation reason
   * @returns {Object} Updated signature request
   */
  static async cancelSignatureRequest(id, userId, reason) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    if (['completed', 'cancelled', 'voided'].includes(request.status)) {
      throw new Error(`Cannot cancel request in ${request.status} status`);
    }

    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'cancelled',
        timestamp: new Date(),
        userId,
        reason
      }
    ];

    return await databaseAdapter.findByIdAndUpdate('DigitalSignature', id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      auditTrail,
      updatedBy: userId
    }, { new: true });
  }

  /**
   * Expire signature requests that have passed their expiration date
   * @returns {Object} Result with count of expired requests
   */
  static async expireSignatureRequests() {
    const now = new Date();

    // Find all expired requests
    const expiredRequests = await databaseAdapter.find('DigitalSignature', {
      status: { $in: ['sent', 'in_progress'] },
      expiresAt: { $lt: now }
    });

    let expiredCount = 0;

    for (const request of expiredRequests) {
      // Update each signer status
      const updatedSigners = request.signers.map(signer => ({
        ...signer,
        status: ['pending', 'sent', 'viewed'].includes(signer.status) ? 'expired' : signer.status
      }));

      const auditTrail = [
        ...(request.auditTrail || []),
        {
          event: 'expired',
          timestamp: now,
          metadata: { expiresAt: request.expiresAt }
        }
      ];

      await databaseAdapter.findByIdAndUpdate('DigitalSignature', request._id, {
        status: 'expired',
        signers: updatedSigners,
        auditTrail
      });

      expiredCount++;
    }

    return { expiredCount };
  }

  /**
   * Send a reminder to a signer
   * @param {string} id - Signature request ID
   * @param {string} signerEmail - Signer's email
   * @param {string} userId - User ID sending the reminder
   * @returns {Object} Updated signature request
   */
  static async sendReminder(id, signerEmail, userId) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
    if (signerIndex === -1) {
      throw new Error('Signer not found');
    }

    const signer = request.signers[signerIndex];

    if (signer.status === 'signed') {
      throw new Error('Signer has already signed');
    }

    const maxReminders = request.settings?.maxReminders || 3;
    if ((signer.remindersSent || 0) >= maxReminders) {
      throw new Error('Maximum reminders already sent');
    }

    const updatedSigners = [...request.signers];
    updatedSigners[signerIndex] = {
      ...signer,
      remindersSent: (signer.remindersSent || 0) + 1,
      lastReminderAt: new Date()
    };

    const auditTrail = [
      ...(request.auditTrail || []),
      {
        event: 'reminder_sent',
        timestamp: new Date(),
        signerEmail,
        userId,
        metadata: { reminderCount: updatedSigners[signerIndex].remindersSent }
      }
    ];

    return await databaseAdapter.findByIdAndUpdate('DigitalSignature', id, {
      signers: updatedSigners,
      auditTrail
    }, { new: true });
  }

  /**
   * Generate a signing link for a signer
   * @param {string} id - Signature request ID
   * @param {string} signerEmail - Signer's email
   * @returns {Object} Signing link details
   */
  static async generateSigningLink(id, signerEmail) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    const signer = request.signers.find(s => s.email === signerEmail);
    if (!signer) {
      throw new Error('Signer not found');
    }

    // For external providers, return the external signing URL
    if (request.provider !== 'internal' && request.externalData?.signingUrls?.[signerEmail]) {
      return {
        signingUrl: request.externalData.signingUrls[signerEmail],
        provider: request.provider,
        expiresAt: request.expiresAt
      };
    }

    // For internal provider, generate a unique signing token
    const signingToken = uuidv4();
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
    const signingUrl = `${baseUrl}/sign/${request.signatureId}/${signingToken}`;

    return {
      signingUrl,
      provider: 'internal',
      expiresAt: request.expiresAt,
      token: signingToken
    };
  }

  /**
   * Get the status of a signature request
   * @param {string} id - Signature request ID
   * @returns {Object} Status details
   */
  static async getSignatureStatus(id) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    const signedCount = request.signers.filter(s => s.status === 'signed').length;
    const totalSigners = request.signers.length;
    const progress = totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0;

    return {
      signatureId: request.signatureId,
      status: request.status,
      signedCount,
      totalSigners,
      progress,
      signers: request.signers.map(s => ({
        email: s.email,
        name: s.name,
        status: s.status,
        viewedAt: s.viewedAt,
        signedAt: s.signedAt
      })),
      sentAt: request.sentAt,
      expiresAt: request.expiresAt,
      completedAt: request.completedAt
    };
  }

  /**
   * Get the audit trail for a signature request
   * @param {string} id - Signature request ID
   * @returns {Array} Audit trail events
   */
  static async getAuditTrail(id) {
    const request = await databaseAdapter.findById('DigitalSignature', id);

    if (!request) {
      throw new Error('Signature request not found');
    }

    return request.auditTrail || [];
  }

  /**
   * Handle a callback from an external signature provider
   * @param {Object} webhookPayload - Webhook payload from provider
   * @returns {Object} Processing result
   */
  static async handleProviderCallback(webhookPayload) {
    const { type, externalSignatureId, signerEmail, timestamp } = webhookPayload;

    if (!externalSignatureId) {
      throw new Error('Invalid webhook payload: missing externalSignatureId');
    }

    // Find the signature request by external ID
    const request = await databaseAdapter.findOne('DigitalSignature', {
      externalSignatureId
    });

    if (!request) {
      throw new Error('Signature request not found for external ID');
    }

    // Process based on webhook type
    switch (type) {
      case 'signature_completed':
      case 'signer_complete':
        if (signerEmail) {
          await this.recordSignature(
            request._id,
            signerEmail,
            { externalSignature: true, timestamp },
            'external',
            'external_provider'
          );
        }
        break;

      case 'signature_declined':
      case 'signer_declined':
        if (signerEmail) {
          await this.recordDecline(
            request._id,
            signerEmail,
            webhookPayload.reason || 'Declined via external provider',
            'external',
            'external_provider'
          );
        }
        break;

      case 'envelope_completed':
      case 'all_signed':
        // All signers have completed - mark as completed
        await databaseAdapter.findByIdAndUpdate('DigitalSignature', request._id, {
          status: 'completed',
          completedAt: new Date()
        });
        break;

      case 'envelope_voided':
      case 'request_cancelled':
        await databaseAdapter.findByIdAndUpdate('DigitalSignature', request._id, {
          status: 'voided',
          voidedAt: new Date()
        });
        break;

      default:
        // Log unknown event type
        console.log(`Unknown webhook event type: ${type}`);
    }

    return {
      success: true,
      signatureId: request.signatureId,
      processedEvent: type
    };
  }

  /**
   * Create an external signature request with a provider
   * @private
   * @param {string} provider - Provider name
   * @param {Object} signatureData - Signature request data
   * @returns {Object} External provider response
   */
  static async _createExternalSignatureRequest(provider, signatureData) {
    // Provider-specific implementation would go here
    // For now, return mock external ID
    const externalId = `${provider}_${uuidv4().slice(0, 12)}`;

    switch (provider) {
      case 'docusign':
        // DocuSign API integration would go here
        return {
          externalSignatureId: externalId,
          data: {
            envelopeId: externalId,
            provider: 'docusign',
            signingUrls: {}
          }
        };

      case 'hellosign':
        // HelloSign API integration would go here
        return {
          externalSignatureId: externalId,
          data: {
            signatureRequestId: externalId,
            provider: 'hellosign',
            signingUrls: {}
          }
        };

      case 'pandadoc':
        // PandaDoc API integration would go here
        return {
          externalSignatureId: externalId,
          data: {
            documentId: externalId,
            provider: 'pandadoc',
            signingUrls: {}
          }
        };

      default:
        throw new Error(`Unknown signature provider: ${provider}`);
    }
  }
}

module.exports = DigitalSignatureService;
