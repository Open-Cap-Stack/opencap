/**
 * Invite Management Controller - ZeroDB Migration
 * Issue #20 - Batch 3 Controllers
 * Uses DatabaseAdapter for database-agnostic operations
 */

const databaseAdapter = require('../services/databaseAdapter');
const User = require('../models/User');
const { getPlanById } = require('../config/stripe');

const MODEL_NAME = 'Invite';

async function getCompanyPlanId(companyId) {
  if (!companyId) return 'free';
  try {
    const sub = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });
    return sub?.planId || 'free';
  } catch {
    return 'free';
  }
}

exports.createInvite = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.body.companyId;
    req.body.companyId = companyId;

    // Enforce user seat limit: count existing users + pending invites against the plan cap
    if (companyId) {
      const planId = await getCompanyPlanId(companyId);
      const plan = getPlanById(planId || 'free');
      const limit = plan?.limits?.users ?? 5;

      if (limit !== -1) {
        const [userCount, pendingInviteCount] = await Promise.all([
          User.countDocuments({ companyId }),
          databaseAdapter.count(MODEL_NAME, { companyId, status: { $in: ['pending', 'sent'] } })
        ]);
        const total = userCount + pendingInviteCount;
        if (total >= limit) {
          return res.status(403).json({
            message: `User limit reached. Your ${planId} plan allows up to ${limit} team members (${userCount} active, ${pendingInviteCount} pending). Upgrade to invite more.`,
            code: 'USER_SEAT_LIMIT_REACHED',
            limit,
            current: userCount,
            pending: pendingInviteCount
          });
        }
      }
    }

    const savedInvite = await databaseAdapter.create(MODEL_NAME, req.body);
    res.status(201).json(savedInvite);
  } catch (error) {
    console.error('Error creating invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAllInvites = async (req, res) => {
  try {
    const query = {};
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;
    const invites = await databaseAdapter.find(MODEL_NAME, query);
    res.status(200).json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getInviteById = async (req, res) => {
  try {
    const invite = await databaseAdapter.findById(MODEL_NAME, req.params.id);
    if (!invite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(200).json(invite);
  } catch (error) {
    console.error('Error fetching invite by ID:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateInvite = async (req, res) => {
  try {
    const updatedInvite = await databaseAdapter.findByIdAndUpdate(MODEL_NAME, req.params.id, req.body, { new: true });
    if (!updatedInvite) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(200).json(updatedInvite);
  } catch (error) {
    console.error('Error updating invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteInvite = async (req, res) => {
  try {
    const result = await databaseAdapter.findByIdAndDelete(MODEL_NAME, req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting invite:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
