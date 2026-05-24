/**
 * Intake Normalizer Service Tests
 * Issue #627: Uniform AgentInputDocument normalization
 */

// ── Module-level mocks (must be hoisted before any require) ──────────────────

// pdf-parse exports a function (not an object) — factory must return a jest.fn()
jest.mock('pdf-parse', () => jest.fn());

jest.mock('xlsx');
jest.mock('mammoth');
jest.mock('csv-parse/sync');
jest.mock('../../../services/zipExtractionService');

const pdfParse   = require('pdf-parse');
const XLSX       = require('xlsx');
const mammoth    = require('mammoth');
const { parse: csvParse } = require('csv-parse/sync');
const { extractZip } = require('../../../services/zipExtractionService');

const {
  normalizeUploadedFiles,
  normalizeOAuthConnectorResult,
  extractTextFromBuffer,
  mergeAndDeduplicate
} = require('../../../services/intakeNormalizerService');

// ── Helpers ──────────────────────────────────────────────────────────────────

function multerFile(overrides = {}) {
  return {
    originalname: 'test-file.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('fake content'),
    size: 1024,
    ...overrides
  };
}

// ── extractTextFromBuffer() ──────────────────────────────────────────────────

describe('extractTextFromBuffer()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('extracts text from a PDF buffer', async () => {
    pdfParse.mockResolvedValue({ text: 'Hello from PDF' });
    const result = await extractTextFromBuffer(Buffer.from(''), 'application/pdf', 'doc.pdf');
    expect(result).toBe('Hello from PDF');
    expect(pdfParse).toHaveBeenCalledTimes(1);
  });

  it('truncates PDF text to 4000 characters', async () => {
    pdfParse.mockResolvedValue({ text: 'a'.repeat(5000) });
    const result = await extractTextFromBuffer(Buffer.from(''), 'application/pdf', 'doc.pdf');
    expect(result).toHaveLength(4000);
  });

  it('extracts text from an XLSX buffer with sheet names and rows', async () => {
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    });
    XLSX.utils = {
      sheet_to_json: jest.fn().mockReturnValue([['Col1', 'Col2'], ['a', 'b']])
    };
    const result = await extractTextFromBuffer(
      Buffer.from(''),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'data.xlsx'
    );
    expect(result).toContain('Sheet1');
    expect(XLSX.read).toHaveBeenCalledTimes(1);
  });

  it('extracts text from a CSV buffer (first 50 rows)', async () => {
    csvParse.mockReturnValue([['name', 'value'], ['Alice', '100'], ['Bob', '200']]);
    const result = await extractTextFromBuffer(Buffer.from(''), 'text/csv', 'data.csv');
    expect(result).toContain('Alice');
    expect(csvParse).toHaveBeenCalledTimes(1);
  });

  it('extracts text from a DOCX buffer via mammoth', async () => {
    mammoth.extractRawText.mockResolvedValue({ value: 'Board minutes content' });
    const result = await extractTextFromBuffer(
      Buffer.from(''),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'minutes.docx'
    );
    expect(result).toBe('Board minutes content');
    expect(mammoth.extractRawText).toHaveBeenCalledTimes(1);
  });

  it('extracts text from a plain text buffer', async () => {
    const buf = Buffer.from('Hello plain text');
    const result = await extractTextFromBuffer(buf, 'text/plain', 'readme.txt');
    expect(result).toBe('Hello plain text');
  });

  it('extracts and pretty-prints JSON buffers', async () => {
    const buf = Buffer.from('{"key":"value"}');
    const result = await extractTextFromBuffer(buf, 'application/json', 'data.json');
    expect(result).toContain('"key"');
    expect(result).toContain('"value"');
  });

  it('returns binary placeholder for unknown MIME types', async () => {
    const result = await extractTextFromBuffer(Buffer.from(''), 'application/octet-stream', 'file.bin');
    expect(result).toBe('[Binary file — content not extractable]');
  });

  it('returns extraction-failed message instead of throwing on error', async () => {
    pdfParse.mockRejectedValue(new Error('Corrupt PDF'));
    const result = await extractTextFromBuffer(Buffer.from(''), 'application/pdf', 'bad.pdf');
    expect(result).toMatch(/\[Extraction failed: Corrupt PDF\]/);
  });

  it('resolves type by file extension when MIME is generic', async () => {
    mammoth.extractRawText.mockResolvedValue({ value: 'From extension' });
    const result = await extractTextFromBuffer(
      Buffer.from(''),
      'application/octet-stream',
      'report.docx'
    );
    expect(result).toBe('From extension');
  });
});

// ── normalizeUploadedFiles() ─────────────────────────────────────────────────

