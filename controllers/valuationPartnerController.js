/**
 * ValuationPartner Controller
 * Feature: Issue #61 - Implement Valuation Specialist Integration
 *
 * Handles API endpoints for valuation partner management.
 */
const ValuationPartner = require('../models/ValuationPartner');

// Create a new partner
exports.createPartner = async (req, res) => {
  try {
    const {
      companyId,
      name,
      legalName,
      type,
      contacts,
      address,
      qualifications,
      servicePackages,
      notes,
      tags,
      metadata
    } = req.body;

    const partner = new ValuationPartner({
      companyId,
      name,
      legalName,
      type,
      contacts,
      address,
      qualifications,
      servicePackages,
      notes,
      tags,
      metadata,
      status: 'pending_approval',
      createdBy: req.user._id
    });

    await partner.save();

    res.status(201).json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all partners
exports.getPartners = async (req, res) => {
  try {
    const { companyId, type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (companyId) {
      query.$or = [
        { companyId },
        { companyId: null }
      ];
    }
    if (type) query.type = type;
    if (status) query.status = status;

    const partners = await ValuationPartner.find(query)
      .populate('companyId', 'name')
      .sort({ 'qualifications.rating': -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ValuationPartner.countDocuments(query);

    res.json({
      success: true,
      data: partners,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a single partner
exports.getPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await ValuationPartner.findOne({ partnerId })
      .populate('companyId', 'name')
      .populate('createdBy', 'firstName lastName email')
      .populate('communications.createdBy', 'firstName lastName')
      .populate('scheduledCalls.createdBy', 'firstName lastName');

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update a partner
exports.updatePartner = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const updates = req.body;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    // Prevent certain fields from being updated directly
    delete updates.partnerId;
    delete updates.communications;
    delete updates.scheduledCalls;
    delete updates.metrics;

    Object.assign(partner, updates);
    partner.updatedBy = req.user._id;
    await partner.save();

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Add contact to partner
exports.addContact = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const contactData = req.body;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    await partner.addContact(contactData, req.user._id);

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Set primary contact
exports.setPrimaryContact = async (req, res) => {
  try {
    const { partnerId, contactId } = req.params;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    await partner.setPrimaryContact(contactId, req.user._id);

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Schedule a call
exports.scheduleCall = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const callData = req.body;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const call = await partner.scheduleCall(callData, req.user._id);

    res.status(201).json({
      success: true,
      data: {
        partner: {
          partnerId: partner.partnerId,
          name: partner.name
        },
        call
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update call status
exports.updateCallStatus = async (req, res) => {
  try {
    const { partnerId, callId } = req.params;
    const { status, ...data } = req.body;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    await partner.updateCallStatus(callId, status, req.user._id, data);

    res.json({
      success: true,
      data: partner.scheduledCalls.id(callId)
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get upcoming calls
exports.getUpcomingCalls = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    res.json({
      success: true,
      data: partner.upcomingCalls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Add communication
exports.addCommunication = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const commData = req.body;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    await partner.addCommunication(commData, req.user._id);

    res.json({
      success: true,
      data: partner.communications[partner.communications.length - 1]
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get communication history
exports.getCommunicationHistory = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    const partner = await ValuationPartner.findOne({ partnerId })
      .populate('communications.createdBy', 'firstName lastName');

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    let communications = partner.communications;

    if (type) {
      communications = communications.filter(c => c.type === type);
    }

    // Sort by date descending
    communications.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedComms = communications.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginatedComms,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: communications.length,
        pages: Math.ceil(communications.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Activate partner
exports.activatePartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    await partner.activate(req.user._id);

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Deactivate partner
exports.deactivatePartner = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { reason } = req.body;

    const partner = await ValuationPartner.findOne({ partnerId });
    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    await partner.deactivate(req.user._id, reason);

    res.json({
      success: true,
      data: partner
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get partner summary
exports.getPartnerSummary = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const summary = await ValuationPartner.getPartnerSummary(partnerId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(error.message === 'Partner not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

// Search partners
exports.searchPartners = async (req, res) => {
  try {
    const { type, minRating, specialization, maxTurnaround } = req.query;

    const partners = await ValuationPartner.searchPartners({
      type,
      minRating: minRating ? parseFloat(minRating) : undefined,
      specialization,
      maxTurnaround: maxTurnaround ? parseInt(maxTurnaround) : undefined
    });

    res.json({
      success: true,
      data: partners,
      count: partners.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get active partners for a company
exports.getActivePartners = async (req, res) => {
  try {
    const { companyId } = req.params;

    const partners = await ValuationPartner.findActive(companyId);

    res.json({
      success: true,
      data: partners,
      count: partners.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
