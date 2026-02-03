/**
 * InvestorCommunication Controller
 * Issue #91: Build Investor Communication System
 *
 * API endpoints for investor communications:
 * - CRUD operations for communications
 * - Send and schedule communications
 * - Investor segmentation
 * - Delivery tracking
 * - Template management
 * - Preference management
 */
const databaseAdapter = require('../services/databaseAdapter');
const investorCommunicationService = require('../services/investorCommunicationService');

/**
 * Create a new investor communication
 */
exports.createCommunication = async (req, res) => {
  const {
    communicationId,
    companyId,
    communicationType,
    subject,
    content,
    htmlContent,
    deliveryChannel,
    segmentation,
    attachments,
    templateId,
    createdBy
  } = req.body;

  // Validate required fields
  if (!companyId || !communicationType || !subject || !content || !createdBy) {
    return res.status(400).json({
      message: 'Missing required fields: companyId, communicationType, subject, content, and createdBy are required'
    });
  }

  try {
    const communicationData = {
      communicationId: communicationId || `INVCOM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase(),
      companyId,
      communicationType,
      subject,
      content,
      htmlContent,
      deliveryChannel: deliveryChannel || 'email',
      segmentation: segmentation || {},
      attachments: attachments || [],
      templateId,
      status: 'draft',
      createdBy
    };

    const savedCommunication = await databaseAdapter.create('InvestorCommunication', communicationData);
    return res.status(201).json(savedCommunication);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get all communications for a company
 */
exports.getCommunications = async (req, res) => {
  const { companyId, communicationType, status, limit, offset } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required' });
  }

  try {
    const query = { companyId };

    if (communicationType) {
      query.communicationType = communicationType;
    }

    if (status) {
      query.status = status;
    }

    const options = {
      sort: { createdAt: -1 }
    };

    if (limit) {
      options.limit = parseInt(limit, 10);
    }

    if (offset) {
      options.skip = parseInt(offset, 10);
    }

    const communications = await databaseAdapter.find('InvestorCommunication', query, options);

    if (communications.length === 0) {
      return res.status(404).json({ message: 'No communications found' });
    }

    return res.status(200).json(communications);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get a communication by ID
 */
exports.getCommunicationById = async (req, res) => {
  const { id } = req.params;

  try {
    const communication = await databaseAdapter.findById('InvestorCommunication', id);

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    return res.status(200).json(communication);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Update a communication
 */
exports.updateCommunication = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Check if communication exists and is not already sent
    const existing = await databaseAdapter.findById('InvestorCommunication', id);

    if (!existing) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    if (existing.status === 'sent' || existing.status === 'delivered') {
      return res.status(400).json({ message: 'Cannot update a communication that has already been sent' });
    }

    const updatedCommunication = await databaseAdapter.findByIdAndUpdate(
      'InvestorCommunication',
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedCommunication);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a communication
 */
exports.deleteCommunication = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if communication exists and is not already sent
    const existing = await databaseAdapter.findById('InvestorCommunication', id);

    if (!existing) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    if (existing.status === 'sent' || existing.status === 'delivered') {
      return res.status(400).json({ message: 'Cannot delete a communication that has already been sent' });
    }

    await databaseAdapter.findByIdAndDelete('InvestorCommunication', id);

    return res.status(200).json({ message: 'Communication deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Send a communication to targeted investors
 */
exports.sendCommunication = async (req, res) => {
  const { id } = req.params;

  try {
    const communication = await databaseAdapter.findById('InvestorCommunication', id);

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    if (communication.status === 'sent' || communication.status === 'delivered') {
      return res.status(400).json({ message: 'Communication has already been sent' });
    }

    // Get targeted investors based on segmentation
    const investors = await investorCommunicationService.segmentInvestors({
      companyId: communication.companyId,
      ...communication.segmentation,
      respectPreferences: true,
      communicationType: communication.communicationType
    });

    if (investors.length === 0) {
      return res.status(400).json({ message: 'No investors match the segmentation criteria' });
    }

    // Initialize delivery tracking
    const deliveryTracking = investors.map(investor => ({
      investorId: investor._id,
      status: 'pending',
      channel: communication.deliveryChannel
    }));

    await databaseAdapter.findByIdAndUpdate(
      'InvestorCommunication',
      id,
      { deliveryTracking },
      { new: true }
    );

    // Send the communication
    const result = await investorCommunicationService.sendCommunication(communication, investors);

    // Update status
    await databaseAdapter.findByIdAndUpdate(
      'InvestorCommunication',
      id,
      {
        status: result.failed === 0 ? 'sent' : 'sent',
        sentAt: new Date()
      },
      { new: true }
    );

    return res.status(200).json({
      success: result.success,
      sent: result.sent,
      failed: result.failed,
      recipientCount: investors.length
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Schedule a communication for future delivery
 */
exports.scheduleCommunication = async (req, res) => {
  const { id } = req.params;
  const { scheduledFor } = req.body;

  if (!scheduledFor) {
    return res.status(400).json({ message: 'scheduledFor is required' });
  }

  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    return res.status(400).json({ message: 'Scheduled time must be in the future' });
  }

  try {
    const communication = await databaseAdapter.findById('InvestorCommunication', id);

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    if (communication.status === 'sent' || communication.status === 'delivered') {
      return res.status(400).json({ message: 'Cannot schedule a communication that has already been sent' });
    }

    const result = await investorCommunicationService.scheduleCommunication(id, scheduledFor);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Segment investors based on criteria
 */
exports.segmentInvestors = async (req, res) => {
  const { companyId, investorTypes, minInvestmentAmount, maxInvestmentAmount, investmentDateFrom, investmentDateTo, investorIds } = req.body;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required' });
  }

  try {
    const investors = await investorCommunicationService.segmentInvestors({
      companyId,
      investorTypes,
      minInvestmentAmount,
      maxInvestmentAmount,
      investmentDateFrom,
      investmentDateTo,
      investorIds
    });

    return res.status(200).json({
      count: investors.length,
      investors
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get delivery status for a communication
 */
exports.getDeliveryStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const communication = await databaseAdapter.findById('InvestorCommunication', id);

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    const status = await investorCommunicationService.getDeliveryStatus(id);

    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Create a communication template
 */
exports.createTemplate = async (req, res) => {
  const {
    templateId,
    companyId,
    name,
    description,
    communicationType,
    subject,
    content,
    htmlContent,
    variables,
    createdBy
  } = req.body;

  // Validate required fields
  if (!companyId || !name || !communicationType || !subject || !content || !createdBy) {
    return res.status(400).json({
      message: 'Missing required fields: companyId, name, communicationType, subject, content, and createdBy are required'
    });
  }

  try {
    const templateData = {
      templateId: templateId || `TPL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase(),
      companyId,
      name,
      description,
      communicationType,
      subject,
      content,
      htmlContent,
      variables: variables || [],
      isActive: true,
      createdBy
    };

    const savedTemplate = await databaseAdapter.create('InvestorCommunicationTemplate', templateData);
    return res.status(201).json(savedTemplate);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get all templates for a company
 */
exports.getTemplates = async (req, res) => {
  const { companyId, communicationType, isActive } = req.query;

  if (!companyId) {
    return res.status(400).json({ message: 'companyId is required' });
  }

  try {
    const query = { companyId };

    if (communicationType) {
      query.communicationType = communicationType;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const templates = await databaseAdapter.find('InvestorCommunicationTemplate', query, {
      sort: { createdAt: -1 }
    });

    return res.status(200).json({
      count: templates.length,
      templates
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get investor preferences
 */
exports.getPreferences = async (req, res) => {
  const { investorId, companyId } = req.params;

  if (!investorId || !companyId) {
    return res.status(400).json({ message: 'investorId and companyId are required' });
  }

  try {
    const preferences = await investorCommunicationService.getInvestorPreferences(investorId, companyId);
    return res.status(200).json(preferences);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Update investor preferences
 */
exports.updatePreferences = async (req, res) => {
  const { investorId, companyId } = req.params;
  const preferences = req.body;

  if (!investorId || !companyId) {
    return res.status(400).json({ message: 'investorId and companyId are required' });
  }

  try {
    const updatedPreferences = await investorCommunicationService.updateInvestorPreferences(
      investorId,
      companyId,
      preferences
    );
    return res.status(200).json(updatedPreferences);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Unsubscribe investor from communications
 */
exports.unsubscribe = async (req, res) => {
  const { investorId, companyId } = req.params;
  const { communicationType } = req.body;

  if (!investorId || !companyId) {
    return res.status(400).json({ message: 'investorId and companyId are required' });
  }

  try {
    const result = await investorCommunicationService.unsubscribe(investorId, companyId, communicationType);
    return res.status(200).json({
      message: communicationType
        ? `Unsubscribed from ${communicationType} communications`
        : 'Unsubscribed from all communications',
      preferences: result
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
