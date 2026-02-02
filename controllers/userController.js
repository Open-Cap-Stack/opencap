/**
 * User Controller
 *
 * Handles user management operations with ZeroDB migration support.
 * Uses DatabaseAdapter for abstracted database operations.
 *
 * Issue #15: Migrate User controller to ZeroDB
 */

const databaseAdapter = require('../services/databaseAdapter');

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
    // Check if email already exists using databaseAdapter
    const existingUser = await databaseAdapter.findOne('User', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Create user using databaseAdapter
    const user = await databaseAdapter.create('User', {
      userId,
      name,
      username,
      email,
      password,
      role
    });
    res.status(201).json(user);
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
    // Use databaseAdapter.find for fetching all users
    const users = await databaseAdapter.find('User', {}, {});
    res.status(200).json(users);
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
    // Use databaseAdapter.findById for fetching user by ID
    const user = await databaseAdapter.findById('User', req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
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
      user = await databaseAdapter.findOne('User', { userId: req.user.userId }, { select: '-password' });
    }
    // Fall back to _id if userId not found
    if (!user && req.user.id) {
      user = await databaseAdapter.findById('User', req.user.id, { select: '-password' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
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
    // Use databaseAdapter.findByIdAndUpdate for updating user
    const updatedUser = await databaseAdapter.findByIdAndUpdate(
      'User',
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(updatedUser);
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
    // Use databaseAdapter.findByIdAndDelete for deleting user
    const deletedUser = await databaseAdapter.findByIdAndDelete('User', req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  getProfile
};
