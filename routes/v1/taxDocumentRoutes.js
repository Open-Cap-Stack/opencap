/**
 * Tax Document Routes
 * Issue #246: Implement Tax Document Download Endpoint
 *
 * Routes for tax document management including downloads
 * All routes require authentication
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const taxDocumentController = require('../../controllers/taxDocumentController');

/**
 * @route   GET /api/v1/tax-documents
 * @desc    List tax documents for authenticated user
 * @access  Private (authenticated users)
 * @query   taxYear - Filter by tax year
 * @query   type - Filter by document type (1099, W-2, etc.)
 * @query   status - Filter by status (Pending, Ready, etc.)
 */
router.get(
    '/',
    authenticateToken,
    hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'employee']),
    taxDocumentController.listTaxDocuments
);

/**
 * @route   GET /api/v1/tax-documents/:id
 * @desc    Get tax document metadata by ID
 * @access  Private (document owner, company staff, or admin)
 */
router.get(
    '/:id',
    authenticateToken,
    hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'employee']),
    taxDocumentController.getTaxDocument
);

/**
 * @route   GET /api/v1/tax-documents/:id/download
 * @desc    Download tax document file
 * @access  Private (document owner, company staff, or admin)
 */
router.get(
    '/:id/download',
    authenticateToken,
    hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'employee']),
    taxDocumentController.downloadTaxDocument
);

/**
 * @route   POST /api/v1/tax-documents
 * @desc    Create a new tax document
 * @access  Private (admin or system only)
 */
router.post(
    '/',
    authenticateToken,
    hasRole(['super_admin', 'admin', 'founder', 'accountant']),
    taxDocumentController.createTaxDocument
);

/**
 * @route   PUT /api/v1/tax-documents/:id
 * @desc    Update tax document metadata
 * @access  Private (admin or system only)
 */
router.put(
    '/:id',
    authenticateToken,
    hasRole(['admin', 'accountant', 'finance']),
    taxDocumentController.updateTaxDocument
);

/**
 * @route   DELETE /api/v1/tax-documents/:id
 * @desc    Delete tax document
 * @access  Private (admin only)
 */
router.delete(
    '/:id',
    authenticateToken,
    hasRole(['super_admin', 'admin']),
    taxDocumentController.deleteTaxDocument
);

module.exports = router;
