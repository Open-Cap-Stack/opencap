/**
 * OpenCap Test Endpoints for Middleware Testing
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module provides test routes used exclusively for testing middleware
 * functionality in the OpenCap API.
 */

const express = require('express');
const zlib = require('zlib');
const { testRateLimiter } = require('./security/rateLimit');

// Create a router for test endpoints
const testRouter = express.Router();

// Test endpoint for body parser
testRouter.post('/test-body-parser', (req, res) => {
  res.status(200).json({
    receivedData: req.body,
    success: true
  });
});

// Test endpoint for cookies
testRouter.get('/test-cookie-parser', (req, res) => {
  // Read cookies and set a test cookie for response
  const cookies = req.cookies || {};
  
  // Set a test cookie in response
  res.cookie('testResponseCookie', 'cookieValue', { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.status(200).json({
    cookies,
    success: true
  });
});

// Test endpoint for compression
testRouter.get('/test-compression', (req, res) => {
  // Generate a large response to trigger compression
  const largeData = {};
  for (let i = 0; i < 1000; i++) {
    largeData[`key${i}`] = 'This is some test data that should be compressed when sent to the client. '.repeat(5);
  }
  
  res.status(200).json({
    data: largeData,
    success: true
  });
});

// Test endpoint for rate limiting
testRouter.get('/rate-limit-test', testRateLimiter, (req, res) => {
  res.status(200).json({
    message: 'Rate limit test endpoint',
    remainingRequests: req.rateLimit ? req.rateLimit.remaining : 'unknown',
    success: true
  });
});

// Test root endpoint for verifying security headers
testRouter.get('/', (req, res) => {
  res.status(200).json({
    message: 'Test root endpoint for middleware testing',
    success: true
  });
});

module.exports = testRouter;
