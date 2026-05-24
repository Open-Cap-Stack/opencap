/**
 * ZIP Extraction Service
 * Issue #626: Extract files from ZIP buffers for AI data room reconstruction intake
 *
 * Features:
 * - Input: Buffer  Output: Array of extracted file objects
 * - Security: path-traversal rejection, blocked extension filtering
 * - Recursive ZIP extraction up to 2 levels deep
 * - Max entry size: 50 MB
 * - Skips directories, __MACOSX, .DS_Store, hidden files
 */

const AdmZip = require('adm-zip');
const path   = require('path');

const MAX_ENTRY_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Extensions blocked for security — executables and scripts
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1',
  '.vbs', '.msi', '.dll', '.com'
]);

// MIME type map for common document extensions
const MIME_MAP = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls':  'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv':  'text/csv',
  '.txt':  'text/plain',
  '.json': 'application/json',
  '.xml':  'application/xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.zip':  'application/zip',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.md':   'text/markdown'
};

/**
 * Resolve MIME type from a filename.
 * @param {string} filename
 * @returns {string}
 */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

/**
 * Determine whether an entry should be skipped during extraction.
 * Returns a string reason if it should be skipped, or null if it should be processed.
 *
 * @param {string} entryName - Raw ZIP entry name (may include path separators)
 * @returns {string|null}
 */
function shouldSkipEntry(entryName) {
  const base = path.basename(entryName);

  // Skip directory entries
  if (entryName.endsWith('/') || entryName.endsWith('\\')) {
    return 'directory';
  }

  // Skip macOS resource-fork directories
  if (entryName.includes('__MACOSX')) {
    return '__MACOSX';
  }

  // Skip .DS_Store
  if (base === '.DS_Store') {
    return '.DS_Store';
  }

  // Skip hidden files (leading dot, but not just a dot)
  if (base.startsWith('.') && base.length > 1) {
    return 'hidden file';
  }

  return null;
}

/**
 * Validate entry name for path-traversal attacks.
 * Throws if the name contains traversal sequences.
 *
 * @param {string} entryName
 */
function assertNoPathTraversal(entryName) {
  // Normalise separators and check for ..
  const normalised = entryName.replace(/\\/g, '/');
  if (normalised.includes('../') || normalised.startsWith('../') || normalised === '..') {
    throw new Error(`Path traversal detected in ZIP entry: "${entryName}"`);
  }
}

/**
 * Extract all acceptable files from a ZIP buffer.
 * Recursively processes nested ZIPs up to `maxDepth` levels.
 *
 * @param {Buffer} buffer - ZIP file as a Buffer
 * @param {Object} [options]
 * @param {string} [options.extractedFrom=''] - Label for the source context
 * @param {number} [options._depth=0]         - Internal recursion depth counter
 * @param {number} [options.maxDepth=2]       - Maximum recursive depth
 * @returns {Promise<Array<{filename:string, mimeType:string, buffer:Buffer, sizeBytes:number, extractedFrom:string}>>}
 */
async function extractZip(buffer, options = {}) {
  const extractedFrom = options.extractedFrom || '';
  const depth         = options._depth         || 0;
  const maxDepth      = options.maxDepth        !== undefined ? options.maxDepth : 2;

  if (!Buffer.isBuffer(buffer)) {
    throw new Error('extractZip: input must be a Buffer');
  }

  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    throw new Error(`extractZip: could not parse ZIP buffer — ${err.message}`);
  }

  const entries = zip.getEntries();
  const results = [];

  for (const entry of entries) {
    const entryName = entry.entryName;

    // Security: reject path traversal before any other check
    assertNoPathTraversal(entryName);

    // Skip entries we don't want
    const skipReason = shouldSkipEntry(entryName);
    if (skipReason) continue;

    const basename  = path.basename(entryName);
    const ext       = path.extname(basename).toLowerCase();

    // Silently skip blocked extensions
    if (BLOCKED_EXTENSIONS.has(ext)) continue;

    // Enforce max entry size
    const uncompressedSize = entry.header.size;
    if (uncompressedSize > MAX_ENTRY_SIZE_BYTES) {
      console.warn(
        `[zipExtraction] Skipping "${entryName}" — uncompressed size ${uncompressedSize} exceeds 50 MB limit`
      );
      continue;
    }

    const entryBuffer = entry.getData();

    // Recursively extract nested ZIPs (up to maxDepth)
    if (ext === '.zip' && depth < maxDepth) {
      try {
        const nested = await extractZip(entryBuffer, {
          extractedFrom: entryName,
          _depth:        depth + 1,
          maxDepth
        });
        results.push(...nested);
      } catch (err) {
        console.warn(`[zipExtraction] Skipping nested ZIP "${entryName}": ${err.message}`);
      }
      continue;
    }

    results.push({
      filename:      basename,
      mimeType:      getMimeType(basename),
      buffer:        entryBuffer,
      sizeBytes:     entryBuffer.length,
      extractedFrom: extractedFrom || entryName
    });
  }

  return results;
}

module.exports = { extractZip, getMimeType, shouldSkipEntry, assertNoPathTraversal };
