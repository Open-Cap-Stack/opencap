// routes/Company.js

const express = require('express');
const companyController = require('../controllers/Company');

const router = express.Router();

// POST /api/companies - Create a new company
router.post('/', companyController.createCompany);

// GET /api/companies - Get all companies
router.get('/', companyController.getAllCompanies);

// GET /api/companies/:id - Get company by ID
router.get('/:id', companyController.getCompanyById);

// PUT /api/companies/:id - Update company by ID
router.put('/:id', companyController.updateCompanyById);

// DELETE /api/companies/:id - Delete company by ID
router.delete('/:id', companyController.deleteCompanyById);

module.exports = router;