describe('normalizeUploadedFiles()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array for empty input', async () => {
    const result = await normalizeUploadedFiles([]);
    expect(result).toEqual([]);
  });

  it('returns empty array for non-array input', async () => {
    const result = await normalizeUploadedFiles(null);
    expect(result).toEqual([]);
  });

  it('normalizes a PDF file into an AgentInputDocument', async () => {
    pdfParse.mockResolvedValue({ text: 'Invoice content' });
    const files = [multerFile({ originalname: 'invoice.pdf', mimetype: 'application/pdf', size: 2048 })];
    const docs = await normalizeUploadedFiles(files);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      source: 'upload_pdf',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      textContent: 'Invoice content'
    });
    expect(docs[0].id).toBeDefined();
    expect(docs[0].metadata.fileSize).toBe(2048);
  });

  it('normalizes an XLSX file and sets source to upload_xlsx', async () => {
    XLSX.read.mockReturnValue({ SheetNames: ['Summary'], Sheets: { Summary: {} } });
    XLSX.utils = { sheet_to_json: jest.fn().mockReturnValue([['A', 'B']]) };

    const files = [multerFile({
      originalname: 'model.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 50000
    })];
    const docs = await normalizeUploadedFiles(files);

    expect(docs[0].source).toBe('upload_xlsx');
    expect(docs[0].originalName).toBe('model.xlsx');
  });

  it('normalizes a CSV file and sets source to upload_csv', async () => {
    csvParse.mockReturnValue([['col1', 'col2'], ['v1', 'v2']]);
    const files = [multerFile({ originalname: 'data.csv', mimetype: 'text/csv', size: 1000 })];
    const docs = await normalizeUploadedFiles(files);
    expect(docs[0].source).toBe('upload_csv');
  });

  it('extracts ZIP entries and creates one document per entry', async () => {
    extractZip.mockResolvedValue([
      { filename: 'inner.pdf', mimeType: 'application/pdf', buffer: Buffer.from(''), sizeBytes: 500 },
      { filename: 'inner.csv', mimeType: 'text/csv', buffer: Buffer.from(''), sizeBytes: 200 }
    ]);
    pdfParse.mockResolvedValue({ text: 'PDF from zip' });
    csvParse.mockReturnValue([['a', 'b']]);

    const files = [multerFile({ originalname: 'archive.zip', mimetype: 'application/zip', size: 700 })];
    const docs = await normalizeUploadedFiles(files);

    expect(docs).toHaveLength(2);
    expect(docs.every(d => d.source === 'upload_zip_entry')).toBe(true);
    expect(docs[0].originalName).toBe('inner.pdf');
    expect(docs[1].originalName).toBe('inner.csv');
  });

  it('skips a ZIP file and continues processing when extractZip throws', async () => {
    extractZip.mockRejectedValue(new Error('Bad ZIP'));
    pdfParse.mockResolvedValue({ text: 'Other file' });

    const files = [
      multerFile({ originalname: 'bad.zip', mimetype: 'application/zip', size: 100 }),
      multerFile({ originalname: 'ok.pdf', mimetype: 'application/pdf', size: 200 })
    ];
    const docs = await normalizeUploadedFiles(files);

    expect(docs).toHaveLength(1);
    expect(docs[0].originalName).toBe('ok.pdf');
  });

  it('includes all required AgentInputDocument fields', async () => {
    pdfParse.mockResolvedValue({ text: 'content' });
    const files = [multerFile()];
    const docs = await normalizeUploadedFiles(files);
    const doc = docs[0];

    expect(doc).toHaveProperty('id');
    expect(doc).toHaveProperty('source');
    expect(doc).toHaveProperty('originalName');
    expect(doc).toHaveProperty('mimeType');
    expect(doc).toHaveProperty('textContent');
    expect(doc).toHaveProperty('metadata');
    expect(doc.metadata).toHaveProperty('fileSize');
  });

  it('normalizes a TXT file and sets source to upload_txt', async () => {
    const files = [multerFile({
      originalname: 'notes.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('My notes'),
      size: 8
    })];
    const docs = await normalizeUploadedFiles(files);
    expect(docs[0].source).toBe('upload_txt');
    expect(docs[0].textContent).toBe('My notes');
  });

  it('normalizes a DOCX file and sets source to upload_docx', async () => {
    mammoth.extractRawText.mockResolvedValue({ value: 'Board minutes' });
    const files = [multerFile({
      originalname: 'minutes.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 4000
    })];
    const docs = await normalizeUploadedFiles(files);
    expect(docs[0].source).toBe('upload_docx');
  });

  it('normalizes a JSON file and sets source to upload_json', async () => {
    const files = [multerFile({
      originalname: 'data.json',
      mimetype: 'application/json',
      buffer: Buffer.from('{"key":"value"}'),
      size: 15
    })];
    const docs = await normalizeUploadedFiles(files);
    expect(docs[0].source).toBe('upload_json');
    expect(docs[0].textContent).toContain('"key"');
  });
});

// ── normalizeOAuthConnectorResult() ─────────────────────────────────────────

