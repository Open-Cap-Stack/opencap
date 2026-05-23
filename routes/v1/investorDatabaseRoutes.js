'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const investorDatabaseController = require('../../controllers/investorDatabaseController');

// All routes require authentication
router.use(authenticateToken);

// Count must be before /:id to avoid being treated as an id param
router.get('/count', investorDatabaseController.countInvestors);

// List with filtering and pagination
router.get('/', investorDatabaseController.listInvestors);

// Single investor by id
router.get('/:id', investorDatabaseController.getInvestorById);

module.exports = router;
