const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { blacklistToken } = require('../middleware/authMiddleware');

// Create transporter for sending emails
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'test@example.com',
      pass: process.env.EMAIL_PASSWORD || 'password'
    }
  });
};

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role = 'user' } = req.body;

    // Validate input fields
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password too weak' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      status: 'pending',
    });

    await newUser.save();

    // Send welcome email with verification link
    await sendVerificationEmailToUser(newUser);

    res.status(201).json({ 
      message: 'User registered successfully',
      userId: newUser._id 
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    
    // Handle duplicate key error (e.g., unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or username already in use' });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create tokens
    const token = jwt.sign(
      { userId: user.userId, role: user.UserRoles }, 
      process.env.JWT_SECRET || 'testsecret', 
      { expiresIn: '1h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.userId }, 
      process.env.JWT_REFRESH_SECRET || 'refresh-testsecret', 
      { expiresIn: '7d' }
    );

    res.status(200).json({ 
      token,
      refreshToken,
      userId: user.userId,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.UserRoles
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/**
 * Handle OAuth login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const oauthLogin = async (req, res) => {
  try {
    const { tokenId, provider } = req.body;
    
    // Check if token and provider are provided
    if (!tokenId || !provider) {
      return res.status(400).json({ message: 'Token ID and provider are required' });
    }
    
    // Check if provider is supported
    const supportedProviders = ['google', 'facebook', 'apple'];
    if (!supportedProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ message: 'Provider not supported' });
    }
    
    // Placeholder for verifying token with provider (would use actual SDK in production)
    let userData;
    try {
      // Simulate token verification with provider
      if (provider.toLowerCase() === 'google') {
        // In a real app, we would use the Google API client library
        userData = { email: 'google@example.com', name: 'Google User', id: 'google123' };
      } else if (provider.toLowerCase() === 'facebook') {
        // In a real app, we would use the Facebook SDK
        userData = { email: 'facebook@example.com', name: 'Facebook User', id: 'facebook123' };
      } else if (provider.toLowerCase() === 'apple') {
        // In a real app, we would use the Apple Sign In API
        userData = { email: 'apple@example.com', name: 'Apple User', id: 'apple123' };
      }
    } catch (verificationError) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    // Find user by provider ID or email
    let user = await User.findOne({
      $or: [
        { [`${provider}Id`]: userData.id },
        { email: userData.email }
      ]
    });
    
    // Create user if not exists
    if (!user) {
      user = new User({
        username: userData.name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
        email: userData.email,
        [`${provider}Id`]: userData.id,
        isEmailVerified: true, // OAuth providers usually verify emails
        status: 'active',
        UserRoles: ['User']
      });
      
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.userId, roles: user.UserRoles },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_REFRESH_SECRET || 'refresh-testsecret',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      token,
      refreshToken,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        UserRoles: user.UserRoles
      }
    });
  } catch (error) {
    console.error('OAuth login error:', error.message);
    res.status(500).json({ message: 'Server error during OAuth login' });
  }
};

/**
 * Refresh access token using refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    // Verify the refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-testsecret');
      
      // Find the user
      const user = await User.findOne({ userId: decoded.userId });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: user.userId, roles: user.UserRoles }, 
        process.env.JWT_SECRET || 'testsecret', 
        { expiresIn: '1h' }
      );
      
      const newRefreshToken = jwt.sign(
        { userId: user.userId }, 
        process.env.JWT_REFRESH_SECRET || 'refresh-testsecret', 
        { expiresIn: '7d' }
      );
      
      res.json({ token: newAccessToken, refreshToken: newRefreshToken });
    } catch (error) {
      console.error('Error refreshing token:', error.message);
      
      // Always return 401 for any token verification error
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Server error refreshing token:', error.message);
    res.status(500).json({ message: 'Server error while refreshing token' });
  }
};

/**
 * Logout a user by blacklisting their token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    blacklistToken(token);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

/**
 * Request password reset email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    
    // Create transporter for sending email
    const transporter = createEmailTransporter();
    
    // Only send email if user exists, but don't indicate this in the response
    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.userId }, 
        process.env.JWT_RESET_SECRET || 'reset-testsecret', 
        { expiresIn: '15m' }
      );
      
      // Send reset email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'support@opencap.com',
        to: user.email,
        subject: 'OpenCap - Password Reset',
        html: `
          <h1>Password Reset</h1>
          <p>You have requested a password reset. Please click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}">
            Reset Password
          </a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        `
      });
    }
    
    // Always return success (for security reasons)
    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset request error:', error.message);
    res.status(500).json({ message: 'Server error processing reset request' });
  }
};

/**
 * Verify password reset token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    // Check if token is provided
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_RESET_SECRET || 'reset-testsecret');
    
    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Error verifying reset token:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ message: 'Server error verifying token' });
  }
};

/**
 * Reset user password with valid token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    
    // Check if all fields are provided
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password too weak' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || 'reset-testsecret');
    
    // Find user
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash new password - use a simpler approach that's easier to mock in tests
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();
    
    // Return success
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ message: 'Server error during password reset' });
  }
};

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user profile (excluding sensitive data)
    res.status(200).json(user.toJSON ? user.toJSON() : {
      userId: user.userId,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.UserRoles,
      isEmailVerified: user.isEmailVerified
    });
  } catch (error) {
    console.error('Get user profile error:', error.message);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username, email, firstName, lastName } = req.body;
    
    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      user.email = email;
      user.isEmailVerified = false; // Require re-verification of new email
    }
    
    // Update other fields if provided
    if (username) user.username = username;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    
    // Save updated user
    await user.save();
    
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error.message);
    
    // Handle duplicate key error (e.g., unique index violation)
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or username already in use' });
    }
    
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

/**
 * Send verification email to user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate verification token and send email
    const transporter = createEmailTransporter();
    
    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.userId }, 
      process.env.JWT_VERIFICATION_SECRET || 'verification-testsecret', 
      { expiresIn: '24h' }
    );
    
    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'support@opencap.com',
      to: user.email,
      subject: 'OpenCap - Verify Your Email',
      html: `
        <h1>Email Verification</h1>
        <p>Thank you for registering. Please click the link below to verify your email address:</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}">
          Verify Email
        </a>
        <p>This link will expire in 24 hours.</p>
      `
    });
    
    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification email error:', error.message);
    res.status(500).json({ message: 'Server error sending verification email' });
  }
};

/**
 * Verify user email with verification token
 * @param {Object} req - Express request object with token parameter
 * @param {Object} res - Express response object
 */
const verifyEmail = async (req, res) => {
  // Get token from params
  const { token } = req.params;

  // Check if token exists
  if (!token || token.trim() === '') {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET || 'verification-testsecret');
    
    // Get user from database
    const user = await User.findOne({ userId: decoded.userId });
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user verification status
    user.isEmailVerified = true;
    user.status = 'active';
    
    // Save user with updated verification status
    await user.save();
    
    // Return success response
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error.message);
    
    // Handle token verification errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired verification token' });
    }
    
    // Server error
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

/**
 * Check email verification token requirements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkVerificationToken = (req, res) => {
  return res.status(400).json({ message: 'Verification token is required' });
};

/**
 * Helper function to send verification email to user
 * @param {Object} user - User object
 */
const sendVerificationEmailToUser = async (user) => {
  // Generate verification token
  const verificationToken = jwt.sign(
    { userId: user.userId }, 
    process.env.JWT_VERIFICATION_SECRET || 'verification-testsecret', 
    { expiresIn: '24h' }
  );
  
  // Send verification email
  const transporter = createEmailTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'support@opencap.com',
    to: user.email,
    subject: 'OpenCap - Verify Your Email',
    html: `
      <h1>Email Verification</h1>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}">
        Verify Email
      </a>
      <p>This link will expire in 24 hours.</p>
    `
  });
};

module.exports = {
  registerUser,
  loginUser,
  oauthLogin,
  refreshToken,
  logout,
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  sendVerificationEmail,
  verifyEmail,
  checkVerificationToken,
  createEmailTransporter
};
