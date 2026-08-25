/**
 * User Controller
 *
 * Handles user management operations with ZeroDB.
 * Uses User model directly for database operations.
 *
 * Issue #15: Migrate User controller to ZeroDB
 * Issue #187: Add Profile Photo Upload Endpoint
 */

const User = require('../models/User');
const ApiKey = require('../models/ApiKey');
const StripeCustomer = require('../models/StripeCustomer');
const bcrypt = require('bcryptjs');
const fileStorageService = require('../services/fileStorageService');
const sharp = require('sharp');
const { sanitizeUser, sanitizeUsers } = require('../utils/sanitizeUser');
const { getPlanById } = require('../config/stripe');
const { sendError } = require('../middleware/errorResponse');

const SALT_ROUNDS = 10;

/** Maximum number of users that can be bulk-deleted in a single request */
const BULK_DELETE_MAX = 10;

/**
 * Check whether a company has hit its user seat limit.
 * Only the free plan has a seat cap (5 users).
 * Starter and Professional are usage-based with no seat limit.
 *
 * @param {string} companyId
 * @param {string} planId - e.g. 'free', 'starter', 'professional', 'enterprise'
 * @returns {{ allowed: boolean, limit: number, current: number }}
 */
async function checkUserSeatLimit(companyId, planId) {
  const plan = getPlanById(planId || 'free');
  const limit = plan?.limits?.users ?? 5; // default to free tier limit if unknown

  if (limit === -1) return { allowed: true, limit: -1, current: 0 }; // usage-based, no cap

  const current = await User.countDocuments({ companyId });
  return { allowed: current < limit, limit, current };
}

/**
 * Resolve a company's active plan ID.
 * Falls back to 'free' if no subscription record is found.
 *
 * @param {string} companyId
 * @returns {string} planId
 */
async function getCompanyPlanId(companyId) {
  if (!companyId) return 'free';
  try {
    const databaseAdapter = require('../services/databaseAdapter');
    const sub = await databaseAdapter.findOne('Subscription', {
      companyId,
      status: { $in: ['active', 'trialing'] }
    });
    return sub?.planId || 'free';
  } catch {
    return 'free';
  }
}

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createUser = async (req, res) => {
  const { userId, name, username, email, password, role } = req.body;

  if (!userId || !name || !username || !email || !password || !role) {
    return sendError(res, 400, 'All fields are required');
  }

  try {
    // Enforce user seat limit for free plan
    const companyId = req.body.companyId || req.user?.companyId;
    if (companyId) {
      const planId = await getCompanyPlanId(companyId);
      const seatCheck = await checkUserSeatLimit(companyId, planId);
      if (!seatCheck.allowed) {
        return sendError(res, 403, `User limit reached. Your ${planId} plan allows up to ${seatCheck.limit} team members (currently ${seatCheck.current}). Upgrade to add more.`);
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 400, 'Email already exists');
    }

    // Create user
    const user = await User.create({
      userId,
      name,
      username,
      email,
      password,
      role
    });

    // Issue #386: Remove password from response
    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    console.error('Error creating user:', error);
    return sendError(res, 500, 'Server error while creating user');
  }
};

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
  try {
    // Build filter from query params
    const filter = {};
    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const users = await User.find(filter);
    // Issue #386: Remove passwords from all user responses
    res.status(200).json({ users: sanitizeUsers(users || []) });
  } catch (error) {
    console.error('Error fetching users:', error);
    return sendError(res, 500, 'Error fetching users');
  }
};

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    // Issue #386: Remove password from response
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return sendError(res, 500, 'Error fetching user');
  }
};

