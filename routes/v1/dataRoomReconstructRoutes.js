/**
 * Data Room Reconstruct Routes
 * Issue #632: AI Data Room Reconstruction — route registration
 *
 * Mounts at: /api/v1/reconstruct
 */

const express = require('express');
const router  = express.Router();

const { authenticate } = require('../../middleware/authMiddleware');
const { uploadFiles, handleUploadError } = require('../../middleware/dataRoomUpload');
const ctrl = require('../../controllers/dataRoomReconstructController');

// All routes require a valid JWT
router.use(authenticate);

// POST /api/v1/reconstruct/start
router.post('/start', ctrl.startJob);

// POST /api/v1/reconstruct/:jobId/upload
// Accepts multipart "files" field — multer + zip expansion
router.post('/:jobId/upload', uploadFiles, handleUploadError, ctrl.uploadFiles);

// POST /api/v1/reconstruct/:jobId/run
// Kick off the async pipeline (202 Accepted, no file upload)
router.post('/:jobId/run', ctrl.runJob);

// GET /api/v1/reconstruct/status/:jobId
router.get('/status/:jobId', ctrl.getStatus);

// POST /api/v1/reconstruct/:jobId/finalize
router.post('/:jobId/finalize', ctrl.finalizeJob);

// GET /api/v1/reconstruct/jobs
router.get('/jobs', ctrl.listJobs);

// DELETE /api/v1/reconstruct/:jobId
router.delete('/:jobId', ctrl.deleteJob);

module.exports = router;
