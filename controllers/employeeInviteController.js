'use strict';

/**
 * Employee Invite Controller
 *
 * Phase 3: Employee invite flow
 *
 * Endpoints:
 *   POST /api/v1/employees/invite        — admin/founder/manager sends invite
 *   POST /api/v1/employees/accept-invite — employee accepts invite and sets password
 *   GET  /api/v1/employees               — list employees for a company
 *   GET  /api/v1/employees/:userId       — get a single employee record
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmployeeInvite } = require('../services/inviteEmailService');

const INVITE_TOKEN_TTL_HOURS = 72;

// ---------------------------------------------------------------------------
// Helper: generate a cryptographically random invite token
// ---------------------------------------------------------------------------
function generateInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// POST /api/v1/employees/invite
// ---------------------------------------------------------------------------
exports.inviteEmployee = async (req, res) => {
  try {
    const { email, firstName, lastName, equityGrantId } = req.body;

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
      // Placeholder password — replaced when the employee accepts the invite
      password: crypto.randomBytes(32).toString('hex'),
      role: 'employee',
      status: 'pending',
      companyId: req.user?.companyId || null,
      inviteToken,
      inviteTokenExpires,
      invitedBy: req.user?.userId || null,
      ...(equityGrantId ? { equityGrantId } : {})
    });

    // Send invite email via Resend
    await sendEmployeeInvite({
      to: email,
      firstName,
      companyName: req.user?.companyName || null,
      inviteToken,
    }).catch(err => {
      // Email failure is non-fatal — the invite record is already created
      console.error('[EmployeeInvite] Email send failed:', err.message);
    });

    return res.status(201).json({
      success: true,
      userId: newUser.userId,
      inviteToken
    });
  } catch (error) {
    console.error('[employeeInviteController.inviteEmployee]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/v1/employees/accept-invite
// ---------------------------------------------------------------------------
exports.acceptInvite = async (req, res) => {
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

    // Use the _id from the findOne result — ZeroDB's findOneAndUpdate can't
    // reliably filter by arbitrary fields like inviteToken
    const userId = user._id || user.userId;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        password: hashedPassword,
        status: 'active',
        inviteToken: null,
        inviteTokenExpires: null,
        lastLogin: new Date().toISOString()
      },
      { new: true }
    );

    // Fall back to the original user record if update didn't return the full object
    const effectiveUser = updatedUser || { ...user, status: 'active' };

    // Issue a JWT for immediate login
    const tokenPayload = {
      userId: effectiveUser.userId || userId,
      email: effectiveUser.email || user.email,
      role: effectiveUser.role || user.role || 'employee',
      companyId: effectiveUser.companyId || user.companyId
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default_secret', {
      expiresIn: '24h'
    });

    // Sanitize — strip sensitive fields
    const safeUser = { ...effectiveUser };
    delete safeUser.password;
    delete safeUser.passwordResetToken;
    delete safeUser.passwordResetExpires;
    delete safeUser.inviteToken;
    delete safeUser.inviteTokenExpires;

    return res.status(200).json({
      token,
      user: safeUser
    });
  } catch (error) {
    console.error('[employeeInviteController.acceptInvite]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/employees
// ---------------------------------------------------------------------------
exports.listEmployees = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const query = { role: 'employee' };
    if (companyId) query.companyId = companyId;

    const employees = await User.find(query);

    return res.status(200).json(employees.map(u => User.toJSON(u)));
  } catch (error) {
    console.error('[employeeInviteController.listEmployees]', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/v1/employees/:userId
// ---------------------------------------------------------------------------
exports.getEmployee = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    const employee = await User.findOne({ userId });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Employees may only view their own record; admins/founders/managers can view any
    const PRIVILEGED_ROLES = ['super_admin', 'admin', 'founder', 'manager'];
    if (
      !PRIVILEGED_ROLES.includes(requestingUser.role) &&
      employee.userId !== requestingUser.userId
    ) {
      return res.status(403).json({ error: 'Access denied: you may only view your own record' });
    }

    const safeEmployee = { ...employee };
    delete safeEmployee.password;
    delete safeEmployee.passwordResetToken;
    delete safeEmployee.passwordResetExpires;
    return res.status(200).json(safeEmployee);
  } catch (error) {
    console.error('[employeeInviteController.getEmployee]', error.message);
    return res.status(500).json({ error: error.message });
  }
};
