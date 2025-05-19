/**
 * Authentication Controller
 * 
 * [Feature] OCAE-202: Implement user registration endpoint
 * [Feature] OCAE-303: Implement password reset functionality
 * [Bug] OCDI-302: Fix User Authentication Test Failures
 * 
 * Contains methods for user registration, authentication, and profile management.
 */

const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const mongoose = require('mongoose');
const { blacklistToken } = require('../middleware/authMiddleware');
const mongoDbConnection = require('../utils/mongoDbConnection');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Create transporter for sending emails
 * @returns {Object} Nodemailer transporter object
 */
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
 * Feature: OCAE-202: Implement user registration endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword, role = 'user', companyId } = req.body;

    // Validate required fields
    const errors = [];
    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }

    // Validate email format
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if passwords match when confirmPassword is provided
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Check for password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Validate role is one of the allowed values
    const allowedRoles = ['admin', 'manager', 'user', 'client'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        message: `Role must be one of: ${allowedRoles.join(', ')}`
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Generate a userId if not provided (using email prefix + timestamp for uniqueness)
    const userId = req.body.userId || 
                 `${email.split('@')[0]}_${Date.now().toString(36).slice(-6)}`;
    
    // Create user object
    const userData = {
      userId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      companyId,
      status: isDevelopment ? 'active' : 'pending' // Auto-activate in development
    };
    
    // Only add verification token if not in development
    if (!isDevelopment) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      userData.verificationToken = verificationToken;
      userData.verificationTokenExpires = verificationTokenExpires;
    }

    // Create user
    const user = new User(userData);

    // Save user to database
    await user.save();

    // Send verification email in background if not in development
    if (!isDevelopment) {
      await sendVerificationEmailToUser(user);
    }

    // Generate auth token for immediate login in development
    let token;
    if (isDevelopment) {
      token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    }

    // Return success response
    const response = {
      success: true,
      message: isDevelopment 
        ? 'Registration successful. You are now logged in.'
        : 'Registration successful. Please check your email to verify your account.',
      userId: user._id
    };
    
    if (isDevelopment) {
      response.token = token;
    }
    
    return res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Log the incoming request for debugging
    console.log('Login attempt:', { email, passwordProvided: !!password });

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.userId || user._id, role: user.role },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.userId || user._id },
      process.env.JWT_REFRESH_SECRET || 'refresh-testsecret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * OAuth login (Google, Facebook, etc.)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const oauthLogin = async (req, res) => {
  try {
    const { token, provider } = req.body;

    if (!token || !provider) {
      return res.status(400).json({ message: 'Token and provider are required' });
    }

    let userInfo;

    // Verify token based on provider
    if (provider === 'google') {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        userInfo = ticket.getPayload();
      } catch (error) {
        return res.status(401).json({ message: 'Invalid OAuth token' });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported OAuth provider' });
    }

    // Check if user exists
    let user = await User.findOne({ email: userInfo.email });

    // Create user if not exists
    if (!user) {
      // Create a new user
      const userId = new mongoose.Types.ObjectId().toString();
      user = new User({
        userId,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        email: userInfo.email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
        role: 'user',
        status: 'active',
        emailVerified: true,
        oauthProvider: provider,
        oauthId: userInfo.sub
      });

      await user.save();
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.userId || user._id, role: user.role },
      process.env.JWT_SECRET || 'testsecret',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.userId || user._id },
      process.env.JWT_REFRESH_SECRET || 'refresh-testsecret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      message: 'OAuth login successful',
      accessToken,
      refreshToken,
      user: userResponse
    });
  } catch (error) {
    console.error('OAuth login error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Refresh access token using refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh-testsecret');

      // Find user
      const user = await User.findOne({
        $or: [
          { _id: decoded.userId },
          { userId: decoded.userId }
        ]
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: user.userId || user._id, role: user.role },
        process.env.JWT_SECRET || 'testsecret',
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        message: 'Token refreshed successfully',
        accessToken
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Token refresh error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Logout a user by blacklisting their token
 * Updated for: [Bug] OCDI-302: Fix User Authentication Test Failures
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = async (req, res) => {
  try {
    // Get the token from the request (added by the authenticateToken middleware)
    const token = req.token;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    // Blacklist the token to prevent reuse using the improved function
    const success = await blacklistToken(token);
    
    if (!success) {
      return res.status(500).json({ message: 'Failed to invalidate token' });
    }
    
    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request password reset email
 * Feature: OCAE-303: Implement password reset functionality
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Only generate token and send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.userId || user._id },
        process.env.JWT_RESET_SECRET || 'reset-testsecret',
        { expiresIn: '1h' }
      );

      // Send reset email
      const transporter = createEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'support@opencap.com',
        to: user.email,
        subject: 'OpenCap - Password Reset',
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset. Please click the link below to reset your password:</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      });
    }

    // For security reasons, still return success even if user doesn't exist
    return res.status(200).json({ 
      message: 'If an account exists with that email, a password reset link has been sent' 
    });
  } catch (error) {
    console.error('Password reset request error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify reset token
 * Feature: OCAE-303: Implement password reset functionality
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params || req.body;
    
    // Check if token is provided
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    try {
      // Verify token in a nested try-catch to ensure proper error handling
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || 'reset-testsecret');
      
      try {
        // Check if user exists - wrap in another try-catch to separate database errors
        const user = await User.findOne({
          $or: [
            { _id: decoded.userId },
            { userId: decoded.userId }
          ]
        });
        
        // If user not found
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Token is valid
        return res.status(200).json({ 
          message: 'Token is valid', 
          userId: decoded.userId 
        });
      } catch (dbError) {
        // Database errors should return 500
        console.error('Token verification error:', dbError.message);
        return res.status(500).json({ message: 'Internal server error' });
      }
    } catch (tokenError) {
      // Handle JWT errors - always return 400 for invalid tokens
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reset user password with valid token
 * Feature: OCAE-303: Implement password reset functionality
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Validate inputs
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Validate password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    try {
      // Verify token - wrap this in another try-catch to return 400 instead of 500
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || 'reset-testsecret');
      
      try {
        // Database operations in separate try-catch for proper error handling
        // Find user
        const user = await User.findOne({
          $or: [
            { _id: decoded.userId },
            { userId: decoded.userId }
          ]
        });
        
        // If user not found
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update user's password
        if (user.userId) {
          await User.findOneAndUpdate(
            { userId: user.userId },
            { password: hashedPassword },
            { new: true }
          );
        } else {
          await User.findByIdAndUpdate(
            user._id,
            { password: hashedPassword },
            { new: true }
          );
        }
        
        return res.status(200).json({ message: 'Password has been reset successfully' });
      } catch (dbError) {
        // Database errors should return 500
        console.error('Password reset error:', dbError.message);
        return res.status(500).json({ message: 'Internal server error' });
      }
    } catch (tokenError) {
      // Handle JWT errors - always return 400 for invalid tokens
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Password reset error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserProfile = async (req, res) => {
  try {
    // User ID is attached to req.user by the auth middleware
    const userId = req.user.userId;

    // Find user
    const user = await User.findOne({
      $or: [
        { _id: userId },
        { userId: userId }
      ]
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Get profile error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserProfile = async (req, res) => {
  try {
    // User ID is attached to req.user by the auth middleware
    const userId = req.user.userId;
    const { firstName, lastName, email, currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findOne({
      $or: [
        { _id: userId },
        { userId: userId }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic info
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    
    // Update email if provided and different
    if (email && email !== user.email) {
      // Check if email is already used by another user
      const existingUser = await User.findOne({ email });
      if (existingUser && (existingUser._id.toString() !== userId.toString()) && 
          (existingUser.userId !== userId)) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      user.email = email;
      user.emailVerified = false;
      
      // Send verification email for new email
      await sendVerificationEmailToUser(user);
    }

    // Update password if both current and new passwords are provided
    if (currentPassword && newPassword) {
      // Validate current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Validate new password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: 'New password does not meet requirements' });
      }

      // Hash and set new password
      user.password = await bcrypt.hash(newPassword, 10);
    }

    // Save updates
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send verification email to user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendVerificationEmail = async (req, res) => {
  try {
    // User ID is attached to req.user by the auth middleware
    const userId = req.user.userId;

    // Find user
    const user = await User.findOne({
      $or: [
        { _id: userId },
        { userId: userId }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    // Send verification email
    await sendVerificationEmailToUser(user);

    return res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Send verification email error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify user email with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET || 'verification-testsecret');

      // Find user
      const user = await User.findOne({
        $or: [
          { _id: decoded.userId },
          { userId: decoded.userId }
        ]
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Mark email as verified
      user.emailVerified = true;
      await user.save();

      return res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }
  } catch (error) {
    console.error('Email verification error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Check verification token
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
    { userId: user.userId || user._id }, 
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

// Export all controller functions
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
