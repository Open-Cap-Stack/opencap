/**
 * Intake Normalizer Service
 * Issue #627: Converts raw uploaded files and OAuth connector results into uniform AgentInputDocument objects
 *
 * Supports:
 * - Multer file uploads: PDF, XLSX, XLS, CSV, DOCX, TXT, JSON, ZIP
 * - OAuth connector results: gmail, drive, carta, stripe
 * - ZIP extraction via zipExtractionService (recursive up to 2 levels)
 * - Deduplication by originalName + sizeBytes
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { extractZip } = require('./zipExtractionService');

const MAX_TEXT_CHARS = 4000;
const MAX_CSV_ROWS = 50;
const MAX_XLSX_ROWS_PER_SHEET = 30;

/**
 * Map a MIME type or file extension to a source string for uploaded files.
 * @param {string} mimeType
 * @param {string} filename
 * @returns {string}
 */
function resolveUploadSource(mimeType, filename) {
  const ext = path.extname(filename).toLowerCase();
  if (mimeType === 'application/zip' || ext === '.zip') return 'upload_zip_entry';
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'upload_pdf';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === '.xlsx' ||
    ext === '.xls'
  ) return 'upload_xlsx';
  if (mimeType === 'text/csv' || ext === '.csv') return 'upload_csv';
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    ext === '.docx' ||
    ext === '.doc'
  ) return 'upload_docx';
  if (mimeType === 'text/plain' || ext === '.txt') return 'upload_txt';
  if (mimeType === 'application/json' || ext === '.json') return 'upload_json';
  return 'upload_pdf'; // fallback
}

/**
 * Extract plain text from a buffer based on its MIME type.
 * Always truncates to MAX_TEXT_CHARS.
 * On failure, returns a bracketed error message instead of throwing.
 *
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} [filename=''] - Used to resolve type from extension when mimeType is generic
 * @returns {Promise<string>}
 */
async function extractTextFromBuffer(buffer, mimeType, filename = '') {
  const ext = path.extname(filename).toLowerCase();

  try {
    // PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return (result.text || '').slice(0, MAX_TEXT_CHARS);
    }

    // XLSX / XLS
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimeType === 'application/vnd.ms-excel' ||
      ext === '.xlsx' ||
      ext === '.xls'
    ) {
      const XLSX = require('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetNames = workbook.SheetNames;
      const lines = [`Sheets: ${sheetNames.join(', ')}`];
      for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        lines.push(`\n[Sheet: ${name}]`);
        const subset = rows.slice(0, MAX_XLSX_ROWS_PER_SHEET);
        for (const row of subset) {
          lines.push(row.join('\t'));
        }
      }
      return lines.join('\n').slice(0, MAX_TEXT_CHARS);
    }

    // CSV
    if (mimeType === 'text/csv' || ext === '.csv') {
      const { parse } = require('csv-parse/sync');
      const rows = parse(buffer, { skip_empty_lines: true, relax_quotes: true });
      const subset = rows.slice(0, MAX_CSV_ROWS);
      return subset.map(r => r.join('\t')).join('\n').slice(0, MAX_TEXT_CHARS);
    }

    // DOCX / DOC
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      ext === '.docx' ||
      ext === '.doc'
    ) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').slice(0, MAX_TEXT_CHARS);
    }

    // Plain text
    if (mimeType === 'text/plain' || ext === '.txt') {
      return buffer.toString('utf8').slice(0, MAX_TEXT_CHARS);
    }

    // JSON
    if (mimeType === 'application/json' || ext === '.json') {
      const parsed = JSON.parse(buffer.toString('utf8'));
      return JSON.stringify(parsed, null, 2).slice(0, MAX_TEXT_CHARS);
    }

    // Unknown / binary
    return '[Binary file — content not extractable]';

  } catch (err) {
    console.warn(`[intakeNormalizer] Text extraction failed for "${filename}": ${err.message}`);
    return `[Extraction failed: ${err.message}]`;
  }
}

/**
 * Build an AgentInputDocument from a raw buffer + metadata.
 *
 * @param {Object} opts
 * @param {Buffer} opts.buffer
 * @param {string} opts.originalName
 * @param {string} opts.mimeType
 * @param {string} opts.source
 * @param {number} opts.sizeBytes
 * @param {Object} [opts.metadata]
 * @returns {Promise<AgentInputDocument>}
 */
async function buildDocument({ buffer, originalName, mimeType, source, sizeBytes, metadata = {} }) {
  const textContent = await extractTextFromBuffer(buffer, mimeType, originalName);

  return {
    id: uuidv4(),
    source,
    originalName,
    mimeType,
    textContent,
    metadata: {
      fileSize: sizeBytes,
      pageCount: metadata.pageCount || null,
      sheetNames: metadata.sheetNames || null,
      subject: metadata.subject || null,
      sender: metadata.sender || null,
      date: metadata.date || null,
      driveUrl: metadata.driveUrl || null
    }
  };
}

/**
 * Normalize an array of multer file objects into AgentInputDocument[].
 * ZIP files are extracted recursively and each entry is normalized individually.
 *
 * @param {Array<{originalname:string, mimetype:string, buffer:Buffer, size:number}>} filesArray
 * @returns {Promise<AgentInputDocument[]>}
 */
async function normalizeUploadedFiles(filesArray) {
  if (!Array.isArray(filesArray) || filesArray.length === 0) return [];

  const results = [];

  for (const file of filesArray) {
    const { originalname, mimetype, buffer, size } = file;
    const ext = path.extname(originalname).toLowerCase();

    // Handle ZIPs: extract entries and normalize each one
    if (mimetype === 'application/zip' || ext === '.zip') {
      let entries;
      try {
        entries = await extractZip(buffer);
      } catch (err) {
        console.warn(`[intakeNormalizer] ZIP extraction failed for "${originalname}": ${err.message}`);
        continue;
      }

      for (const entry of entries) {
        const doc = await buildDocument({
          buffer: entry.buffer,
          originalName: entry.filename,
          mimeType: entry.mimeType,
          source: 'upload_zip_entry',
          sizeBytes: entry.sizeBytes
        });
        results.push(doc);
      }
      continue;
    }

    // Regular file
    const source = resolveUploadSource(mimetype, originalname);
    const doc = await buildDocument({
      buffer,
      originalName: originalname,
      mimeType: mimetype,
      source,
      sizeBytes: size
    });
    results.push(doc);
  }

  return results;
}

/**
 * Normalize an OAuth connector result into AgentInputDocument[].
 *
 * @param {Object} connectorResult - { source, status, error, documents: AgentInputDocument[] }
 * @returns {Promise<AgentInputDocument[]>}
 */
async function normalizeOAuthConnectorResult(connectorResult) {
  if (!connectorResult || connectorResult.status !== 'success') return [];

  const { documents } = connectorResult;
  if (!Array.isArray(documents) || documents.length === 0) return [];

  return documents.map(doc => ({
    id: doc.id || uuidv4(),
    source: doc.source || connectorResult.source,
    originalName: doc.originalName || doc.name || 'unknown',
    mimeType: doc.mimeType || 'application/octet-stream',
    textContent: (doc.textContent || '').slice(0, MAX_TEXT_CHARS),
    metadata: {
      fileSize: doc.metadata?.fileSize || null,
      pageCount: doc.metadata?.pageCount || null,
      sheetNames: doc.metadata?.sheetNames || null,
      subject: doc.metadata?.subject || null,
      sender: doc.metadata?.sender || null,
      date: doc.metadata?.date || null,
      driveUrl: doc.metadata?.driveUrl || null
    }
  }));
}

/**
 * Merge multiple AgentInputDocument arrays into a single flat deduplicated array.
 * Dedup key: originalName + fileSize combination (first occurrence wins).
 *
 * @param {AgentInputDocument[][]} docArrays
 * @returns {AgentInputDocument[]}
 */
function mergeAndDeduplicate(docArrays) {
  const flat = docArrays.flat();
  const seen = new Set();
  const result = [];

  for (const doc of flat) {
    const key = `${doc.originalName}::${doc.metadata?.fileSize ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(doc);
  }

  return result;
}

module.exports = {
  normalizeUploadedFiles,
  normalizeOAuthConnectorResult,
  extractTextFromBuffer,
  mergeAndDeduplicate
};
