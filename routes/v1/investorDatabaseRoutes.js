'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const investorDatabaseController = require('../../controllers/investorDatabaseController');

// All routes require authentication
router.use(authenticateToken);

// Count must be before /:id to avoid being treated as an id param
router.get('/count', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorDatabaseController.countInvestors);

// List with filtering and pagination
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorDatabaseController.listInvestors);

// Single investor by id
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorDatabaseController.getInvestorById);

module.exports = router;
