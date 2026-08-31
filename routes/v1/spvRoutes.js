/**
 * SPV Management API Routes
 * Feature: OCAE-211: Implement SPV Management API
 * 
 * These routes handle CRUD operations for Special Purpose Vehicles (SPVs),
 * including creation, retrieval, update, and deletion of SPV records.
 * They also provide specialized endpoints for filtering SPVs by various criteria.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const SPVController = require('../../controllers/SPV');
const SPVNestedController = require('../../controllers/SPVNested');
const SPVInvestorController = require('../../controllers/SPVInvestor');
const SPVDocumentController = require('../../controllers/SPVDocument');
const SPVTimelineController = require('../../controllers/SPVTimeline');
const { requireAccreditation, requireSPVRoleEligibility } = require('../../middleware/kycVerification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configure multer for SPV document uploads
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
const spvUploadDir = isRailway ? '/tmp/uploads/spv-docs' : path.join(__dirname, '../../uploads/spv-docs');
const spvDocStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(spvUploadDir)) {
      fs.mkdirSync(spvUploadDir, { recursive: true });
    }
    cb(null, spvUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const spvDocUpload = multer({ storage: spvDocStorage, limits: { fileSize: 50 * 1024 * 1024 } });
const { requireLPMembership } = require('../../middleware/spvAccessMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/spvs
 * @desc Create a new SPV
 * @access Private
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), requireSPVRoleEligibility, SPVController.createSPV);

/**
 * @route GET /api/spvs
 * @desc Get all SPVs
 * @access Private
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), SPVController.getSPVs);

/**
 * Special handler for trailing slash requests to return 404
 * This handles the test case for empty ID parameter
 */
router.get('///', (req, res) => {
  return res.status(404).json({ message: 'SPV ID is required' });
});

/**
 * @route GET /api/spvs/analytics
 * @desc Get SPV analytics and summary data
 * @access Private
 */
router.get('/analytics', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVController.getSPVAnalytics);

/**
 * @route GET /api/spvs/status/:status
 * @desc Get SPVs by status (Active, Pending, Closed)
 * @access Private
 */
router.get('/status/:status', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVController.getSPVsByStatus);

/**
 * @route GET /api/spvs/compliance/:status
 * @desc Get SPVs by compliance status (Compliant, NonCompliant, PendingReview)
 * @access Private
 */
router.get('/compliance/:status', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVController.getSPVsByComplianceStatus);

/**
 * @route GET /api/spvs/parent/:id
 * @desc Get SPVs by parent company ID
 * @access Private
 */
router.get('/parent/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVController.getSPVsByParentCompany);

/**
 * SPV LP Investor Endpoints (Issue #590)
 * These routes must be defined BEFORE the generic /:id route
 */

/**
 * @route GET /api/v1/spv/:id/investors
 * @desc List all LP investors for an SPV (supports ?status= filter)
 * @access Private (investors see only SPVs they are an LP in)
 */
router.get('/:id/investors', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVInvestorController.listInvestors);

/**
 * @route PATCH /api/v1/spv/:id/investors/me
 * @desc Investor self-service: update own LP record (status, committedAmount)
 * @access Private (investor only — LP membership required)
 */
router.patch('/:id/investors/me', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVInvestorController.updateMyInvestorRecord);

/**
 * @route POST /api/v1/spv/:id/invite
 * @desc Invite LPs to an SPV by email
 * @access Private
 */
router.post('/:id/invite', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), requireAccreditation('spv'), SPVInvestorController.inviteInvestors);

/**
 * @route GET /api/v1/spv/:id/invite-link
 * @desc Get a shareable invite link for an SPV
 * @access Private
 */
router.get('/:id/invite-link', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVInvestorController.getInviteLink);

/**
 * @route PATCH /api/v1/spv/:id/investors/:investorId
 * @desc Update an LP investor record (status, committedAmount, tags, notes)
 * @access Private
 */