/**
 * Get current user's profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProfile = async (req, res) => {
  try {
    // The user ID is attached to the request by the auth middleware
    let user;

    // Try to find by userId first (new format)
    if (req.user.userId) {
      user = await User.findOne({ userId: req.user.userId });
    }
    // Fall back to _id if userId not found
    if (!user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Issue #386: Use sanitizeUser utility
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return sendError(res, 500, 'Error fetching user profile');
  }
};

/**
 * Update user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const ADMIN_ROLES = ['founder', 'admin', 'super_admin'];

const updateUserById = async (req, res) => {
  try {
    const updateData = { ...req.body };

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return sendError(res, 404, 'User not found');
    }

    // Prevent role demotion if user is the last admin/founder in their company
    if (updateData.role && ADMIN_ROLES.includes(existingUser.role) && !ADMIN_ROLES.includes(updateData.role)) {
      const companyAdmins = await User.find({
        companyId: existingUser.companyId,
        role: { $in: ADMIN_ROLES },
        _id: { $ne: existingUser._id },
        status: 'active'
      });
      if (!companyAdmins || companyAdmins.length === 0) {
        return sendError(res, 400, 'Cannot change role — this is the only admin/founder in the company. Promote another user first.');
      }
    }

    // Never overwrite companyId from the request body — it must stay with the original company
    delete updateData.companyId;

    // Hash password if it's being updated and not already hashed
    if (updateData.password && !updateData.password.startsWith('$2')) {
      updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedUser) {
      return sendError(res, 404, 'User not found');
    }
    // Issue #386: Remove password from response
    res.status(200).json(sanitizeUser(updatedUser));
  } catch (error) {
    console.error('Error updating user:', error);
    return sendError(res, 500, 'Error updating user');
  }
};

/**
 * Soft-delete user by ID (sets deletedAt timestamp)
 * Issue #485: Prevent orphaned data by preferring soft-delete
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUserById = async (req, res) => {
  try {
    // Issue #165: Prevent users from deleting themselves
    const requesterId = req.user?.userId || req.user?._id;
    if (requesterId && (requesterId === req.params.id || requesterId === req.params.id.toString())) {
      return sendError(res, 403, 'You cannot delete your own account');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Also check against the target user's userId field
    if (requesterId && user.userId && requesterId === user.userId) {
      return sendError(res, 403, 'You cannot delete your own account');
    }

    // Already soft-deleted
    if (user.deletedAt) {
      return sendError(res, 404, 'User not found');
    }

    const now = new Date().toISOString();
    await User.findByIdAndUpdate(
      req.params.id,
      { deletedAt: now, status: 'inactive' },
      { new: true }
    );

    console.log(`[UserDelete] Soft-deleted user ${user.userId || req.params.id} by ${req.user?.userId || 'unknown'}`);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return sendError(res, 500, 'Error deleting user');
  }
};

/**
 * Clean up all related data for a user being hard-deleted.
 * Issue #485: Prevent orphaned ZeroDB data, API keys, and billing records
 *
 * @param {Object} user - The user object being deleted
 * @param {string} adminUserId - ID of the admin performing the action
 * @returns {Object} Summary of cleanup actions
 */
const cleanupUserData = async (user, adminUserId) => {
  const userId = user.userId || user._id;
  const cleanup = { apiKeysRevoked: 0, stripeCustomerMarked: false, errors: [] };

  // 1. Revoke / delete API keys owned by this user (via partnerId which maps to userId)
  try {
    const apiKeys = await ApiKey.find({ partnerId: userId });
    for (const key of (apiKeys || [])) {
      await ApiKey.updateOne(
        { apiKeyId: key.apiKeyId },
        { $set: { status: 'revoked', revokedAt: new Date().toISOString() } }
      );
      cleanup.apiKeysRevoked++;
    }
  } catch (err) {
    cleanup.errors.push({ step: 'apiKeys', message: err.message });
  }

  // 2. Mark Stripe customer as deleted (soft -- no Stripe API call to avoid coupling)
  try {
    if (user.companyId) {
      const stripeCustomer = await StripeCustomer.findOne({ userId });
      if (!stripeCustomer && user.companyId) {
        // Also try by companyId
        const byCompany = await StripeCustomer.findOne({ companyId: user.companyId });
        if (byCompany) {
          await StripeCustomer.updateOne(
            { companyId: user.companyId },
            { $set: { metadata: { ...((byCompany.metadata) || {}), deletedUserId: userId, markedDeletedAt: new Date().toISOString() } } }
          );
          cleanup.stripeCustomerMarked = true;
        }
      } else if (stripeCustomer) {
        await StripeCustomer.updateOne(
          { userId },
          { $set: { metadata: { ...((stripeCustomer.metadata) || {}), deletedUserId: userId, markedDeletedAt: new Date().toISOString() } } }
        );
        cleanup.stripeCustomerMarked = true;
      }
    }
  } catch (err) {
    cleanup.errors.push({ step: 'stripeCustomer', message: err.message });
  }

  console.log(`[UserCleanup] User ${userId} cleanup by admin ${adminUserId}: apiKeys=${cleanup.apiKeysRevoked}, stripe=${cleanup.stripeCustomerMarked}, errors=${cleanup.errors.length}`);
  return cleanup;
};

