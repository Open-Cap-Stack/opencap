const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { authenticate } = require('../../middleware/authMiddleware');

// Public routes
router.post('/', userController.createUser);

// Protected routes
router.use(authenticate);

// Get current user profile
router.get('/profile', userController.getProfile);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Update user by ID
router.put('/:id', userController.updateUserById);

// Delete user by ID
router.delete('/:id', userController.deleteUserById);

module.exports = router;