router.patch('/:id/investors/:investorId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVInvestorController.updateInvestor);

/**
 * @route DELETE /api/v1/spv/:id/investors/:investorId
 * @desc Remove an LP investor from an SPV
 * @access Private
 */
router.delete('/:id/investors/:investorId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVInvestorController.deleteInvestor);

/**
 * SPV Nested Endpoints (Issue #123)
 * These routes must be defined BEFORE the generic /:id route
 */

/**
 * @route GET /api/spvs/:id/investments
 * @desc Get all investments for an SPV
 * @access Private (investors see only SPVs they are an LP in)
 */
router.get('/:id/investments', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVNestedController.getSPVInvestments);

/**
 * @route GET /api/spvs/:id/performance
 * @desc Get performance metrics for an SPV (NAV, ROI, IRR)
 * @access Private (investors see only SPVs they are an LP in)
 */
router.get('/:id/performance', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVNestedController.getSPVPerformance);

/**
 * @route GET /api/spvs/:id/reports/:type
 * @desc Generate report for an SPV (summary, detailed, tax)
 * @access Private (investors see only SPVs they are an LP in)
 */
router.get('/:id/reports/:type', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVNestedController.getSPVReport);

/**
 * @route PUT /api/spvs/:id/status
 * @desc Transition SPV status with lifecycle guards (Issue #580)
 * @access Private
 */
router.put('/:id/status', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVController.transitionStatus);

/**
 * @route POST /api/spvs/:id/submit
 * @desc Submit SPV for review (transitions draft → in_review)
 * @access Private
 */
router.post('/:id/submit', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), (req, res, next) => {
  req.body = { ...req.body, status: 'in_review' };
  next();
}, SPVController.transitionStatus);

/**
 * @route POST /api/spvs/:id/close
 * @desc Close an SPV
 * @access Private
 */
router.post('/:id/close', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVNestedController.closeSPV);

/**
 * @route POST /api/spvs/:id/liquidate
 * @desc Liquidate an SPV and distribute assets
 * @access Private
 */
router.post('/:id/liquidate', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVNestedController.liquidateSPV);

/**
 * SPV Document Endpoints (Issue #269)
 * These routes must be defined BEFORE the generic /:id route
 */

/**
 * @route GET /api/v1/spv/:id/documents
 * @desc List all documents for an SPV
 * @access Private
 */
router.get('/:id/documents', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVDocumentController.listDocuments);

/**
 * @route POST /api/v1/spv/:id/documents
 * @desc Upload a document for an SPV (multipart FormData with fields: name, category, file)
 * @access Private
 */
router.post('/:id/documents', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), spvDocUpload.single('file'), SPVDocumentController.uploadDocument);

/**
 * @route DELETE /api/v1/spv/:id/documents/:docId
 * @desc Remove a document from an SPV
 * @access Private
 */
router.delete('/:id/documents/:docId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVDocumentController.deleteDocument);

/**
 * @route POST /api/v1/spv/:id/documents/:docId/remind
 * @desc Send a signature reminder for a document
 * @access Private
 */
router.post('/:id/documents/:docId/remind', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), SPVDocumentController.sendReminder);

/**
 * SPV Timeline Endpoints (Issue #269)
 * These routes must be defined BEFORE the generic /:id route
 */

/**
 * @route GET /api/v1/spv/:id/timeline
 * @desc List timeline events for an SPV (supports ?limit=N)
 * @access Private
 */
router.get('/:id/timeline', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, SPVTimelineController.listEvents);

/**
 * @route GET /api/spvs/:id
 * @desc Get SPV by ID (either MongoDB ID or custom SPVID)
 * @access Private (investors see only SPVs they are an LP in)
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider', 'investor']), requireLPMembership, (req, res, next) => {
  // Check for empty ID parameter and handle it directly
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.getSPVById);

/**
 * @route PUT/PATCH /api/spvs/:id
 * @desc Update an SPV by ID (both PUT and PATCH supported for partial updates)
 * @access Private
 */
router.patch('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), (req, res, next) => {
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.updateSPV);

router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), (req, res, next) => {
  // Check for empty ID parameter and handle it directly
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.updateSPV);

/**
 * @route DELETE /api/spvs/:id
 * @desc Delete an SPV by ID
 * @access Private
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), (req, res, next) => {
  // Check for empty ID parameter and handle it directly
  if (!req.params.id || req.params.id.trim() === '') {
    return res.status(404).json({ message: 'SPV ID is required' });
  }
  next();
}, SPVController.deleteSPV);

module.exports = router;
