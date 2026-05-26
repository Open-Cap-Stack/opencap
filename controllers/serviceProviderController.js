'use strict';

/**
 * Service Provider Controller
 *
 * Phase 4: Service provider invite flow and engagement-scoped access
 *
 * Endpoints (mounted at /api/v1/service-providers):
 *   POST   /invite           — admin/founder invites a service provider
 *   POST   /accept-invite    — service provider accepts invite and sets password
 *   GET    /                 — list all service providers for the company
 *   GET    /:userId          — get a single service provider
 *   PATCH  /:userId/scopes   — update access scopes
 *   DELETE /:userId          — revoke access
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const INVITE_TOKEN_TTL_HOURS = 72;

const VALID_ENGAGEMENT_TYPES = ['legal', 'accounting', 'compliance', 'tax', 'other'];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sanitizeUser(user) {
  const safe = { ...user };
  delete safe.password;
  delete safe.passwordResetToken;
  delete safe.passwordResetExpires;
  delete safe.inviteToken;
  delete safe.inviteTokenExpires;
  return safe;
}

// ---------------------------------------------------------------------------
// POST /api/v1/service-providers/invite
// ---------------------------------------------------------------------------
exports.inviteServiceProvider = async (req, res) => {
  try {
    const { email, firstName, lastName, firm, engagementType, accessScopes } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    if (!firstName) {
      return res.status(400).json({ error: 'firstName is required' });
    }
    if (!lastName) {
      return res.status(400).json({ error: 'lastName is required' });
    }
    if (!engagementType) {
      return res.status(400).json({ error: 'engagementType is required' });
    }
    if (!VALID_ENGAGEMENT_TYPES.includes(engagementType)) {
      return res.status(400).json({
        error: `engagementType must be one of: ${VALID_ENGAGEMENT_TYPES.join(', ')}`,
      });
    }
    if (!Array.isArray(accessScopes) || accessScopes.length === 0) {
      return res.status(400).json({ error: 'accessScopes must be a non-empty array' });
    }

    // Check for duplicate email
    const existing = await User.findByEmail(email.trim().toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    const inviteToken = generateInviteToken();
    const inviteTokenExpires = new Date(
      Date.now() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000
    ).toISOString();

    const newUser = await User.create({
      email: email.trim().toLowerCase(),
      firstName,
      lastName,
      // Placeholder password — replaced when the service provider accepts the invite
      password: crypto.randomBytes(32).toString('hex'),
      role: 'service_provider',
      status: 'pending',
      companyId: req.user?.companyId || null,
      inviteToken,
      inviteTokenExpires,
      invitedBy: req.user?.userId || null,
      profile: {
        firm: firm || null,
        engagementType,
        accessScopes,
      },
    });

    console.log(
      `[ServiceProviderInvite] Invite sent to ${email} — engagementType: ${engagementType} (expires: ${inviteTokenExpires})`
    );

    return res.status(201).json({
      success: true,
      userId: newUser.userId,
      inviteToken,
    });
  } catch (error) {
    console.error('[serviceProviderController.inviteServiceProvider]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/service-providers/accept-invite
// ---------------------------------------------------------------------------
exports.acceptServiceProviderInvite = async (req, res) => {
  try {
    const { inviteToken, password } = req.body;

    if (!inviteToken) {
      return res.status(400).json({ error: 'inviteToken is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }

    // Find user by invite token
    const user = await User.findOne({ inviteToken });
    if (!user) {
      return res.status(404).json({ error: 'Invite token not found or already used' });
    }

    // Check token expiry
    if (user.inviteTokenExpires && new Date(user.inviteTokenExpires) < new Date()) {
      return res.status(400).json({ error: 'Invite token has expired' });
    }

    // Hash the new password and activate the account
    const hashedPassword = await User.hashPassword(password);

    const updatedUser = await User.findOneAndUpdate(
      { inviteToken },
      {
        $set: {
          password: hashedPassword,
          status: 'active',
          inviteToken: null,
          inviteTokenExpires: null,
          lastLogin: new Date().toISOString(),
        },
      },
      { new: true }
    );

    // Issue a JWT for immediate login
    const tokenPayload = {
      userId: updatedUser.userId,
      email: updatedUser.email,
      role: updatedUser.role,
      companyId: updatedUser.companyId,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default_secret', {
      expiresIn: '24h',
    });

    return res.status(200).json({
      token,
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('[serviceProviderController.acceptServiceProviderInvite]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/service-providers
// ---------------------------------------------------------------------------
exports.listServiceProviders = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const query = { role: 'service_provider' };
    if (companyId) query.companyId = companyId;

    const providers = await User.find(query);

    return res.status(200).json(
      providers.map(u => (typeof User.toJSON === 'function' ? User.toJSON(u) : sanitizeUser(u)))
    );
  } catch (error) {
    console.error('[serviceProviderController.listServiceProviders]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/service-providers/:userId
// ---------------------------------------------------------------------------
exports.getServiceProvider = async (req, res) => {
  try {
    const { userId } = req.params;

    const provider = await User.findOne({ userId });
    if (!provider) {
      return res.status(404).json({ error: 'Service provider not found' });
    }

    return res.status(200).json(sanitizeUser(provider));
  } catch (error) {
    console.error('[serviceProviderController.getServiceProvider]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/v1/service-providers/:userId/scopes
// ---------------------------------------------------------------------------
exports.updateServiceProviderScopes = async (req, res) => {
  try {
    const { userId } = req.params;
    const { accessScopes } = req.body;

    if (!accessScopes) {
      return res.status(400).json({ error: 'accessScopes is required' });
    }
    if (!Array.isArray(accessScopes)) {
      return res.status(400).json({ error: 'accessScopes must be an array' });
    }

    const provider = await User.findOne({ userId });
    if (!provider) {
      return res.status(404).json({ error: 'Service provider not found' });
    }

    const updatedProfile = { ...(provider.profile || {}), accessScopes };

    const updatedProvider = await User.findOneAndUpdate(
      { userId },
      { $set: { profile: updatedProfile } },
      { new: true }
    );

    return res.status(200).json(sanitizeUser(updatedProvider));
  } catch (error) {
    console.error('[serviceProviderController.updateServiceProviderScopes]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/v1/service-providers/:userId
// ---------------------------------------------------------------------------
exports.revokeServiceProvider = async (req, res) => {
  try {
    const { userId } = req.params;

    const provider = await User.findOne({ userId });
    if (!provider) {
      return res.status(404).json({ error: 'Service provider not found' });
    }

    await User.findOneAndUpdate(
      { userId },
      { $set: { status: 'inactive' } },
      { new: true }
    );

    console.log(`[ServiceProvider] Access revoked for userId: ${userId}`);

    return res.status(200).json({ success: true, message: 'Service provider access revoked' });
  } catch (error) {
    console.error('[serviceProviderController.revokeServiceProvider]', error.message);
    return res.status(500).json({ error: error.message });
  }
};
