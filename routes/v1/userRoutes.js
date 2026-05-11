const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const settingsController = require('../../controllers/settingsController');
const { authenticate } = require('../../middleware/authMiddleware');
const { uploadSingle, handleUploadError } = require('../../middleware/profilePhotoUpload');

// Public routes
router.post('/', userController.createUser);

// Protected routes
router.use(authenticate);

// Get current user profile
router.get('/profile', userController.getProfile);

/**
 * @swagger
 * /api/v1/users/profile/photo:
 *   post:
 *     summary: Upload user profile photo
 *     description: Upload a profile photo for the authenticated user. Automatically generates a 200x200px thumbnail. Maximum file size 5MB. Supported formats - JPEG, PNG, GIF, WebP.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - photo
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file (JPEG, PNG, GIF, or WebP)
 *     responses:
 *       200:
 *         description: Profile photo uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 photoUrl:
 *                   type: string
 *                   format: uri
 *                   description: Presigned URL for the uploaded photo
 *                   example: https://storage.example.com/photos/profile-user_123-1234567890.jpg
 *                 thumbnailUrl:
 *                   type: string
 *                   format: uri
 *                   description: Presigned URL for the 200x200px thumbnail
 *                   example: https://storage.example.com/photos/profile-thumb-user_123-1234567890.jpg
 *                 message:
 *                   type: string
 *                   example: Profile photo uploaded successfully
 *       400:
 *         description: Bad request - invalid file type, size, or missing file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: File size exceeds maximum allowed size of 5MB
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete user profile photo
 *     description: Delete the profile photo for the authenticated user. Removes both the original photo and thumbnail from storage.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile photo deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Profile photo deleted successfully
 *       401:
 *         description: Unauthorized - authentication required
 *       404:
 *         description: User not found or no profile photo to delete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No profile photo to delete
 *       500:
 *         description: Internal server error
 */
router.post('/profile/photo', uploadSingle, handleUploadError, userController.uploadProfilePhoto);
router.delete('/profile/photo', userController.deleteProfilePhoto);

// User settings endpoints
router.get('/settings', settingsController.getUserSettings);
router.put('/settings', settingsController.updateUserSettings);
router.post('/settings/reset', settingsController.resetUserSettings);

// Get all users
router.get('/', userController.getAllUsers);

// Bulk delete users (admin only, requires confirmation, max 10)
// Issue #487: Prevent mass user wipe with safety guards
// NOTE: Must be registered before /:id to avoid route collision
router.post('/bulk-delete', userController.bulkDeleteUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user by ID
router.put('/:id', userController.updateUserById);

// Delete user by ID (soft-delete)
router.delete('/:id', userController.deleteUserById);

// Hard-delete user by ID (admin only, cleans up related data)
// Issue #485: Ensure orphaned data cleanup on user deletion
router.delete('/:id/hard', userController.hardDeleteUserById);

module.exports = router;
