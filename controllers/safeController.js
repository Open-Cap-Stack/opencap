/**
 * SAFE Controller
 * Feature: Issue #64, #66, #68 - SAFE Management
 */
const SAFE = require('../models/SAFE');
const SignatureRequest = require('../models/SignatureRequest');
const SAFEConversion = require('../models/SAFEConversion');
const SAFEConversionService = require('../services/safeConversionService');

/**
 * Normalize safeType to use hyphen-format regardless of how it was stored in DB.
 * Handles legacy underscore variants (e.g. "post_money" -> "post-money").
 */
function normalizeSafeType(safe) {
  if (!safe || !safe.safeType) return safe;
  const typeMap = {
    post_money: 'post-money',
    pre_money: 'pre-money'
  };
  return {
    ...safe,
    safeType: typeMap[safe.safeType] || safe.safeType
  };
}

// Create a new SAFE
exports.createSAFE = async (req, res) => {
  try {
    const {
      companyId,
      investorId,
      investorName,
      investorEmail,
      investorType,
      investmentAmount,
      currency,
      safeType,
      valuationCap,
      discountRate,
      proRataRights,
      expiresAt,
      notes,
      tags,
      metadata
    } = req.body;

    const safe = await SAFE.create({
      companyId,
      investorId,
      investorName,
      investorEmail,
      investorType,
      investmentAmount,
      currency,
      safeType,
      valuationCap,
      discountRate,
      proRataRights,
      expiresAt,
      notes,
      tags,
      metadata,
      createdBy: req.user._id,
      statusHistory: [{
        status: 'draft',
        changedAt: new Date(),
        changedBy: req.user._id,
        reason: 'SAFE created'
      }]
    });

    res.status(201).json({
      success: true,
      data: safe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all SAFEs for a company
exports.getCompanySAFEs = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { companyId };
    if (status) query.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const safes = await SAFE.find(query, {
      sort: { createdAt: -1 },
      skip: (pageNum - 1) * limitNum,
      limit: limitNum
    });

    const total = await SAFE.countDocuments(query);

    res.json({
      success: true,
      data: safes.map(normalizeSafeType),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    // ZeroDB may return 422 if the table filter is rejected (e.g., schema mismatch);
    // treat as empty list so the frontend page loads gracefully
    const status = error?.response?.status;
    if (status === 422 || status === 429) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a single SAFE
exports.getSAFE = async (req, res) => {
  try {
    const { safeId } = req.params;

    const safe = await SAFE.findOne({ safeId });

    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    res.json({
      success: true,
      data: normalizeSafeType(safe)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update a SAFE
exports.updateSAFE = async (req, res) => {
  try {
    const { safeId } = req.params;
    const updates = { ...req.body };

    const safe = await SAFE.findOne({ safeId });
    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    // Only allow updates in draft status
    if (safe.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Can only update SAFEs in draft status'
      });
    }

    // Prevent status changes through this endpoint
    delete updates.status;
    delete updates.statusHistory;

    updates.updatedBy = req.user._id;

    await SAFE.updateOne({ safeId }, { $set: updates });
    const updatedSafe = await SAFE.findOne({ safeId });

    res.json({
      success: true,
      data: updatedSafe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Send SAFE for signatures
exports.sendSAFE = async (req, res) => {
  try {
    const { safeId } = req.params;
    const { message } = req.body;

    const safe = await SAFE.findOne({ safeId });

    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    if (!SAFE.canTransitionTo(safe.status, 'sent')) {
      return res.status(400).json({
        success: false,
        error: `Cannot send SAFE in ${safe.status} status`
      });
    }

    // Create signature request
    const signatureRequest = await SignatureRequest.create({
      documentType: 'safe',
      documentId: safe._id,
      documentModel: 'SAFE',
      companyId: safe.companyId,
      title: `SAFE Agreement - ${safe.investorName}`,
      message,
      signers: [
        {
          name: safe.investorName,
          email: safe.investorEmail,
          role: 'investor',
          order: 1
        },
        {
          signerId: req.user._id,
          name: req.user.displayName || `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
          role: 'company_representative',
          order: 2
        }
      ],
      createdBy: req.user._id
    });

    // Send signature request to signers
    await SignatureRequest.send(signatureRequest._id, req.user._id);

    // Update SAFE status
    const updatedSafe = await SAFE.transitionTo(safeId, 'sent', req.user._id, 'Sent for signatures');

    res.json({
      success: true,
      data: {
        safe: updatedSafe,
        signatureRequest
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Record investor signature
exports.recordInvestorSignature = async (req, res) => {
  try {
    const { safeId } = req.params;
    const { signatureData, signerName, signerEmail, signerTitle } = req.body;

    const safe = await SAFE.findOne({ safeId });
    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    const updatedSafe = await SAFE.addInvestorSignature(safeId, {
      signerName,
      signerEmail,
      signerTitle,
      signatureData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, req.user?._id);

    res.json({
      success: true,
      data: updatedSafe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Record company signature
exports.recordCompanySignature = async (req, res) => {
  try {
    const { safeId } = req.params;
    const { signatureData, signerName, signerEmail, signerTitle } = req.body;

    const safe = await SAFE.findOne({ safeId });
    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    const updatedSafe = await SAFE.addCompanySignature(safeId, {
      signerId: req.user._id,
      signerName: signerName || req.user.displayName,
      signerEmail: signerEmail || req.user.email,
      signerTitle,
      signatureData,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, req.user._id);

    res.json({
      success: true,
      data: updatedSafe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Mark SAFE as funded
exports.markFunded = async (req, res) => {
  try {
    const { safeId } = req.params;
    const { fundedAmount, fundedDate, notes } = req.body;

    const safe = await SAFE.findOne({ safeId });
    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    if (!SAFE.canTransitionTo(safe.status, 'funded')) {
      return res.status(400).json({
        success: false,
        error: `Cannot mark as funded from ${safe.status} status`
      });
    }

    const updatedSafe = await SAFE.transitionTo(safeId, 'funded', req.user._id, notes || 'Investment received', {
      fundedAmount: fundedAmount || safe.investmentAmount,
      fundedDate: fundedDate || new Date()
    });

    res.json({
      success: true,
      data: updatedSafe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Cancel a SAFE
exports.cancelSAFE = async (req, res) => {
  try {
    const { safeId } = req.params;
    const { reason } = req.body;

    const safe = await SAFE.findOne({ safeId });
    if (!safe) {
      return res.status(404).json({
        success: false,
        error: 'SAFE not found'
      });
    }

    if (!SAFE.canTransitionTo(safe.status, 'cancelled')) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel SAFE in ${safe.status} status`
      });
    }

    const updatedSafe = await SAFE.transitionTo(safeId, 'cancelled', req.user._id, reason || 'Cancelled');

    res.json({
      success: true,
      data: updatedSafe
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Preview conversion
exports.previewConversion = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { roundTerms } = req.body;

    if (!roundTerms || !roundTerms.pricePerShare || !roundTerms.fullyDilutedShares) {
      return res.status(400).json({
        success: false,
        error: 'Round terms with pricePerShare and fullyDilutedShares required'
      });
    }

    const preview = await SAFEConversionService.previewRoundConversions(companyId, roundTerms);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Create conversions for a funding round
exports.createConversions = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { fundingRoundId, roundTerms, shareClassId } = req.body;

    const result = await SAFEConversionService.createRoundConversions(
      companyId,
      fundingRoundId,
      roundTerms,
      shareClassId,
      req.user._id
    );

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Execute a conversion
exports.executeConversion = async (req, res) => {
  try {
    const { conversionId } = req.params;

    const conversion = await SAFEConversionService.executeConversion(
      conversionId,
      req.user._id
    );

    res.json({
      success: true,
      data: conversion
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get company SAFE summary
exports.getCompanySummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [safes, totalFunded, pendingConversion] = await Promise.all([
      SAFE.find({ companyId }),
      SAFE.getTotalFundedAmount(companyId),
      SAFE.getPendingConversion(companyId)
    ]);

    const summary = {
      total: safes.length,
      byStatus: {},
      totalInvestment: 0,
      totalFunded,
      pendingConversionCount: pendingConversion.length,
      pendingConversionAmount: pendingConversion.reduce((sum, s) => sum + s.investmentAmount, 0)
    };

    for (const safe of safes) {
      summary.byStatus[safe.status] = (summary.byStatus[safe.status] || 0) + 1;
      summary.totalInvestment += safe.investmentAmount;
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
