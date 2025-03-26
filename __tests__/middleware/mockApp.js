/**
 * Mock Express app for testing Swagger middleware in isolation
 * Feature: OCAE-210: Create comprehensive Swagger documentation
 */
const express = require('express');

// Create a simple Express app for testing
const mockApp = express();

// Track routes and middleware added to the mock app
mockApp.routes = [];
mockApp.middlewares = [];

// Store original use and get methods
const originalUse = mockApp.use;
const originalGet = mockApp.get;

// Override use method to track middleware
mockApp.use = function(...args) {
  // Store middleware for inspection
  this.middlewares.push(args);
  // Call original method
  return originalUse.apply(this, args);
};

// Override get method to track routes
mockApp.get = function(path, ...handlers) {
  // Store route for inspection
  this.routes.push({ method: 'GET', path, handlers });
  // Call original method
  return originalGet.apply(this, arguments);
};

module.exports = mockApp;
