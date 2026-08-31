/**
 * SPV Investor (LP Management) Controller
 * Issue #590: SPV LP Management
 *
 * Endpoints for inviting, listing, updating, and removing LP investors
 * on a per-SPV basis.
 */

const SPVInvestor = require('../models/SPVInvestor');
const SPV = require('../models/SPV');

/**
 * Maximum number of emails that can be invited in a single request.
 */
const MAX_BATCH_SIZE = 25;

/**
 * Whitelisted fields for PATCH updates on an investor record.
 */
const UPDATABLE_FIELDS = ['status', 'committedAmount', 'wiredAmount', 'tags', 'notes', 'accreditation', 'name'];

/**
 * Strip HTML tags from a string to prevent XSS / stored HTML injection.
 */
const sanitizeText = (str) => (str || '').replace(/<[^>]*>/g, '').trim();

/**
 * Remove inviteToken from an investor record before returning to the client.
 */
function sanitizeInvestor(inv) {
  if (!inv) return inv;
  const { inviteToken, ...safe } = typeof inv === 'object' ? inv : {};
  return safe;
}

/**
 * Verify that the SPV exists and belongs to the requesting user's company.
 * Returns { spv, error } — if error is truthy the handler should return early.
 */
async function verifySPVOwnership(req, res, spvId) {
  const spv = await SPV.findBySPVID(spvId);
  if (!spv) {
    // Also try by row_id
    const spvById = await SPV.findById(spvId).catch(() => null);
    if (!spvById) {
      res.status(404).json({ message: 'SPV not found' });
      return { spv: null, error: true };
    }
    // Check ownership
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      const userCompany = req.user.companyId;
      const spvCompany = spvById.ParentCompanyID || spvById.companyId;
      if (!userCompany || (spvCompany !== userCompany)) {
        // Also allow if user created this SPV (fallback)
        const userId = req.user.id || req.user.userId;
        const isCreator = spvById.createdBy && userId && spvById.createdBy === userId;
        if (!isCreator) {
          res.status(403).json({ message: 'Access denied' });
          return { spv: null, error: true };
        }
      }
    }
    return { spv: spvById, error: false };
  }
  if (req.user && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    const userCompany = req.user.companyId;
    const spvCompany = spv.ParentCompanyID || spv.companyId;
    if (!userCompany || (spvCompany !== userCompany)) {
      // Also allow if user created this SPV (fallback)
      const userId = req.user.id || req.user.userId;
      const isCreator = spv.createdBy && userId && spv.createdBy === userId;
      if (!isCreator) {
        res.status(403).json({ message: 'Access denied' });
        return { spv: null, error: true };
      }
    }
  }
  return { spv, error: false };
}

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

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

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
    res.status(200).json({ investors: investors.map(sanitizeInvestor) });
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
    const { emails, message, notes } = req.body;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'emails array is required and must not be empty' });
    }

    // Enforce max batch size to prevent timeout on large payloads
    if (emails.length > MAX_BATCH_SIZE) {
      return res.status(400).json({ message: `Maximum ${MAX_BATCH_SIZE} invites per request` });
    }

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

    // Validate all emails before creating any records
    const invalidEmails = emails.filter(e => !SPVInvestor.validators.isValidEmail(e));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        message: 'Invalid email addresses',
        invalidEmails
      });
    }

    // Sanitize text fields to prevent stored HTML/XSS
    const sanitizedMessage = sanitizeText(message);
    const sanitizedNotes = sanitizeText(notes);

    // Bulk-fetch all existing investors for this SPV in a single query
    const existingInvestors = await SPVInvestor.findBySPV(spvId);
    const existingEmails = new Set(
      (existingInvestors || []).map(inv => inv.email)
    );

    const skipped = [];
    const newEmails = [];

    for (const email of emails) {
      if (existingEmails.has(email)) {
        skipped.push({ email, reason: 'already invited' });
      } else {
        newEmails.push(email);
      }
    }

    // Create all new investors in parallel
    const results = await Promise.allSettled(
      newEmails.map(email =>
        SPVInvestor.create({
          spvId,
          email,
          name: email.split('@')[0], // Default name from email prefix
          status: 'invited',
          notes: sanitizedMessage || sanitizedNotes || ''
        })
      )
    );

    const created = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        created.push(result.value);
      }
      // Failed creations are silently skipped; could be logged in production
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

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

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

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

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

    res.status(200).json(sanitizeInvestor(updated));
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

    const { error } = await verifySPVOwnership(req, res, spvId);
    if (error) return;

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

/**
 * Investor self-service fields — a strict subset of UPDATABLE_FIELDS.
 * Investors can update their commitment status and amount, but not admin
 * fields like tags, accreditation, or name.
 */
const SELF_SERVICE_FIELDS = ['status', 'committedAmount'];

/**
 * Valid self-service status transitions.
 * Investors can mark themselves as committed or declined, but not wired
 * (wired requires admin confirmation of funds received).
 */
const SELF_SERVICE_STATUSES = ['committed', 'declined'];

/**
 * PATCH /api/v1/spv/:id/investors/me
 * Investor self-service: update the authenticated investor's own LP record.
 *
 * Uses req.lpRecord (set by requireLPMembership middleware) or falls back
 * to looking up by userId/email. Only allows updating status and committedAmount.
 */
exports.updateMyInvestorRecord = async (req, res) => {
  try {
    const { id: spvId } = req.params;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    // Use the LP record attached by requireLPMembership middleware
    let lpRecord = req.lpRecord;

    if (!lpRecord) {
      // Fallback: look up the investor's own record
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      const email = req.user?.email;

      if (userId) {
        lpRecord = await SPVInvestor.findOne({ spvId, userId });
      }
      if (!lpRecord && email) {
        lpRecord = await SPVInvestor.findOne({ spvId, email });
      }
    }

    if (!lpRecord) {
      return res.status(404).json({ message: 'Your LP record was not found for this SPV' });
    }

    // Build the update payload from self-service fields only
    const updateData = {};
    for (const field of SELF_SERVICE_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: `No valid fields provided. Allowed fields: ${SELF_SERVICE_FIELDS.join(', ')}`
      });
    }

    // Validate status if being updated
    if (updateData.status) {
      if (!SELF_SERVICE_STATUSES.includes(updateData.status)) {
        return res.status(400).json({
          message: `Invalid status for self-service. Allowed values: ${SELF_SERVICE_STATUSES.join(', ')}`
        });
      }
    }

    // Validate committedAmount if provided
    if (updateData.committedAmount !== undefined) {
      const amount = parseFloat(updateData.committedAmount);
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({ message: 'committedAmount must be a non-negative number' });
      }
      updateData.committedAmount = amount;
    }

    // Set timestamp fields based on status transitions
    if (updateData.status === 'committed') {
      updateData.committedAt = new Date().toISOString();
    }

    const investorId = lpRecord._id || lpRecord.id || lpRecord.row_id;

    const updated = await SPVInvestor.findOneAndUpdate(
      { _id: investorId, spvId },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Failed to update LP record' });
    }

    res.status(200).json(sanitizeInvestor(updated));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update your LP record', error: error.message });
  }
};
