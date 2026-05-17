/**
 * Accountant Controller
 * Feature: AI-Powered 409A Valuation - Accountant Review Workflow
 *
 * Handles the accountant review queue, annotations, and sign-off flow.
 */
const { v4: uuidv4 } = require('uuid');
const AccountantQueue = require('../models/AccountantQueue');
const Valuation409A = require('../models/Valuation409A');
const User = require('../models/User');
const emailService = require('../services/valuation409AEmailService');

// ─── Queue ────────────────────────────────────────────────────────────────────

exports.getQueue = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { status } = req.query;

    let filter = {};
    if (role === 'accountant') {
      // Accountants see their own items + unassigned
      filter = status
        ? { status }
        : {};
    } else if (role === 'admin') {
      if (status) filter.status = status;
    } else {
      return res.status(403).json({ success: false, error: 'Accountant or admin role required' });
    }

    const queueItems = await AccountantQueue.find(filter, { sort: { queuedAt: -1 } });

    // For accountants, filter to their items + unassigned
    const filtered = role === 'accountant'
      ? queueItems.filter(q => !q.assignedAccountantId || q.assignedAccountantId === userId)
      : queueItems;

    // Enrich with basic valuation info
    const enriched = await Promise.all(filtered.map(async (item) => {
      let valuation = null;
      try {
        valuation = await Valuation409A.findOne({ valuationId: item.valuationId });
        if (!valuation) valuation = await Valuation409A.findOne({ row_id: item.valuationId });
      } catch {}
      return {
        ...item,
        valuation: valuation ? {
          valuationId: valuation.valuationId || valuation.row_id,
          companyId: valuation.companyId,
          status: valuation.status,
          aiStatus: valuation.aiStatus,
          fairMarketValue: valuation.fairMarketValue,
          businessContext: valuation.businessContext,
          createdAt: valuation.createdAt
        } : null
      };
    }));

    res.json({ success: true, data: enriched, total: enriched.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getQueueItem = async (req, res) => {
  try {
    const { queueId } = req.params;
    const item = await AccountantQueue.findOne({ queueId });
    if (!item) return res.status(404).json({ success: false, error: 'Queue item not found' });

    let valuation = await Valuation409A.findOne({ valuationId: item.valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: item.valuationId });

    res.json({ success: true, data: { ...item, valuation } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.claimQueueItem = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { userId } = req.user;

    const item = await AccountantQueue.findOne({ queueId });
    if (!item) return res.status(404).json({ success: false, error: 'Queue item not found' });
    if (item.assignedAccountantId && item.assignedAccountantId !== userId) {
      return res.status(409).json({ success: false, error: 'This item is already claimed by another accountant' });
    }

    const now = new Date().toISOString();
    await AccountantQueue.updateOne({ queueId }, {
      $set: { assignedAccountantId: userId, assignedAt: now, status: 'assigned', updatedAt: now }
    });

    // Also stamp the valuation
    let val = await Valuation409A.findOne({ valuationId: item.valuationId });
    if (!val) val = await Valuation409A.findOne({ row_id: item.valuationId });
    if (val) {
      const fk = val.valuationId ? { valuationId: val.valuationId } : { row_id: val.row_id };
      await Valuation409A.updateOne(fk, { $set: { assignedAccountantId: userId, assignedAccountantAt: now } });
    }

    res.json({ success: true, message: 'Queue item claimed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.startReview = async (req, res) => {
  try {
    const { queueId } = req.params;
    const { userId } = req.user;
    const now = new Date().toISOString();

    const item = await AccountantQueue.findOne({ queueId });
    if (!item) return res.status(404).json({ success: false, error: 'Queue item not found' });
    if (item.assignedAccountantId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not assigned to you' });
    }

    await AccountantQueue.updateOne({ queueId }, {
      $set: { status: 'in_review', reviewStartedAt: now, updatedAt: now }
    });

    res.json({ success: true, message: 'Review started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Annotations ──────────────────────────────────────────────────────────────

exports.addAnnotation = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { section, comment } = req.body;
    const { userId } = req.user;

    if (!section || !comment) {
      return res.status(400).json({ success: false, error: 'section and comment are required' });
    }

    let val = await Valuation409A.findOne({ valuationId });
    if (!val) val = await Valuation409A.findOne({ row_id: valuationId });
    if (!val) return res.status(404).json({ success: false, error: 'Valuation not found' });

    const fk = val.valuationId ? { valuationId: val.valuationId } : { row_id: val.row_id };
    const existing = val.accountantReview || { annotations: [], changeRequests: [], overallNotes: '' };
    const annotations = existing.annotations || [];

    const newAnnotation = {
      annotationId: uuidv4(),
      section,
      comment,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      resolved: false,
      resolvedAt: null
    };
    annotations.push(newAnnotation);

    await Valuation409A.updateOne(fk, {
      $set: { accountantReview: { ...existing, annotations }, updatedAt: new Date().toISOString() }
    });

    res.json({ success: true, data: newAnnotation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resolveAnnotation = async (req, res) => {
  try {
    const { valuationId, annotationId } = req.params;

    let val = await Valuation409A.findOne({ valuationId });
    if (!val) val = await Valuation409A.findOne({ row_id: valuationId });
    if (!val) return res.status(404).json({ success: false, error: 'Valuation not found' });

    const fk = val.valuationId ? { valuationId: val.valuationId } : { row_id: val.row_id };
    const review = val.accountantReview || { annotations: [], changeRequests: [] };
    const annotations = (review.annotations || []).map(a =>
      a.annotationId === annotationId
        ? { ...a, resolved: true, resolvedAt: new Date().toISOString() }
        : a
    );

    await Valuation409A.updateOne(fk, {
      $set: { accountantReview: { ...review, annotations }, updatedAt: new Date().toISOString() }
    });

    res.json({ success: true, message: 'Annotation resolved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Approve & Sign Off ───────────────────────────────────────────────────────

exports.approveAndSign = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { overallNotes, confirmApproval } = req.body;
    const { userId, email, role } = req.user;

    if (!confirmApproval) {
      return res.status(400).json({ success: false, error: 'confirmApproval must be true to sign off' });
    }
    if (role !== 'accountant' && role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Accountant role required' });
    }

    let val = await Valuation409A.findOne({ valuationId });
    if (!val) val = await Valuation409A.findOne({ row_id: valuationId });
    if (!val) return res.status(404).json({ success: false, error: 'Valuation not found' });

    const fk = val.valuationId ? { valuationId: val.valuationId } : { row_id: val.row_id };
    const now = new Date().toISOString();

    // Create digital sign-off record
    const signatureRecord = {
      signatureId: uuidv4(),
      signedBy: userId,
      signerEmail: email,
      signerRole: role,
      signedAt: now,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      statement: 'I have reviewed this AI-generated 409A valuation report and confirm it meets professional standards for IRC Section 409A compliance.',
      valuationId: val.valuationId || valuationId,
      fairMarketValue: val.fairMarketValue
    };

    const review = val.accountantReview || { annotations: [], changeRequests: [] };

    await Valuation409A.updateOne(fk, {
      $set: {
        status: 'accountant_approved',
        accountantSignedAt: now,
        accountantSignatureRecord: signatureRecord,
        assignedAccountantId: userId,
        accountantReview: { ...review, overallNotes: overallNotes || '', completedAt: now },
        updatedAt: now
      }
    });

    // Update queue item
    const queueItem = await AccountantQueue.findOne({ valuationId: val.valuationId || valuationId });
    if (queueItem) {
      await AccountantQueue.updateOne({ queueId: queueItem.queueId }, {
        $set: { status: 'completed', completedAt: now, updatedAt: now }
      });
    }

    res.json({
      success: true,
      message: 'Valuation approved and signed. Ready for admin release.',
      data: { signatureId: signatureRecord.signatureId, signedAt: now }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.releaseToCompany = async (req, res) => {
  try {
    const { valuationId } = req.params;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin role required' });
    }

    let val = await Valuation409A.findOne({ valuationId });
    if (!val) val = await Valuation409A.findOne({ row_id: valuationId });
    if (!val) return res.status(404).json({ success: false, error: 'Valuation not found' });
    if (val.status !== 'accountant_approved') {
      return res.status(400).json({ success: false, error: 'Valuation must be accountant_approved before release' });
    }

    const fk = val.valuationId ? { valuationId: val.valuationId } : { row_id: val.row_id };
    const now = new Date().toISOString();

    await Valuation409A.updateOne(fk, {
      $set: { status: 'released', releasedToCompanyAt: now, releasedBy: req.user.userId, updatedAt: now }
    });

    // Email the requesting user (best-effort)
    try {
      const requester = await User.findOne({ userId: val.requestedBy });
      if (requester?.email) {
        await emailService.sendReportReleased({
          to: requester.email,
          companyId: val.companyId,
          valuationId: val.valuationId || valuationId,
          fmv: val.fairMarketValue,
          signedBy: val.accountantSignatureRecord?.signerEmail,
        });
      }
    } catch (emailErr) {
      console.warn('[Release] Email notification failed:', emailErr.message);
    }

    res.json({ success: true, message: 'Valuation released to company dashboard' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const { userId, role } = req.user;
    const filter = role === 'accountant' ? { assignedAccountantId: userId } : {};

    const all = await AccountantQueue.find(filter);
    const byStatus = {};
    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalInQueue: all.length,
        unassigned: byStatus.unassigned || 0,
        assigned: byStatus.assigned || 0,
        inReview: byStatus.in_review || 0,
        completed: byStatus.completed || 0,
        byStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Admin: List Accountants ──────────────────────────────────────────────────

exports.listAccountants = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin role required' });
    }
    const accountants = await User.find({ role: 'accountant' });
    res.json({ success: true, data: accountants });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
