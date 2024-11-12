// __tests__/setup/test-app.js
const express = require('express');
const mongoose = require('mongoose');
const financialReportingRoutes = require('../../routes/financialReportingRoutes');

const app = express();

// Middleware
app.use(express.json());

// Routes - match the path from your main app.js
app.use('/api/financial-reports', financialReportingRoutes);

// Error handling middleware - match your main app.js format
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;