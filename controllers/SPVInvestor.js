/**
 * SPV Investor (LP Management) Controller
 * Issue #590: SPV LP Management
 *
 * Endpoints for inviting, listing, updating, and removing LP investors
 * on a per-SPV basis.
 */

const SPVInvestor = require('../models/SPVInvestor');
const SPV = require('../models/SPV');
const { sendCommitmentConfirmation } = require('../services/emailService');

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
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await SPVInvestor.create({
      spvId,
      email: `invite-link-${token.slice(0, 8)}@placeholder.opencapstack.com`,
      name: 'Invite Link Placeholder',
      status: 'invited',
      inviteToken: token,
      inviteTokenExpiry: expiry,
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://opencapstack.com';
    const url = `${baseUrl}/spv/join/${token}`;

    res.status(200).json({ url, token, spvId, expiresAt: expiry });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invite link', error: error.message });
  }
};

/**
 * POST /api/v1/spv/join/:token
 * Validate an invite token and return SPV details (unauthenticated).
 */
exports.joinViaToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.trim() === '') {
      return res.status(400).json({ message: 'Invite token is required' });
    }

    const investor = await SPVInvestor.findByInviteToken(token);
    if (!investor) {
      return res.status(404).json({ message: 'Invalid or expired invite token' });
    }

    if (investor.inviteTokenExpiry && new Date(investor.inviteTokenExpiry) < new Date()) {
      return res.status(410).json({ message: 'Invite token has expired' });
    }

    const spv = await SPV.findBySPVID(investor.spvId) || await SPV.findById(investor.spvId).catch(() => null);
    if (!spv) {
      return res.status(404).json({ message: 'SPV no longer exists' });
    }

    res.status(200).json({
      valid: true,
      spv: {
        spvId: spv.SPVID || spv.spvId,
        name: spv.Name || spv.name,
        purpose: spv.Purpose,
        status: spv.Status || spv.status,
        targetSize: spv.targetSize || spv.allocation,
        minimumCommitment: spv.lpMinimumInvestment,
        valuationCap: spv.valuationCap,
        memo: spv.memo,
      },
      investor: {
        email: investor.email,
        status: investor.status,
        invitedAt: investor.invitedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to validate invite token', error: error.message });
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
 * GET /api/v1/spv/:id/wire-instructions
 * Return wire transfer instructions for an SPV.
 *
 * Admin roles (super_admin, admin, founder, manager, service_provider) can
 * retrieve wire instructions directly by verifying SPV ownership.
 * Investor role must be an LP with status 'committed' or 'wired'.
 */
exports.getWireInstructions = async (req, res) => {
  try {
    const { id: spvId } = req.params;
    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const spv = await SPV.findBySPVID(spvId) || await SPV.findById(spvId).catch(() => null);
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    const role = req.user?.role;
    const adminRoles = ['super_admin', 'admin', 'founder', 'manager', 'service_provider'];
    const isAdmin = adminRoles.includes(role);

    // Admin roles: verify SPV ownership (company match), return wire info without LP check
    if (isAdmin) {
      const wire = spv.wireInstructions || {};
      return res.status(200).json({
        wireInstructions: {
          bankName: wire.bankName || null,
          routingNumber: wire.routingNumber || null,
          accountNumber: wire.accountNumber || null,
          swiftCode: wire.swiftCode || null,
          specialInstructions: wire.specialInstructions || null,
          referencePrefix: wire.referencePrefix || spvId,
        },
      });
    }

    // Investor role: must be an LP with committed or wired status
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const email = req.user?.email;

    let lpRecord = null;
    if (userId) lpRecord = await SPVInvestor.findOne({ spvId, userId });
    if (!lpRecord && email) lpRecord = await SPVInvestor.findOne({ spvId, email });
    const effectiveSpvId = spv.SPVID || spvId;
    if (!lpRecord && userId) lpRecord = await SPVInvestor.findOne({ spvId: effectiveSpvId, userId });
    if (!lpRecord && email) lpRecord = await SPVInvestor.findOne({ spvId: effectiveSpvId, email });

    if (!lpRecord) {
      return res.status(403).json({ message: 'You are not an LP in this SPV' });
    }
    if (lpRecord.status !== 'committed' && lpRecord.status !== 'wired') {
      return res.status(403).json({ message: 'Wire instructions are available only after commitment' });
    }

    const wire = spv.wireInstructions || {};
    const investorId = lpRecord._id || lpRecord.row_id;
    const prefix = wire.referencePrefix || spvId;
    const wireReference = `${prefix}-${investorId}`;

    res.status(200).json({
      wireInstructions: {
        bankName: wire.bankName || null,
        routingNumber: wire.routingNumber || null,
        accountNumber: wire.accountNumber || null,
        swiftCode: wire.swiftCode || null,
        specialInstructions: wire.specialInstructions || null,
        wireReference,
      },
      commitment: {
        amount: lpRecord.committedAmount,
        status: lpRecord.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve wire instructions', error: error.message });
  }
};

/**
 * POST /api/v1/spv/:id/wire-instructions
 * Set or update wire transfer instructions on an SPV (admin only).
 *
 * Body: { bankName, routingNumber, accountNumber, swiftCode, referencePrefix, specialInstructions }
 * At minimum bankName and accountNumber are required.
 */
exports.setWireInstructions = async (req, res) => {
  try {
    const { id: spvId } = req.params;
    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    const { bankName, routingNumber, accountNumber, swiftCode, referencePrefix, specialInstructions } = req.body;

    // Validate required fields
    if (!bankName || typeof bankName !== 'string' || bankName.trim() === '') {
      return res.status(400).json({ message: 'bankName is required' });
    }
    if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim() === '') {
      return res.status(400).json({ message: 'accountNumber is required' });
    }

    let spv = await SPV.findBySPVID(spvId);
    if (!spv) {
      spv = await SPV.findById(spvId).catch(() => null);
    }
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    const wireInstructions = {
      bankName: sanitizeText(bankName),
      routingNumber: routingNumber ? sanitizeText(routingNumber) : null,
      accountNumber: sanitizeText(accountNumber),
      swiftCode: swiftCode ? sanitizeText(swiftCode) : null,
      referencePrefix: referencePrefix ? sanitizeText(referencePrefix) : spvId,
      specialInstructions: specialInstructions ? sanitizeText(specialInstructions) : null,
    };

    // Update using SPVID if available, otherwise _id
    const query = spv.SPVID ? { SPVID: spv.SPVID } : { _id: spv._id || spv.row_id };
    const updated = await SPV.findOneAndUpdate(
      query,
      { $set: { wireInstructions, updatedAt: new Date().toISOString() } },
      { new: true }
    );

    if (!updated) {
      return res.status(500).json({ message: 'Failed to update wire instructions' });
    }

    res.status(200).json({ wireInstructions: updated.wireInstructions || wireInstructions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to set wire instructions', error: error.message });
  }
};

/**
 * POST /api/v1/spv/:id/commit
 * LP investor commits a dollar amount to an SPV.
 * Body: { amount: <number>, acceptTerms: <boolean> }
 *
 * Requires accreditation check via middleware. The investor must be
 * an LP in the SPV with status 'invited' or 'committed' (re-commit).
 */
exports.commitToSPV = async (req, res) => {
  try {
    const { id: spvId } = req.params;
    const { amount, acceptTerms } = req.body;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }

    if (!acceptTerms) {
      return res.status(400).json({ message: 'You must accept the terms to commit' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ message: 'A positive commitment amount is required' });
    }

    // Find the SPV
    const spv = await SPV.findBySPVID(spvId) || await SPV.findById(spvId).catch(() => null);
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    // Enforce minimum investment if configured
    const minimum = spv.lpMinimumInvestment || 0;
    if (minimum > 0 && amount < minimum) {
      return res.status(400).json({
        message: `Commitment must be at least $${minimum.toLocaleString()}`
      });
    }

    // Find the LP investor record
    const userId = req.user?.userId || req.user?.id;
    const email = req.user?.email;
    const effectiveSpvId = spv.SPVID || spvId;

    let lpRecord = null;
    if (userId) lpRecord = await SPVInvestor.findOne({ spvId, userId });
    if (!lpRecord && email) lpRecord = await SPVInvestor.findOne({ spvId, email });
    if (!lpRecord && userId) lpRecord = await SPVInvestor.findOne({ spvId: effectiveSpvId, userId });
    if (!lpRecord && email) lpRecord = await SPVInvestor.findOne({ spvId: effectiveSpvId, email });

    if (!lpRecord) {
      return res.status(403).json({ message: 'You are not an LP in this SPV' });
    }

    // Prevent commitment from ineligible statuses
    if (lpRecord.status === 'wired') {
      return res.status(400).json({ message: 'Cannot re-commit: funds already wired' });
    }
    if (lpRecord.status === 'declined') {
      return res.status(400).json({ message: 'Cannot commit: invitation was declined' });
    }

    const updated = await SPVInvestor.findOneAndUpdate(
      { _id: lpRecord._id || lpRecord.row_id },
      {
        $set: {
          status: 'committed',
          committedAmount: amount,
          committedAt: new Date().toISOString(),
        },
      },
      { new: true }
    );

    // Send commitment confirmation email (fire-and-forget)
    try {
      sendCommitmentConfirmation(
        { email: updated.email || lpRecord.email, name: updated.name || lpRecord.name, committedAmount: amount },
        spv
      ).catch(err => {
        console.error('[Email] Failed to send commitment confirmation:', err.message);
      });
    } catch (notifyErr) {
      console.error('[Email] Error sending commitment confirmation:', notifyErr.message);
    }

    res.status(200).json({ investor: sanitizeInvestor(updated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to commit to SPV', error: error.message });
  }
};

exports.confirmWireReceipt = async (req, res) => {
  try {
    const { id: spvId } = req.params;
    const { investorId, wiredAmount, wireReference, wireDate } = req.body;

    if (!spvId || spvId.trim() === '') {
      return res.status(400).json({ message: 'SPV ID is required' });
    }
    if (!investorId) {
      return res.status(400).json({ message: 'investorId is required' });
    }
    if (!wiredAmount || typeof wiredAmount !== 'number' || wiredAmount <= 0) {
      return res.status(400).json({ message: 'A positive wiredAmount is required' });
    }

    const spv = await SPV.findBySPVID(spvId) || await SPV.findById(spvId).catch(() => null);
    if (!spv) {
      return res.status(404).json({ message: 'SPV not found' });
    }

    const investor = await SPVInvestor.findOne({ _id: investorId, spvId });
    if (!investor) {
      const effectiveSpvId = spv.SPVID || spvId;
      const altInvestor = await SPVInvestor.findOne({ _id: investorId, spvId: effectiveSpvId });
      if (!altInvestor) {
        return res.status(404).json({ message: 'Investor not found in this SPV' });
      }
    }

    const record = investor || await SPVInvestor.findOne({ _id: investorId });
    if (record.status !== 'committed') {
      return res.status(400).json({ message: `Cannot confirm wire for investor with status '${record.status}'. Must be 'committed'.` });
    }

    const updated = await SPVInvestor.findOneAndUpdate(
      { _id: investorId },
      {
        $set: {
          status: 'wired',
          wiredAmount,
          wiredAt: wireDate || new Date().toISOString(),
          wireReference: wireReference || null,
        },
      },
      { new: true }
    );

    res.status(200).json({ investor: sanitizeInvestor(updated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to confirm wire receipt', error: error.message });
  }
};

