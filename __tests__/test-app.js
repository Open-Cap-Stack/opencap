// __tests__/test-app.js
const express = require('express');
const financialReportingRoutes = require('../routes/financialReportingRoutes');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api', financialReportingRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Server error'
  });
});

module.exports = app;