/**
 * Hard-delete a single user (admin only)
 * Issue #485: Ensure cleanup of API keys, billing, and related data
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const hardDeleteUserById = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Admin access required');
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const cleanup = await cleanupUserData(user, req.user.userId);

    // Now hard-delete the user record
    await User.findByIdAndDelete(req.params.id);

    console.log(`[UserHardDelete] Hard-deleted user ${user.userId || req.params.id} by admin ${req.user.userId}`);

    res.status(200).json({
      success: true,
      message: 'User permanently deleted',
      cleanup
    });
  } catch (error) {
    console.error('Error hard-deleting user:', error);
    return sendError(res, 500, 'Error deleting user');
  }
};

/**
 * Bulk delete users (admin only, with safety guards)
 * Issue #487: Prevent mass wipe by requiring confirmation and enforcing a cap
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const bulkDeleteUsers = async (req, res) => {
  try {
    if (!req.user || !['admin', 'super_admin'].includes(req.user.role)) {
      return sendError(res, 403, 'Admin access required');
    }

    const { userIds, confirm, hard } = req.body;

    // Validate userIds array
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return sendError(res, 400, 'userIds must be a non-empty array');
    }

    // Guard: require explicit confirmation
    if (confirm !== true) {
      return sendError(res, 400, 'Bulk delete requires explicit confirmation');
    }

    // Guard: enforce maximum batch size
    if (userIds.length > BULK_DELETE_MAX) {
      return sendError(res, 400, `Bulk delete limited to ${BULK_DELETE_MAX} users at a time`);
    }

    console.log(`[BulkDelete] Admin ${req.user.userId} initiating bulk delete of ${userIds.length} users: ${JSON.stringify(userIds)}, hard=${!!hard}`);

    const results = [];
    for (const id of userIds) {
      try {
        const user = await User.findById(id);
        if (!user) {
          results.push({ id, status: 'not_found' });
          continue;
        }

        if (hard === true) {
          // Hard delete with cleanup
          const cleanup = await cleanupUserData(user, req.user.userId);
          await User.findByIdAndDelete(id);
          results.push({ id, status: 'hard_deleted', cleanup });
        } else {
          // Soft delete
          const now = new Date().toISOString();
          await User.findByIdAndUpdate(id, { deletedAt: now, status: 'inactive' }, { new: true });
          results.push({ id, status: 'soft_deleted' });
        }
      } catch (err) {
        results.push({ id, status: 'error', error: err.message });
      }
    }

    console.log(`[BulkDelete] Completed: ${results.filter(r => r.status.includes('deleted')).length}/${userIds.length} deleted`);

    res.status(200).json({
      message: 'Bulk delete completed',
      results
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return sendError(res, 500, 'Error processing bulk delete');
  }
};

/**
 * Upload profile photo
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const uploadProfilePhoto = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return sendError(res, 400, 'No photo file provided');
    }

    // Get authenticated user ID
    const userId = req.user.userId;
    if (!userId) {
      return sendError(res, 401, 'User not authenticated');
    }

    // Verify user exists
    let user = await User.findOne({ userId });
    if (!user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Generate thumbnail (200x200px) using sharp
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Prepare metadata for file storage
    const metadata = {
      userId: userId,
      fileType: 'profile_photo',
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString()
    };

    // Upload original photo to ZeroDB
    const uploadResult = await fileStorageService.uploadFile(
      req.file.buffer,
      `profile-${userId}-${Date.now()}${req.file.originalname.substring(req.file.originalname.lastIndexOf('.'))}`,
      {
        companyId: user.companyId,
        uploadedBy: userId,
        category: 'profile_photos',
        metadata: metadata
      }
    );

    // Upload thumbnail to ZeroDB
    const thumbnailResult = await fileStorageService.uploadFile(
      thumbnailBuffer,
      `profile-thumb-${userId}-${Date.now()}.jpg`,
      {
        companyId: user.companyId,
        uploadedBy: userId,
        category: 'profile_photos',
        metadata: { ...metadata, isThumbnail: true }
      }
    );

    // Generate presigned URL for the photo (expires in 1 year)
    const photoUrl = await fileStorageService.getPresignedUrl(
      uploadResult.id,
      { expiresIn: 31536000 } // 1 year
    );

    const thumbnailUrl = await fileStorageService.getPresignedUrl(
      thumbnailResult.id,
      { expiresIn: 31536000 } // 1 year
    );

    // Update user profile with photo URLs
    const updateData = {
      'profile.avatar': photoUrl.url,
      'profile.avatarThumbnail': thumbnailUrl.url,
      'profile.avatarFileId': uploadResult.id,
      'profile.avatarThumbnailFileId': thumbnailResult.id
    };

    // ZeroDB: Use direct update without MongoDB $set operator
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    );

    // If update by userId failed, try by _id
    if (!updatedUser && user._id) {
      await User.findByIdAndUpdate(
        user._id,
        updateData,
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      photoUrl: photoUrl.url,
      thumbnailUrl: thumbnailUrl.url,
      message: 'Profile photo uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading profile photo:', error);

    // Handle specific errors
    if (error.message && error.message.includes('size exceeds')) {
      return sendError(res, 400, 'File size exceeds maximum allowed size');
    }

    if (error.message && error.message.includes('not allowed')) {
      return sendError(res, 400, 'Invalid file type. Only image files are allowed');
    }

    return sendError(res, 500, 'Failed to upload profile photo', error.message);
  }
};

/**
 * Delete profile photo
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteProfilePhoto = async (req, res) => {
  try {
    // Get authenticated user ID
    const userId = req.user.userId;
    if (!userId) {
      return sendError(res, 401, 'User not authenticated');
    }

    // Verify user exists
    let user = await User.findOne({ userId });
    if (!user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Check if user has a profile photo
    const avatarFileId = user.profile?.avatarFileId;
    const avatarThumbnailFileId = user.profile?.avatarThumbnailFileId;

    if (!avatarFileId) {
      return sendError(res, 404, 'No profile photo to delete');
    }

    // Delete files from ZeroDB storage
    try {
      await fileStorageService.deleteFile(avatarFileId, { soft: false });
      if (avatarThumbnailFileId) {
        await fileStorageService.deleteFile(avatarThumbnailFileId, { soft: false });
      }
    } catch (deleteError) {
      console.error('Error deleting files from storage:', deleteError);
      // Continue to update user profile even if file deletion fails
    }

    // Update user profile to remove photo URLs
    const updateData = {
      'profile.avatar': null,
      'profile.avatarThumbnail': null,
      'profile.avatarFileId': null,
      'profile.avatarThumbnailFileId': null
    };

    // ZeroDB: Use direct update without MongoDB $set operator
    await User.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile photo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting profile photo:', error);
    return sendError(res, 500, 'Failed to delete profile photo', error.message);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  hardDeleteUserById,
  bulkDeleteUsers,
  getProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  BULK_DELETE_MAX
};
