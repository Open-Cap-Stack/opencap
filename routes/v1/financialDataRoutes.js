/**
 * Financial Data Import/Export Routes
 * 
 * [Feature] OCDI-201: Implement financial data import/export
 * 
 * API endpoints for importing and exporting financial data in various formats
 * including CSV, Excel, JSON, and integration with external accounting systems.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const financialDataService = require('../../services/financialDataService');
const { authenticateJWT } = require('../../middleware/jwtAuth');
const { requireRole } = require('../../middleware/rbacMiddleware');
const { securityLogger } = require('../../middleware/securityAuditLogger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['.csv', '.json', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExt}`), false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/financial-data/import:
 *   post:
 *     tags: [Financial Data]
 *     summary: Import financial data
 *     description: Import financial data from CSV, Excel, or JSON files
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The file to import
 *               importType:
 *                 type: string
 *                 enum: [transactions, financial_reports, spv_data, chart_of_accounts]
 *                 description: Type of data being imported
 *               companyId:
 *                 type: string
 *                 description: Company ID for the imported data
 *               format:
 *                 type: string
 *                 enum: [csv, json, xlsx]
 *                 description: File format
 *     responses:
 *       200:
 *         description: Import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 recordsProcessed:
 *                   type: integer
 *                 recordsSuccessful:
 *                   type: integer
 *                 recordsFailed:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid request or validation errors
 *       403:
 *         description: Insufficient permissions
 */
router.post('/import', requireRole(['admin', 'financial_manager']), upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    const { importType, companyId, format } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!importType) {
      return res.status(400).json({ error: 'Import type is required' });
    }
    
    filePath = req.file.path;
    const fileFormat = format || path.extname(req.file.originalname).slice(1);
    
    // Validate permissions for company access
    if (companyId && !await validateCompanyAccess(req.user.id, companyId)) {
      return res.status(403).json({ error: 'Access denied to specified company' });
    }
    
    // Perform import
    const importResult = await financialDataService.importFinancialData(
      filePath, 
      fileFormat, 
      {
        companyId,
        userId: req.user.id,
        importType
      }
    );
    
    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      success: true,
      message: 'Import completed',
      ...importResult
    });
    
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.error('Import error:', error);
    res.status(500).json({ 
      error: error.message,
      success: false
    });
  }
});

/**
 * @swagger
 * /api/v1/financial-data/export:
 *   get:
 *     tags: [Financial Data]
 *     summary: Export financial data
 *     description: Export financial data in various formats
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: exportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [transactions, financial_reports, spv_performance, compliance_report]
 *         description: Type of data to export
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [csv, json, xlsx, pdf]
 *         description: Export format
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter by company ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date range filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10000
 *         description: Maximum number of records to export
 *     responses:
 *       200:
 *         description: Export completed successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid export parameters
 *       403:
 *         description: Insufficient permissions
 */
router.get('/export', requireRole(['admin', 'financial_manager', 'analyst']), async (req, res) => {
  try {
    const { exportType, format, companyId, startDate, endDate, limit } = req.query;
    
    if (!exportType || !format) {
      return res.status(400).json({ error: 'Export type and format are required' });
    }
    
    // Build query from parameters
    const query = {
      companyId,
      startDate,
      endDate,
      limit: parseInt(limit) || 10000
    };
    
    // Validate company access if specified
    if (companyId && !await validateCompanyAccess(req.user.id, companyId)) {
      return res.status(403).json({ error: 'Access denied to specified company' });
    }
    
    // Perform export
    const exportedData = await financialDataService.exportFinancialData(
      query,
      format,
      {
        userId: req.user.id,
        exportType
      }
    );
    
    // Set appropriate headers based on format
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${exportType}-export-${timestamp}.${format}`;
    
    switch (format.toLowerCase()) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        break;
      case 'xlsx':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        break;
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        break;
    }
    
    res.send(exportedData);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/financial-data/templates/{importType}:
 *   get:
 *     tags: [Financial Data]
 *     summary: Get import template
 *     description: Download a template file for importing specific data types
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: importType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [transactions, financial_reports, spv_data, chart_of_accounts]
 *         description: Type of import template
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Template format
 *     responses:
 *       200:
 *         description: Template file downloaded successfully
 *       400:
 *         description: Invalid import type
 */
router.get('/templates/:importType', async (req, res) => {
  try {
    const { importType } = req.params;
    const { format = 'csv' } = req.query;
    
    const template = await financialDataService.generateImportTemplate(importType, format);
    
    const filename = `${importType}-template.${format}`;
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(template);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(template);
    }
    
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/financial-data/import-status/{importId}:
 *   get:
 *     tags: [Financial Data]
 *     summary: Get import status
 *     description: Check the status of a long-running import operation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: importId
 *         required: true
 *         schema:
 *           type: string
 *         description: Import operation ID
 *     responses:
 *       200:
 *         description: Import status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 importId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 progress:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                 recordsProcessed:
 *                   type: integer
 *                 totalRecords:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Import operation not found
 */
router.get('/import-status/:importId', async (req, res) => {
  try {
    const { importId } = req.params;
    
    // This would typically check a job queue or database for import status
    // For now, return a placeholder response
    res.json({
      importId,
      status: 'completed',
      progress: 100,
      recordsProcessed: 0,
      totalRecords: 0,
      errors: []
    });
    
  } catch (error) {
    console.error('Import status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/v1/financial-data/validate:
 *   post:
 *     tags: [Financial Data]
 *     summary: Validate import data
 *     description: Validate import data without actually importing it
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               importType:
 *                 type: string
 *                 enum: [transactions, financial_reports, spv_data, chart_of_accounts]
 *               format:
 *                 type: string
 *                 enum: [csv, json, xlsx]
 *     responses:
 *       200:
 *         description: Validation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 totalRecords:
 *                   type: integer
 *                 validRecords:
 *                   type: integer
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Validation failed
 */
router.post('/validate', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    const { importType, format } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!importType) {
      return res.status(400).json({ error: 'Import type is required' });
    }
    
    filePath = req.file.path;
    const fileFormat = format || path.extname(req.file.originalname).slice(1);
    
    // Parse and validate data without importing
    let rawData;
    switch (fileFormat.toLowerCase()) {
      case 'csv':
        rawData = await financialDataService.parseCsvFile(filePath);
        break;
      case 'json':
        rawData = await financialDataService.parseJsonFile(filePath);
        break;
      default:
        throw new Error(`Unsupported format for validation: ${fileFormat}`);
    }
    
    const validation = await financialDataService.validateImportData(rawData, importType);
    
    // Clean up file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.json({
      valid: validation.errors.length === 0,
      totalRecords: validation.totalRecords,
      validRecords: validation.validRecords,
      errors: validation.errors
    });
    
  } catch (error) {
    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    console.error('Validation error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * Helper function to validate company access
 */
async function validateCompanyAccess(userId, companyId) {
  // This would implement proper authorization logic
  // For now, return true as placeholder
  return true;
}

module.exports = router;