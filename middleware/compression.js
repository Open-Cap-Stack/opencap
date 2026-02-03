/**
 * Response Compression Middleware
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides gzip compression for responses with configurable options
 * including minimum size threshold, content-type filtering, and compression level.
 */

const zlib = require('zlib');

/**
 * Compression configuration
 */
const CompressionConfig = {
  // Minimum response size in bytes to compress (default 1KB)
  threshold: 1024,

  // Compression level (-1 to 9, where -1 is default, 0 is no compression, 9 is best)
  level: -1,

  // Content types that should be compressed
  compressibleTypes: [
    'application/json',
    'application/javascript',
    'application/xml',
    'text/html',
    'text/plain',
    'text/css',
    'text/xml',
    'text/javascript',
    'application/x-javascript',
    'application/json; charset=utf-8'
  ],

  // Content types that should NOT be compressed (already compressed)
  skipTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg',
    'application/zip',
    'application/gzip',
    'application/x-gzip',
    'application/octet-stream'
  ],

  /**
   * Update compression configuration
   * @param {Object} config - Configuration to merge
   */
  update(config) {
    Object.assign(this, config);
  }
};

/**
 * Check if a response should be compressed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options
 * @returns {boolean} Whether to compress
 */
function shouldCompress(req, res, options = {}) {
  // Check if client accepts gzip encoding
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) {
    return false;
  }

  // Check if already compressed
  const contentEncoding = res.getHeader ? res.getHeader('content-encoding') : null;
  if (contentEncoding) {
    return false;
  }

  // Get content type
  const contentType = res.getHeader ? res.getHeader('content-type') : null;
  if (!contentType) {
    return false;
  }

  // Extract base content type (without charset)
  const baseContentType = contentType.split(';')[0].trim().toLowerCase();

  // Check if content type should be skipped
  if (CompressionConfig.skipTypes.some(type => baseContentType.includes(type))) {
    return false;
  }

  // Check if content type is compressible
  const isCompressible = CompressionConfig.compressibleTypes.some(
    type => baseContentType.includes(type.split(';')[0])
  );

  if (!isCompressible) {
    return false;
  }

  // Check content length if available
  const threshold = options.threshold || CompressionConfig.threshold;
  const contentLength = res.getHeader ? res.getHeader('content-length') : null;
  if (contentLength && parseInt(contentLength, 10) < threshold) {
    return false;
  }

  return true;
}

/**
 * Create compression middleware
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware
 */
function createCompressionMiddleware(options = {}) {
  // Validate compression level
  const level = options.level !== undefined ? options.level : CompressionConfig.level;
  if (level < -1 || level > 9) {
    throw new Error('Compression level must be between -1 and 9');
  }

  const threshold = options.threshold !== undefined ? options.threshold : CompressionConfig.threshold;
  const enabled = options.enabled !== undefined ? options.enabled : true;
  const filter = options.filter || null;

  return (req, res, next) => {
    // Skip if compression is disabled
    if (!enabled) {
      return next();
    }

    // Check if client accepts gzip
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }

    // Skip HEAD requests
    if (req.method === 'HEAD') {
      return next();
    }

    // Store original methods
    const originalWrite = res.write;
    const originalEnd = res.end;

    let chunks = [];
    let isCompressing = false;

    // Override write method
    res.write = function(chunk, encoding, callback) {
      if (!isCompressing) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
        return true;
      }
      return originalWrite.call(this, chunk, encoding, callback);
    };

    // Override end method
    res.end = function(chunk, encoding, callback) {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }

      // Check if we should compress
      const shouldCompressResponse = filter
        ? filter(req, res)
        : shouldCompress(req, res, { threshold });

      if (!shouldCompressResponse || chunks.length === 0) {
        // Don't compress, send original response
        res.write = originalWrite;
        res.end = originalEnd;

        const buffer = Buffer.concat(chunks);
        if (buffer.length > 0) {
          originalWrite.call(res, buffer);
        }
        return originalEnd.call(res, callback);
      }

      // Check total size against threshold
      const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      if (totalSize < threshold) {
        res.write = originalWrite;
        res.end = originalEnd;

        const buffer = Buffer.concat(chunks);
        if (buffer.length > 0) {
          originalWrite.call(res, buffer);
        }
        return originalEnd.call(res, callback);
      }

      // Compress the response
      isCompressing = true;
      const buffer = Buffer.concat(chunks);

      const zlibOptions = {
        level: level === -1 ? zlib.constants.Z_DEFAULT_COMPRESSION : level
      };

      zlib.gzip(buffer, zlibOptions, (err, compressed) => {
        if (err) {
          // On error, send uncompressed
          res.write = originalWrite;
          res.end = originalEnd;
          originalWrite.call(res, buffer);
          return originalEnd.call(res, callback);
        }

        // Set compression headers
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.removeHeader('Content-Length');

        res.write = originalWrite;
        res.end = originalEnd;

        originalWrite.call(res, compressed);
        originalEnd.call(res, callback);
      });
    };

    // Set Vary header early
    res.setHeader('Vary', 'Accept-Encoding');

    next();
  };
}

module.exports = {
  CompressionConfig,
  createCompressionMiddleware,
  shouldCompress
};
