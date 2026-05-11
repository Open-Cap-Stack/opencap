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
const bcrypt = require('bcrypt');
const fileStorageService = require('../services/fileStorageService');
const sharp = require('sharp');
const { sanitizeUser, sanitizeUsers } = require('../utils/sanitizeUser');

const SALT_ROUNDS = 10;

/** Maximum number of users that can be bulk-deleted in a single request */
const BULK_DELETE_MAX = 10;

/**
 * Create a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createUser = async (req, res) => {
  const { userId, name, username, email, password, role } = req.body;

  if (!userId || !name || !username || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
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
    res.status(500).json({ error: 'Server error while creating user' });
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
    res.status(500).json({ error: 'Error fetching users' });
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
      return res.status(404).json({ error: 'User not found' });
    }
    // Issue #386: Remove password from response
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({ error: 'Error fetching user' });
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Issue #386: Use sanitizeUser utility
    res.status(200).json(sanitizeUser(user));
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
};

/**
 * Update user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserById = async (req, res) => {
  try {
    const updateData = { ...req.body };

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
      return res.status(404).json({ error: 'User not found' });
    }
    // Issue #386: Remove password from response
    res.status(200).json(sanitizeUser(updatedUser));
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error updating user' });
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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Already soft-deleted
    if (user.deletedAt) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date().toISOString();
    await User.findByIdAndUpdate(
      req.params.id,
      { deletedAt: now, status: 'inactive' },
      { new: true }
    );

    console.log(`[UserDelete] Soft-deleted user ${user.userId || req.params.id} by ${req.user?.userId || 'unknown'}`);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
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
    // Require admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up related data before deleting the user record
    const cleanup = await cleanupUserData(user, req.user.userId);

    // Now hard-delete the user record
    await User.findByIdAndDelete(req.params.id);

    console.log(`[UserHardDelete] Hard-deleted user ${user.userId || req.params.id} by admin ${req.user.userId}`);

    res.status(200).json({
      message: 'User permanently deleted',
      cleanup
    });
  } catch (error) {
    console.error('Error hard-deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
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
    // Require admin role
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userIds, confirm, hard } = req.body;

    // Validate userIds array
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds must be a non-empty array' });
    }

    // Guard: require explicit confirmation
    if (confirm !== true) {
      return res.status(400).json({ error: 'Bulk delete requires explicit confirmation' });
    }

    // Guard: enforce maximum batch size
    if (userIds.length > BULK_DELETE_MAX) {
      return res.status(400).json({
        error: `Bulk delete limited to ${BULK_DELETE_MAX} users at a time`,
        requested: userIds.length,
        max: BULK_DELETE_MAX
      });
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
    res.status(500).json({ error: 'Error processing bulk delete' });
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
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    // Get authenticated user ID
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify user exists
    let user = await User.findOne({ userId });
    if (!user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
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
      return res.status(400).json({
        success: false,
        message: 'File size exceeds maximum allowed size'
      });
    }

    if (error.message && error.message.includes('not allowed')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only image files are allowed'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify user exists
    let user = await User.findOne({ userId });
    if (!user && req.user._id) {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a profile photo
    const avatarFileId = user.profile?.avatarFileId;
    const avatarThumbnailFileId = user.profile?.avatarThumbnailFileId;

    if (!avatarFileId) {
      return res.status(404).json({
        success: false,
        message: 'No profile photo to delete'
      });
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
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
