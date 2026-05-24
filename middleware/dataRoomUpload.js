/**
 * Data Room Upload Middleware
 * Issue #630: AI Data Room Reconstruction — file upload handling
 *
 * Accepts multipart uploads for the reconstruction pipeline.
 * Supports: PDF, XLSX, CSV, DOCX, ZIP (and nested ZIPs).
 * Files are stored in memory (Buffer) for direct pipeline consumption.
 */

const multer = require('multer');
const path = require('path');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream', // some browsers send this for zip/docx
];

const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv', '.docx', '.doc', '.zip'];

// 50 MB per file, up to 20 files per request
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 20;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(
      `Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter,
});

/**
 * Accept up to MAX_FILES files under the field name "files".
 * Attaches to req.files as an array.
 */
const uploadFiles = upload.array('files', MAX_FILES);

/**
 * Error normaliser — converts multer errors into consistent 400 responses.
 */
const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Max size per file: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: `Too many files. Max ${MAX_FILES} files per upload.`,
      });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ success: false, error: err.message });
  }

  next(err);
};

module.exports = { uploadFiles, handleUploadError, ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES };
