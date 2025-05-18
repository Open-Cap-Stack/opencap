/**
 * Email Utility
 * 
 * This module provides functions for sending emails, including verification emails.
 * It's designed to work with different email providers and includes retry logic.
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create a test account for development
const createTestAccount = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    return {
      user: testAccount.user,
      pass: testAccount.pass,
      smtp: { host: 'smtp.ethereal.email', port: 587, secure: false },
      from: `"OpenCap" <${testAccount.user}>`
    };
  } catch (error) {
    logger.error('Error creating test email account:', error);
    throw error;
  }
};

// Configure email transporter based on environment
const getTransporter = async () => {
  // In test environment, use Ethereal email
  if (process.env.NODE_ENV === 'test') {
    const testAccount = await createTestAccount();
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  // In production, use environment variables
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
 * Send a verification email to a user
 * @param {Object} user - The user object containing email and verification token
 * @param {string} verificationUrl - The verification URL to include in the email
 * @returns {Promise<Object>} - The result of the email sending operation
 */
const sendVerificationEmail = async (user, verificationUrl) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@opencap.com',
      to: user.email,
      subject: 'Verify Your Email Address',
      html: `
        <h1>Welcome to OpenCap!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">Verify Email</a>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

/**
 * Send a password reset email
 * @param {Object} user - The user object
 * @param {string} resetUrl - The password reset URL
 * @returns {Promise<Object>} - The result of the email sending operation
 */
const sendPasswordResetEmail = async (user, resetUrl) => {
  try {
    const transporter = await getTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@opencap.com',
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      console.log('Password reset email sent:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
