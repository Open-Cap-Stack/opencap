'use strict';

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { auditAction } = require('../../middleware/auditLog');
const investorDatabaseController = require('../../controllers/investorDatabaseController');

// All routes require authentication but no role restriction —
// the investor database is a platform-wide directory for all users.
router.use(authenticateToken);

// Count must be before /:id to avoid being treated as an id param
router.get('/count', investorDatabaseController.countInvestors);

// List with filtering and pagination
router.get('/', auditAction('view_investor_db', 'investor_database'), investorDatabaseController.listInvestors);

// Single investor by id
router.get('/:id', auditAction('view_investor_db', 'investor_database'), investorDatabaseController.getInvestorById);

module.exports = router;
