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
const fileStorageService = require('../services/fileStorageService');
const sharp = require('sharp');
const { sanitizeUser, sanitizeUsers } = require('../utils/sanitizeUser');

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
    if (!user && req.user.id) {
      user = await User.findById(req.user.id);
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
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
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
 * Delete user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUserById = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
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
    const userId = req.user.userId || req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify user exists
    let user = await User.findOne({ userId });
    if (!user && req.user.id) {
      user = await User.findById(req.user.id);
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
    const userId = req.user.userId || req.user.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify user exists
    let user = await User.findOne({ userId });
    if (!user && req.user.id) {
      user = await User.findById(req.user.id);
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
  getProfile,
  uploadProfilePhoto,
  deleteProfilePhoto
};
