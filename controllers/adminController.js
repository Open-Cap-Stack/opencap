/**
 * Admin Controller
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Handles CRUD operations for admin users using DatabaseAdapter
 * for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');

/**
 * Create a new admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createAdmin = async (req, res) => {
  const { UserID, Name, Email, UserRoles, NotificationSettings } = req.body;

  if (!UserID || !Name || !Email || !UserRoles || !NotificationSettings) {
    return res.status(400).json({ message: "Invalid admin data" });
  }

  try {
    const createdAdmin = await databaseAdapter.create('Admin', {
      UserID,
      Name,
      Email,
      UserRoles,
      NotificationSettings,
    });
    return res.status(201).json(createdAdmin);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get all admins
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await databaseAdapter.find('Admin', {}, {});
    if (admins.length === 0) {
      return res.status(404).json({ message: 'No admins found' });
    }
    res.status(200).json(admins);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get admin by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAdminById = async (req, res) => {
  try {
    const admin = await databaseAdapter.findById('Admin', req.params.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update admin by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateAdmin = async (req, res) => {
  try {
    const updatedAdmin = await databaseAdapter.findByIdAndUpdate(
      'Admin',
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json(updatedAdmin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete admin by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const deletedAdmin = await databaseAdapter.findByIdAndDelete('Admin', req.params.id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Login admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find admin by email using DatabaseAdapter
    const admin = await databaseAdapter.findOne('Admin', { Email: email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // In a real implementation, you would verify the password here
    // For now, we'll require the JWT_SECRET environment variable
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    // Return success without a token (requires proper JWT implementation)
    res.status(501).json({
      message: "Login functionality requires proper JWT implementation",
      error: "JWT authentication not yet implemented"
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Logout admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logoutAdmin = async (req, res) => {
  // Implement logout logic
  res.status(200).json({ message: "Admin logged out" });
};

/**
 * Change admin password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.changePassword = async (req, res) => {
  // Implement password change logic
  res.status(200).json({ message: "Password changed" });
};

/**
 * Activate all pending user accounts
 * Issue #513: Users created with status='pending' when SMTP was not configured
 * are locked out. This endpoint bulk-activates them.
 *
 * POST /api/v1/admin/users/activate-pending
 * Query params:
 *   dry_run=true  - preview affected users without making changes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.activatePendingUsers = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const dryRun = req.query.dry_run === 'true';
    const User = require('../models/User');

    // Find all users with pending status
    const pendingUsers = await User.find({ status: 'pending' });

    if (!pendingUsers || pendingUsers.length === 0) {
      return res.status(200).json({
        message: 'No pending accounts found',
        activated: 0,
        users: []
      });
    }

    const userSummaries = pendingUsers.map(u => ({
      userId: u.userId,
      email: u.email,
      createdAt: u.createdAt
    }));

    if (dryRun) {
      return res.status(200).json({
        message: `Dry run: found ${pendingUsers.length} pending account(s)`,
        dryRun: true,
        count: pendingUsers.length,
        users: userSummaries
      });
    }

    // Activate each pending user
    let activated = 0;
    const errors = [];

    for (const user of pendingUsers) {
      try {
        await User.updateOne(
          { _id: user._id },
          { $set: { status: 'active', updatedAt: new Date() } }
        );
        activated++;
      } catch (err) {
        errors.push({ userId: user.userId, email: user.email, error: err.message });
      }
    }

    return res.status(200).json({
      message: `Activated ${activated} of ${pendingUsers.length} pending account(s)`,
      activated,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      users: userSummaries
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
