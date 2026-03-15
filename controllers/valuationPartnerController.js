/**
 * ValuationPartner Controller
 * Feature: Issue #61 - Implement Valuation Specialist Integration
 *
 * Handles API endpoints for valuation partner management.
 * Migrated to ZeroDB - no Mongoose patterns (no new Model(), .save(), .populate())
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

    const partner = await ValuationPartner.create({
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
      createdBy: req.user?.userId
    });

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
    if (type) query.type = type;
    if (status) query.status = status;

    let allPartners;
    if (companyId) {
      // ZeroDB doesn't support $or; fetch both and merge
      const companyPartners = await ValuationPartner.find({ ...query, companyId });
      const globalPartners = await ValuationPartner.find({ ...query, companyId: null });
      allPartners = [...companyPartners, ...globalPartners];
    } else {
      allPartners = await ValuationPartner.find(query);
    }

    // Sort by rating descending, then name ascending
    allPartners.sort((a, b) => {
      const ratingDiff = (b.qualifications?.rating || 0) - (a.qualifications?.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Paginate in-memory
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const partners = allPartners.slice(startIndex, startIndex + limitNum);
    const total = allPartners.length;

    res.json({
      success: true,
      data: partners,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
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

    const partner = await ValuationPartner.findOne({ partnerId });

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
    const updates = { ...req.body };

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

    updates.updatedBy = req.user?.userId;

    await ValuationPartner.updateOne({ partnerId }, { $set: updates });
    const updatedPartner = await ValuationPartner.findOne({ partnerId });

    res.json({
      success: true,
      data: updatedPartner
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

    const updatedPartner = await ValuationPartner.addContact(partnerId, contactData, req.user?.userId);

    res.json({
      success: true,
      data: updatedPartner
    });
  } catch (error) {
    const statusCode = error.message === 'Partner not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

// Set primary contact
exports.setPrimaryContact = async (req, res) => {
  try {
    const { partnerId, contactId } = req.params;

    const updatedPartner = await ValuationPartner.setPrimaryContact(partnerId, contactId, req.user?.userId);

    res.json({
      success: true,
      data: updatedPartner
    });
  } catch (error) {
    const statusCode = error.message === 'Partner not found' ? 404 : 400;
    res.status(statusCode).json({
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

    const call = await ValuationPartner.scheduleCall(partnerId, callData, req.user?.userId);

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

    const updatedPartner = await ValuationPartner.updateCallStatus(partnerId, callId, status, req.user?.userId, data);

    // Find the specific call from the updated partner
    const call = (updatedPartner.scheduledCalls || []).find(c => c._id === callId);

    res.json({
      success: true,
      data: call || updatedPartner
    });
  } catch (error) {
    const statusCode = error.message === 'Partner not found' || error.message === 'Call not found' ? 404 : 400;
    res.status(statusCode).json({
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

    const upcomingCalls = ValuationPartner.getUpcomingCalls(partner);

    res.json({
      success: true,
      data: upcomingCalls
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

    const updatedPartner = await ValuationPartner.addCommunication(partnerId, commData, req.user?.userId);

    // Return the most recently added communication
    const communications = updatedPartner.communications || [];
    const latestComm = communications[communications.length - 1];

    res.json({
      success: true,
      data: latestComm || updatedPartner
    });
  } catch (error) {
    const statusCode = error.message === 'Partner not found' ? 404 : 400;
    res.status(statusCode).json({
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

    const partner = await ValuationPartner.findOne({ partnerId });

    if (!partner) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    let communications = partner.communications || [];

    if (type) {
      communications = communications.filter(c => c.type === type);
    }

    // Sort by date descending
    communications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedComms = communications.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: paginatedComms,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: communications.length,
        pages: Math.ceil(communications.length / limitNum)
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

    const updatedPartner = await ValuationPartner.activate(partnerId, req.user?.userId);

    res.json({
      success: true,
      data: updatedPartner
    });
  } catch (error) {
    const statusCode = error.message === 'Partner not found' ? 404 : 400;
    res.status(statusCode).json({
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

    const updatedPartner = await ValuationPartner.deactivate(partnerId, req.user?.userId, reason);

    res.json({
      success: true,
      data: updatedPartner
    });
  } catch (error) {
    const statusCode = error.message === 'Partner not found' ? 404 : 400;
    res.status(statusCode).json({
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
