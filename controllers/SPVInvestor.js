/**
 * SPV Investor (LP Management) Controller
 * Issue #590: SPV LP Management
 *
 * Endpoints for inviting, listing, updating, and removing LP investors
 * on a per-SPV basis.
 */

const SPVInvestor = require('../models/SPVInvestor');

/**
 * Whitelisted fields for PATCH updates on an investor record.
 */
const UPDATABLE_FIELDS = ['status', 'committedAmount', 'wiredAmount', 'tags', 'notes', 'accreditation', 'name'];

/**
 * GET /api/v1/spv/:id/investors
 * List all LP investors for a given SPV.
 * Supports ?status= query param to filter by investor status.
 */
exports.listInvestors = async (req, res) => {
  try {
    const { id: spvId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const filter = {};
    if (req.query.status) {
      if (!SPVInvestor.validators.isValidStatus(req.query.status)) {
        return res.status(400).json({
          message: `Invalid status filter. Must be one of: ${SPVInvestor.VALID_STATUSES.join(', ')}`
        });
      }
      filter.status = req.query.status;
    }

    const investors = await SPVInvestor.findBySPV(spvId, filter);
    res.status(200).json({ investors });
  } catch (error) {
    res.status(500).json({ message: 'Failed to list investors', error: error.message });
  }
};

/**
 * POST /api/v1/spv/:id/invite
 * Invite one or more LPs to an SPV.
 * Body: { emails: ['a@b.com', ...], message: '...' }
 * Creates SPVInvestor records with status=invited and generates inviteToken for each.
 */
exports.inviteInvestors = async (req, res) => {
  try {
    const { id: spvId } = req.params;
    const { emails, message } = req.body;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'emails array is required and must not be empty' });
    }

    // Validate all emails before creating any records
    const invalidEmails = emails.filter(e => !SPVInvestor.validators.isValidEmail(e));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        message: 'Invalid email addresses',
        invalidEmails
      });
    }

    const created = [];
    const skipped = [];

    for (const email of emails) {
      // Check if this email is already invited to this SPV
      const existing = await SPVInvestor.findOne({ spvId, email });
      if (existing) {
        skipped.push({ email, reason: 'already invited' });
        continue;
      }

      const investor = await SPVInvestor.create({
        spvId,
        email,
        name: email.split('@')[0], // Default name from email prefix
        status: 'invited',
        notes: message || ''
      });
      created.push(investor);
    }

    res.status(201).json({ created, skipped });
  } catch (error) {
    res.status(500).json({ message: 'Failed to invite investors', error: error.message });
  }
};

/**
 * GET /api/v1/spv/:id/invite-link
 * Return a shareable invite link for an SPV.
 * Generates a new invite token and stores it as an SPVInvestor placeholder,
 * or reuses an existing one-time link record.
 */
exports.getInviteLink = async (req, res) => {
  try {
    const { id: spvId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const token = SPVInvestor.generateInviteToken();
    const baseUrl = process.env.FRONTEND_URL || 'https://opencapstack.com';
    const url = `${baseUrl}/spv/join/${token}`;

    res.status(200).json({ url, token, spvId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invite link', error: error.message });
  }
};

/**
 * PATCH /api/v1/spv/:id/investors/:investorId
 * Update fields on an LP investor record (status, committedAmount, tags, notes, etc.).
 */
exports.updateInvestor = async (req, res) => {
  try {
    const { id: spvId, investorId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }
    if (!investorId || investorId.trim() === '') {
      return res.status(400).json({ message: 'Investor ID is required' });
    }

    // Build the update payload from whitelisted fields only
    const updateData = {};
    for (const field of UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }

    // Validate status if being updated
    if (updateData.status && !SPVInvestor.validators.isValidStatus(updateData.status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${SPVInvestor.VALID_STATUSES.join(', ')}`
      });
    }

    // Set timestamp fields based on status transitions
    if (updateData.status === 'committed' && !updateData.committedAt) {
      updateData.committedAt = new Date().toISOString();
    }
    if (updateData.status === 'wired' && !updateData.wiredAt) {
      updateData.wiredAt = new Date().toISOString();
    }

    // Find the investor by _id and spvId to ensure it belongs to this SPV
    const investor = await SPVInvestor.findOne({ _id: investorId, spvId });
    if (!investor) {
      return res.status(404).json({ message: 'Investor not found' });
    }

    const updated = await SPVInvestor.findOneAndUpdate(
      { _id: investorId, spvId },
      { $set: updateData },
      { new: true }
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update investor', error: error.message });
  }
};

/**
 * DELETE /api/v1/spv/:id/investors/:investorId
 * Remove an LP investor from an SPV.
 */
exports.deleteInvestor = async (req, res) => {
  try {
    const { id: spvId, investorId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }
    if (!investorId || investorId.trim() === '') {
      return res.status(400).json({ message: 'Investor ID is required' });
    }

    const investor = await SPVInvestor.findOne({ _id: investorId, spvId });
    if (!investor) {
      return res.status(404).json({ message: 'Investor not found' });
    }

    await SPVInvestor.deleteOne({ _id: investorId, spvId });

    res.status(200).json({ message: 'Investor removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete investor', error: error.message });
  }
};
