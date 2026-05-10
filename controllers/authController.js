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
const { isValidObjectId } = require('../utils/inputSanitizer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { blacklistToken, isTokenBlacklisted, provisionAINativeUser } = require('../middleware/authMiddleware');
const { sanitizeUser } = require('../utils/sanitizeUser');

// AINative API URL for token validation
const AINATIVE_API_URL = process.env.AINATIVE_API_URL || process.env.ZERODB_BASE_URL || 'https://api.ainative.studio';

// Initialize Google OAuth client only when configured
const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

/**
 * Create transporter for sending emails
 * @returns {Object} Nodemailer transporter object
 */
const createEmailTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD environment variables are required');
  }
  
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
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
    const { firstName, lastName, password, confirmPassword, role = 'user', companyId } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;

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

    // Validate email format (supports + tags, international TLDs)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }

    // Validate role matches User model schema
    const allowedRoles = ['admin', 'founder', 'investor', 'manager', 'user', 'client'];
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

    // Hash password (User.create also checks, but we hash here to control salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Generate a userId if not provided
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
      // Require email verification only when SMTP is configured
      status: (isDevelopment || !process.env.EMAIL_HOST) ? 'active' : 'pending'
    };

    // Only add verification token when SMTP is configured and can send the email
    if (!isDevelopment && process.env.EMAIL_HOST) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      userData.verificationToken = verificationToken;
      userData.verificationTokenExpires = verificationTokenExpires;
    }

    // Create user using ZeroDB pattern
    const user = await User.create(userData);

    // Send verification email in background if not in development
    if (!isDevelopment) {
      sendVerificationEmailToUser(user).catch(err =>
        console.error('Failed to send verification email:', err.message)
      );
    }

    // Generate auth token for immediate login in development
    let token;
    if (isDevelopment) {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      token = jwt.sign(
        {
          userId: user.userId || user._id,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          companyId: user.companyId || null
        },
        process.env.JWT_SECRET,
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
    const { password } = req.body;
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

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

    const userId = user.userId || user._id;

    // Generate tokens with full claims
    const accessToken = jwt.sign(
      {
        userId,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        companyId: user.companyId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login timestamp (fire-and-forget)
    User.updateLastLogin(userId).catch(() => {});

    // Remove sensitive fields from response
    const userResponse = sanitizeUser(user);

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
    const { token, provider, code, redirect_uri } = req.body;

    if (!provider) {
      return res.status(400).json({ message: 'Provider is required' });
    }

    let userInfo;

    // Verify token based on provider
    if (provider === 'google') {
      if (!token) {
        return res.status(400).json({ message: 'Token is required for Google OAuth' });
      }
      if (!googleClient) {
        return res.status(503).json({ message: 'Google OAuth not configured' });
      }
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        userInfo = ticket.getPayload();
      } catch (error) {
        return res.status(401).json({ message: 'Invalid Google OAuth token' });
      }
    } else if (provider === 'linkedin') {
      if (!code) {
        return res.status(400).json({ message: 'Authorization code is required for LinkedIn OAuth' });
      }

      const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
      const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;

      if (!linkedinClientId || !linkedinClientSecret) {
        return res.status(503).json({ message: 'LinkedIn OAuth not configured on server' });
      }

      try {
        // Exchange authorization code for access token
        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirect_uri || '',
          client_id: linkedinClientId,
          client_secret: linkedinClientSecret,
        });

        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.text();
          console.error('LinkedIn token exchange failed:', errorData);
          return res.status(401).json({ message: 'LinkedIn authorization code exchange failed' });
        }

        const tokenData = await tokenResponse.json();

        // Get user info from LinkedIn using the access token
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!profileResponse.ok) {
          return res.status(401).json({ message: 'Failed to retrieve LinkedIn profile' });
        }

        const profileData = await profileResponse.json();

        userInfo = {
          email: profileData.email,
          given_name: profileData.given_name || profileData.name?.split(' ')[0] || '',
          family_name: profileData.family_name || profileData.name?.split(' ').slice(1).join(' ') || '',
          sub: profileData.sub || profileData.id,
        };
      } catch (error) {
        console.error('LinkedIn OAuth error:', error.message);
        return res.status(401).json({ message: 'LinkedIn authentication failed' });
      }
    } else if (provider === 'github') {
      if (!code) {
        return res.status(400).json({ message: 'Authorization code is required for GitHub OAuth' });
      }

      const githubClientId = process.env.GITHUB_CLIENT_ID;
      const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!githubClientId || !githubClientSecret) {
        return res.status(503).json({ message: 'GitHub OAuth not configured on server' });
      }

      try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: githubClientId,
            client_secret: githubClientSecret,
            code,
            redirect_uri: redirect_uri || '',
          }),
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error || !tokenData.access_token) {
          return res.status(401).json({ message: 'GitHub authorization code exchange failed' });
        }

        // Fetch user profile
        const profileResponse = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            'User-Agent': 'OpenCapStack',
          },
        });
        const profileData = await profileResponse.json();

        // GitHub may not expose email publicly — fetch via emails endpoint
        let email = profileData.email;
        if (!email) {
          const emailsResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'User-Agent': 'OpenCapStack',
            },
          });
          const emails = await emailsResponse.json();
          const primary = emails.find(e => e.primary && e.verified);
          email = primary?.email || emails[0]?.email || null;
        }

        if (!email) {
          return res.status(400).json({ message: 'GitHub account does not have a verified email address' });
        }

        const nameParts = (profileData.name || profileData.login || '').split(' ');
        userInfo = {
          email,
          given_name: nameParts[0] || profileData.login,
          family_name: nameParts.slice(1).join(' ') || '',
          sub: String(profileData.id),
        };
      } catch (error) {
        console.error('GitHub OAuth error:', error.message);
        return res.status(401).json({ message: 'GitHub authentication failed' });
      }
    } else {
      return res.status(400).json({ message: 'Unsupported OAuth provider' });
    }

    // Normalize email
    userInfo.email = (userInfo.email || '').trim().toLowerCase();

    // Check if user already exists (Issue #382 - race condition fix)
    let user = await User.findOne({ email: userInfo.email });

    if (!user) {
      // User does not exist yet - create a new account.
      // Wrap in try/catch to handle race condition:
      // If two concurrent OAuth requests both pass the findOne check,
      // the second create will fail. We catch that and re-fetch instead.
      try {
        user = await User.create({
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
      } catch (createError) {
        // If creation failed due to a duplicate (race condition),
        // the other request already created the user - fetch it
        console.warn('OAuth user creation conflict, re-fetching existing user:', createError.message);
        user = await User.findOne({ email: userInfo.email });
        if (!user) {
          // If we still cannot find the user, something else went wrong
          throw createError;
        }
      }
    }

    // Update last login timestamp for both new and existing users
    try {
      await User.updateOne(
        { email: userInfo.email },
        { $set: { lastLogin: new Date() } }
      );
    } catch (updateError) {
      // Non-critical: log but do not fail the login
      console.warn('Failed to update lastLogin for OAuth user:', updateError.message);
    }

    const userId = user.userId || user._id;

    // Generate tokens (same claim shape as login)
    const accessToken = jwt.sign(
      {
        userId,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        companyId: user.companyId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Remove sensitive fields from response
    const userResponse = sanitizeUser(user);

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

    // Check if refresh token has been blacklisted (e.g. after logout)
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ message: 'Refresh token has been revoked' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Find user by userId (ZeroDB-compatible — no $or)
    const userId = decoded.userId;
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.findOne({ _id: userId });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is still active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    const resolvedUserId = user.userId || user._id;

    // Generate new access token (same claims as login)
    const accessToken = jwt.sign(
      {
        userId: resolvedUserId,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        companyId: user.companyId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken
    });
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
    // Get the access token from the request (set by authenticateToken middleware)
    const token = req.token;

    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }

    // Blacklist the access token
    const success = await blacklistToken(token);

    if (!success) {
      return res.status(500).json({ message: 'Failed to invalidate token' });
    }

    // Also blacklist the refresh token if provided
    const { refreshToken: refreshTokenValue } = req.body || {};
    if (refreshTokenValue) {
      await blacklistToken(refreshTokenValue);
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
    const email = req.body.email ? req.body.email.trim().toLowerCase() : null;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    // Only generate token and send email if user exists
    if (user) {
      // If SMTP is not configured, return graceful degradation instead of crashing
      if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('Password reset requested but SMTP not configured — skipping email send');
        return res.status(200).json({
          message: 'If an account exists with that email, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetSecret = process.env.JWT_RESET_SECRET || process.env.JWT_SECRET;
      const resetToken = jwt.sign(
        { userId: user.userId || user._id },
        resetSecret,
        { expiresIn: '1h' }
      );

      // Send reset email
      const transporter = createEmailTransporter();
      const resetUrl = `${process.env.FRONTEND_URL || 'https://opencapstack.com'}/reset-password?token=${resetToken}`;
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@news.ainative.studio',
        to: user.email,
        subject: 'OpenCap Stack — Password Reset',
        html: `
          <h1>Password Reset</h1>
          <p>You requested a password reset for your OpenCap Stack account.</p>
          <p>Click the link below to set a new password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Reset Password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <hr/>
          <p style="font-size:12px;color:#6b7280;">OpenCap Stack — Cap Table Management</p>
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

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Find user (ZeroDB-compatible — no $or)
    const userId = decoded.userId;
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.findOne({ _id: userId });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Token is valid',
      userId: decoded.userId
    });
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
    const token = req.body.token || req.params.token;
    const { password } = req.body;

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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_RESET_SECRET || process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Find user (ZeroDB-compatible — no $or)
    const userId = decoded.userId;
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.findOne({ _id: userId });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findOneAndUpdate(
      { userId: user.userId || user._id },
      { password: hashedPassword },
      { new: true }
    );

    return res.status(200).json({ message: 'Password has been reset successfully' });
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

    // Find user - first try by userId field, then by _id if it looks like an ObjectId
    let user;
    
    // Try finding by userId field first (for string userIds like "admin-001")
    let foundUser = await User.findOne({ userId: userId });

    // If not found and userId looks like an ObjectId, try _id field
    if (!foundUser && isValidObjectId(userId)) {
      foundUser = await User.findById(userId);
    }

    // Remove sensitive fields from response
    if (foundUser) {
      user = sanitizeUser(foundUser);
    }

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
    const { firstName, lastName, email, currentPassword, newPassword, companyId } = req.body;

    // Find user - first try by userId field, then by _id if it looks like an ObjectId
    let user = await User.findOne({ userId: userId });

    // If not found and userId looks like an ObjectId, try _id field
    if (!user && isValidObjectId(userId)) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build update object
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (companyId) updates.companyId = companyId;

    // Update email if provided and different
    if (email && email !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      // Check if email is already used by another user
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser && existingUser.userId !== userId && existingUser._id !== userId) {
        return res.status(400).json({ message: 'Email already in use' });
      }

      updates.email = normalizedEmail;
      updates.emailVerified = false;

      // Send verification email for new email (fire-and-forget)
      sendVerificationEmailToUser({ ...user, email: normalizedEmail }).catch(err =>
        console.error('Failed to send verification email:', err.message)
      );
    }

    // Update password if both current and new passwords are provided
    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: 'New password does not meet requirements' });
      }

      updates.password = await bcrypt.hash(newPassword, 10);
    }

    // Persist updates via ZeroDB-compatible call
    const updatedUser = await User.findOneAndUpdate(
      { userId: user.userId || user._id },
      updates,
      { new: true }
    );

    const userResponse = sanitizeUser(updatedUser || { ...user, ...updates });

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

    // Find user - first try by userId field, then by _id if it looks like an ObjectId
    let user = await User.findOne({ userId: userId });

    // If not found and userId looks like an ObjectId, try _id field
    if (!user && isValidObjectId(userId)) {
      user = await User.findById(userId);
    }

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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Find user (ZeroDB-compatible — no $or)
    const userId = decoded.userId;
    let user = await User.findOne({ userId });
    if (!user) {
      user = await User.findOne({ _id: userId });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark email as verified and activate account
    await User.findOneAndUpdate(
      { userId: user.userId || user._id },
      { emailVerified: true, status: 'active' },
      { new: true }
    );

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Helper function to send verification email to user
 * @param {Object} user - User object
 */
const sendVerificationEmailToUser = async (user) => {
  // Generate verification token
  const verificationToken = jwt.sign(
    { userId: user.userId || user._id }, 
    process.env.JWT_VERIFICATION_SECRET, 
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

/**
 * Exchange an AINative token for a local JWT
 * This avoids slow AINative API round-trips on every subsequent request.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const exchangeAINativeToken = async (req, res) => {
  try {
    const { ainativeToken } = req.body;

    if (!ainativeToken) {
      return res.status(400).json({ message: 'ainativeToken is required' });
    }

    // Validate token against AINative /api/v1/auth/me
    let ainativeUser;
    try {
      const response = await axios.get(`${AINATIVE_API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${ainativeToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      ainativeUser = {
        userId: response.data.id,
        email: (response.data.email || '').trim().toLowerCase(),
        name: response.data.name,
        role: 'user',
        permissions: [],
        isAINativeUser: true
      };
    } catch (error) {
      return res.status(401).json({ message: 'Invalid AINative token' });
    }

    // Provision or retrieve local user record
    const localUser = await provisionAINativeUser(ainativeUser);

    const userId = localUser.userId;
    const displayName = localUser.displayName || localUser.name || ainativeUser.name;

    // Generate local JWT (same claim shape as login)
    const accessToken = jwt.sign(
      {
        userId,
        email: localUser.email,
        role: localUser.role || 'user',
        permissions: localUser.permissions || [],
        companyId: localUser.companyId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const localRefreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Token exchanged successfully',
      accessToken,
      refreshToken: localRefreshToken,
      user: {
        userId,
        email: localUser.email,
        name: displayName,
        role: localUser.role || 'user',
        permissions: localUser.permissions || [],
        companyId: localUser.companyId
      }
    });
  } catch (error) {
    console.error('Token exchange error:', error.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
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
  exchangeAINativeToken
};
