const User = require('../models/User');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library'); // For Google OAuth (example)
const nodemailer = require('nodemailer');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Register a new user
 * Feature: OCAE-202: Implement user registration endpoint
 */
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, companyId } = req.body;
    
    // Validate required fields
    const errors = [];
    if (!firstName) errors.push('First name is required');
    if (!lastName) errors.push('Last name is required');
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (!role) errors.push('Role is required');
    
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    
    // Validate email format
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Check for password complexity (at least one uppercase, one lowercase, one number, one special char)
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

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user object with a unique userId
    const userId = new mongoose.Types.ObjectId().toString();
    const newUser = new User({
      userId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      status: 'pending',
      companyId: companyId || null
    });

    // Save user to database
    await newUser.save();
    
    // Return success with user data (password is automatically excluded by the toJSON method in the User model)
    res.status(201).json({
      message: 'User registered successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// User login with email and password
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Log the incoming request for debugging
    console.log('Login attempt:', { email, passwordProvided: !!password });

    // Check if the user exists - try to find by email
    const user = await User.findOne({ email });
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

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user.userId, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    ); 
    
    // Log successful login
    console.log('Login successful:', { userId: user.userId, role: user.role });
    
    // Send the token as the response
    res.json({ token });
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

    // Check if user exists
    let user = await User.findOne({ email });
    if (!user) {
      // Create a new user
      const userId = new mongoose.Types.ObjectId().toString();
      user = new User({
        userId,
        firstName: name.split(' ')[0] || 'OAuth',
        lastName: name.split(' ').slice(1).join(' ') || 'User',
        email,
        role: 'user',
        status: 'active',
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ userId: user.userId, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: jwtToken });
  } catch (error) {
    console.error('Error during OAuth login:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Request a password reset email
 * Feature: OCAE-303: Implement password reset functionality
 */
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    // Only generate token and send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.userId },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'user@example.com',
          pass: process.env.EMAIL_PASS || 'password'
        }
      });
      
      // Reset link with token
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      
      // Email options
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@opencap.com',
        to: email,
        subject: 'OpenCap - Password Reset Request',
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      };
      
      // Send the email
      await transporter.sendMail(mailOptions);
    }
    
    // Always return the same response whether user exists or not (for security)
    return res.status(200).json({ 
      message: 'If an account exists with that email, a password reset link has been sent' 
    });
    
  } catch (error) {
    console.error('Password reset request error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify a password reset token
 * Feature: OCAE-303: Implement password reset functionality
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Validate token
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }
    
    try {
      // Verify token in a nested try-catch to ensure proper error handling
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
      
      try {
        // Check if user exists - wrap in another try-catch to separate database errors
        const user = await User.findOne({ userId: decoded.userId });
        
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
 */
exports.resetPassword = async (req, res) => {
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
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
      
      try {
        // Database operations in separate try-catch for proper error handling
        // Find user
        const user = await User.findOne({ userId: decoded.userId });
        
        // If user not found
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update user's password
        await User.findOneAndUpdate(
          { userId: user.userId },
          { password: hashedPassword },
          { new: true }
        );
        
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