describe('normalizeOAuthConnectorResult()', () => {
  const mockDoc = {
    id: 'existing-id',
    source: 'gmail',
    originalName: 'Invoice.pdf',
    mimeType: 'application/pdf',
    textContent: 'Invoice details',
    metadata: { fileSize: 1000, pageCount: 1, sender: 'billing@co.com', date: '2024-01-01' }
  };

  it('returns empty array for null input', async () => {
    const result = await normalizeOAuthConnectorResult(null);
    expect(result).toEqual([]);
  });

  it('returns empty array when status is not success', async () => {
    const result = await normalizeOAuthConnectorResult({ status: 'error', documents: [mockDoc] });
    expect(result).toEqual([]);
  });

  it('returns empty array when status is skipped', async () => {
    const result = await normalizeOAuthConnectorResult({ status: 'skipped', documents: [mockDoc] });
    expect(result).toEqual([]);
  });

  it('returns empty array when documents list is empty', async () => {
    const result = await normalizeOAuthConnectorResult({ status: 'success', documents: [] });
    expect(result).toEqual([]);
  });

  it('maps connector documents to AgentInputDocument format', async () => {
    const connectorResult = {
      source: 'gmail',
      status: 'success',
      error: null,
      documents: [mockDoc]
    };
    const docs = await normalizeOAuthConnectorResult(connectorResult);
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      id: 'existing-id',
      source: 'gmail',
      originalName: 'Invoice.pdf',
      mimeType: 'application/pdf',
      textContent: 'Invoice details'
    });
  });

  it('truncates textContent to 4000 characters', async () => {
    const longDoc = { ...mockDoc, textContent: 'x'.repeat(5000) };
    const connectorResult = { source: 'gmail', status: 'success', error: null, documents: [longDoc] };
    const docs = await normalizeOAuthConnectorResult(connectorResult);
    expect(docs[0].textContent).toHaveLength(4000);
  });

  it('assigns a new uuid when connector doc has no id', async () => {
    const docNoId = { ...mockDoc, id: undefined };
    const connectorResult = { source: 'gmail', status: 'success', error: null, documents: [docNoId] };
    const docs = await normalizeOAuthConnectorResult(connectorResult);
    expect(docs[0].id).toBeDefined();
    expect(docs[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('normalizes metadata fields correctly', async () => {
    const connectorResult = { source: 'gmail', status: 'success', error: null, documents: [mockDoc] };
    const docs = await normalizeOAuthConnectorResult(connectorResult);
    expect(docs[0].metadata).toMatchObject({
      fileSize: 1000,
      pageCount: 1,
      sender: 'billing@co.com',
      date: '2024-01-01'
    });
  });
});

// ── mergeAndDeduplicate() ────────────────────────────────────────────────────

describe('mergeAndDeduplicate()', () => {
  function doc(name, size, id = 'id-' + Math.random()) {
    return {
      id,
      source: 'gmail',
      originalName: name,
      mimeType: 'application/pdf',
      textContent: 'content',
      metadata: { fileSize: size, pageCount: null, sheetNames: null, subject: null, sender: null, date: null, driveUrl: null }
    };
  }

  it('returns a flat array from multiple arrays', () => {
    const a = [doc('a.pdf', 100)];
    const b = [doc('b.pdf', 200)];
    const result = mergeAndDeduplicate([a, b]);
    expect(result).toHaveLength(2);
  });

  it('deduplicates by originalName + fileSize', () => {
    const d1 = doc('invoice.pdf', 1000);
    const d2 = doc('invoice.pdf', 1000);
    const result = mergeAndDeduplicate([[d1], [d2]]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(d1.id);
  });

  it('keeps both when same name but different sizes', () => {
    const d1 = doc('report.pdf', 1000);
    const d2 = doc('report.pdf', 2000);
    const result = mergeAndDeduplicate([[d1], [d2]]);
    expect(result).toHaveLength(2);
  });

  it('keeps both when same size but different names', () => {
    const d1 = doc('a.pdf', 1000);
    const d2 = doc('b.pdf', 1000);
    const result = mergeAndDeduplicate([[d1], [d2]]);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(mergeAndDeduplicate([])).toEqual([]);
  });

  it('returns empty array for arrays of empty arrays', () => {
    expect(mergeAndDeduplicate([[], []])).toEqual([]);
  });

  it('handles three or more input arrays', () => {
    const a = [doc('a.pdf', 100)];
    const b = [doc('b.pdf', 200)];
    const c = [doc('a.pdf', 100)]; // duplicate of first
    const result = mergeAndDeduplicate([a, b, c]);
    expect(result).toHaveLength(2);
  });

  it('preserves first occurrence when deduplicating', () => {
    const first = doc('file.pdf', 500);
    const second = { ...first, id: 'second-id' };
    const result = mergeAndDeduplicate([[first], [second]]);
    expect(result[0].id).toBe(first.id);
  });
});
