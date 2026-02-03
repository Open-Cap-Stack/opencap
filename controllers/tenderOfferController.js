/**
 * TenderOffer Controller
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * API controller for managing tender offers and submissions
 */
const tenderOfferService = require('../services/tenderOfferService');

/**
 * Create a new tender offer
 */
exports.createTenderOffer = async (req, res) => {
  try {
    const offer = await tenderOfferService.createTenderOffer(req.body);
    res.status(201).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get a tender offer by ID
 */
exports.getTenderOffer = async (req, res) => {
  try {
    const offer = await tenderOfferService.getTenderOffer(req.params.id);
    res.status(200).json(offer);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all tender offers with optional filters
 */
exports.getTenderOffers = async (req, res) => {
  try {
    const { companyId, status } = req.query;
    const filters = {};
    if (companyId) filters.companyId = companyId;
    if (status) filters.status = status;

    const offers = await tenderOfferService.getTenderOffers(filters);
    res.status(200).json(offers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a tender offer
 */
exports.updateTenderOffer = async (req, res) => {
  try {
    const offer = await tenderOfferService.updateTenderOffer(req.params.id, req.body);
    res.status(200).json(offer);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete a tender offer
 */
exports.deleteTenderOffer = async (req, res) => {
  try {
    await tenderOfferService.deleteTenderOffer(req.params.id);
    res.status(200).json({ message: 'Tender offer deleted' });
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Publish a tender offer (change status from draft to open)
 */
exports.publishTenderOffer = async (req, res) => {
  try {
    const offer = await tenderOfferService.publishTenderOffer(req.params.id);
    res.status(200).json(offer);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Submit shares to a tender offer
 */
exports.submitTender = async (req, res) => {
  try {
    const submission = await tenderOfferService.submitTender(req.body);
    res.status(201).json(submission);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Withdraw a tender submission
 */
exports.withdrawSubmission = async (req, res) => {
  try {
    const submission = await tenderOfferService.withdrawSubmission(req.params.id);
    res.status(200).json(submission);
  } catch (error) {
    if (error.message === 'Submission not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Close a tender offer
 */
exports.closeTenderOffer = async (req, res) => {
  try {
    const result = await tenderOfferService.closeTenderOffer(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Settle a tender offer
 */
exports.settleOffer = async (req, res) => {
  try {
    const result = await tenderOfferService.settleOffer(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Cancel a tender offer
 */
exports.cancelTenderOffer = async (req, res) => {
  try {
    const offer = await tenderOfferService.cancelTenderOffer(req.params.id);
    res.status(200).json(offer);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all submissions for a tender offer
 */
exports.getSubmissionsForOffer = async (req, res) => {
  try {
    const submissions = await tenderOfferService.getSubmissionsForOffer(req.params.id);
    res.status(200).json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a submission by ID
 */
exports.getSubmission = async (req, res) => {
  try {
    const submission = await tenderOfferService.getSubmission(req.params.id);
    res.status(200).json(submission);
  } catch (error) {
    if (error.message === 'Submission not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get tender offer summary statistics
 */
exports.getOfferSummary = async (req, res) => {
  try {
    const summary = await tenderOfferService.getOfferSummary(req.params.id);
    res.status(200).json(summary);
  } catch (error) {
    if (error.message === 'Tender offer not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
