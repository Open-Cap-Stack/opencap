/**
 * Profile Photo Upload Middleware
 *
 * Configures multer for handling profile photo uploads with validation
 * for image types and file size limits.
 *
 * Issue #187: Add Profile Photo Upload Endpoint
 */

const multer = require('multer');
const path = require('path');

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * File filter function for multer
 * Validates file type and extension
 */
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error(
      `Invalid file type. Only image files are allowed (${ALLOWED_EXTENSIONS.join(', ')})`
    );
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(
      `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
    error.code = 'INVALID_FILE_EXTENSION';
    return cb(error, false);
  }

  // File is valid
  cb(null, true);
};

/**
 * Configure multer for profile photo uploads
 * Uses memory storage to pass buffer to ZeroDB
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow single file upload
  },
  fileFilter: fileFilter
});

/**
 * Middleware to handle single profile photo upload
 * Attaches file to req.file
 */
const uploadSingle = upload.single('photo');

/**
 * Error handler middleware for multer errors
 * Should be used after the upload middleware
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Only one file can be uploaded at a time'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "photo" as the field name'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  if (err && err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err && err.code === 'INVALID_FILE_EXTENSION') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // Pass other errors to the next error handler
  if (err) {
    return next(err);
  }

  next();
};

module.exports = {
  uploadSingle,
  handleUploadError,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
