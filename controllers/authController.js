const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { checkTokenBlacklist, blacklistToken } = require('../middleware/authMiddleware');

const { OAuth2Client } = require('google-auth-library'); // For Google OAuth (example)

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASS || 'password',
  },
});

// Helper function to validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers
  );
};

// Helper function to validate email format
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Register a new user with username and password
exports.registerUser = async (req, res) => {
  const { username, email, password, roles } = req.body;
  try {
    // Check if email or username already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      userId: new mongoose.Types.ObjectId().toString(),
      username,
      email,
      password: hashedPassword, // Assign hashedPassword here
      UserRoles: roles,
      Permissions: 'Standard', // You can customize this
      AuthenticationMethods: 'UsernamePassword',
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during user registration:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// User login with username and password
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    // Log the incoming request for debugging
    console.log('Login attempt:', { username, passwordProvided: !!password });

    // Check if the user exists
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password field is provided and the user has a password
    if (!password || !user.password) {
      console.log('Password not provided or user has no password');
      return res.status(400).json({ message: 'Password is required' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Invalid credentials');
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT tokens (access and refresh)
    const accessToken = jwt.sign(
      { userId: user.userId, roles: user.UserRoles }, 
      process.env.JWT_SECRET || 'testsecret', 
      { expiresIn: '1h' }
    ); 
    
    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_REFRESH_SECRET || 'refresh-testsecret',
      { expiresIn: '7d' }
    );
    
    // Log successful login
    console.log('Login successful:', { userId: user.userId, roles: user.UserRoles });
    
    // Send the tokens as the response
    res.json({ token: accessToken, refreshToken });
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// OAuth login (e.g., Google OAuth)
exports.oauthLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        userId: new mongoose.Types.ObjectId().toString(),
        username: name,
        email,
        UserRoles: ['Viewer'], // Default role for OAuth users
        Permissions: 'Standard',
        AuthenticationMethods: 'OAuth',
      });
      await user.save();
    }

    const accessToken = jwt.sign(
      { userId: user.userId, roles: user.UserRoles }, 
      process.env.JWT_SECRET || 'testsecret', 
      { expiresIn: '1h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_REFRESH_SECRET || 'refresh-testsecret',
      { expiresIn: '7d' }
    );

    res.json({ token: accessToken, refreshToken });
  } catch (error) {
    console.error('Error during OAuth login:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// New controllers for OCAE-203

// Refresh access token using refresh token
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }
  
  try {
    // Check if token is blacklisted
    if (checkTokenBlacklist(refreshToken)) {
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }
    
    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh-testsecret');
    
    // Get user from database
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
    
    // Return new tokens
    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('Error refreshing token:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout user (blacklist token)
exports.logout = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Add token to blacklist
    blacklistToken(token);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Request password reset email
exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  
  try {
    // Find user by email
    const user = await User.findOne({ email });
    
    // Generate reset token even if user doesn't exist (security best practice)
    // Only send email if user exists
    if (user) {
      const resetToken = jwt.sign(
        { userId: user.userId },
        process.env.JWT_RESET_SECRET || 'reset-testsecret',
        { expiresIn: '1h' }
      );
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'no-reply@opencap.com',
        to: email,
        subject: 'Password Reset Request',
        html: `
          <p>You requested a password reset.</p>
          <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
          <p>If you did not request this, please ignore this email.</p>
          <p>The link is valid for 1 hour.</p>
        `,
      });
    }
    
    // Always return 200 whether user exists or not (security best practice)
    res.status(200).json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Error requesting password reset:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify password reset token
exports.verifyResetToken = (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ message: 'Token is required' });
  }
  
  try {
    // Verify the token
    jwt.verify(token, process.env.JWT_RESET_SECRET || 'reset-testsecret');
    
    // If no error, token is valid
    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Error verifying reset token:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  
  // Validate inputs
  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  
  if (!validatePasswordStrength(newPassword)) {
    return res.status(400).json({ 
      message: 'Password must be at least 8 characters long and include uppercase, lowercase letters, and numbers' 
    });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || 'reset-testsecret');
    
    // Get user from database
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update user's password
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data (excluding sensitive fields)
    const userProfile = user.toJSON ? user.toJSON() : {
      userId: user.userId,
      username: user.username,
      email: user.email,
      UserRoles: user.UserRoles,
      Permissions: user.Permissions,
      AuthenticationMethods: user.AuthenticationMethods,
      // Exclude password and other sensitive fields
    };
    
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error getting user profile:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  const { username, email } = req.body;
  
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Validate email format if provided
    if (email && !validateEmailFormat(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Update user fields if provided
    if (username) user.username = username;
    if (email) user.email = email;
    
    await user.save();
    
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error.message);
    
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: 'Email or username already in use' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Send email verification
exports.sendVerificationEmail = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_VERIFICATION_SECRET || 'verification-testsecret',
      { expiresIn: '24h' }
    );
    
    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'no-reply@opencap.com',
      to: user.email,
      subject: 'Email Verification',
      html: `
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>The link is valid for 24 hours.</p>
      `,
    });
    
    res.status(200).json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Error sending verification email:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Verify email with token
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  
  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET || 'verification-testsecret');
    
    // Get user from database
    const user = await User.findOne({ userId: decoded.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user's email verification status
    user.isEmailVerified = true;
    await user.save();
    
    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error.message);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired verification token' });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};
