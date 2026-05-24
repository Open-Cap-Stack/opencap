/**
 * ZIP Extraction Service Tests
 * Issue #626: ZIP extraction for AI data room reconstruction intake
 */

const AdmZip = require('adm-zip');
const {
  extractZip,
  getMimeType,
  shouldSkipEntry,
  assertNoPathTraversal
} = require('../../../services/zipExtractionService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a ZIP buffer containing the given entries in-memory.
 * @param {Array<{name:string, content:string|Buffer}>} entries
 * @returns {Buffer}
 */
function buildZipBuffer(entries) {
  const zip = new AdmZip();
  for (const { name, content } of entries) {
    zip.addFile(name, Buffer.isBuffer(content) ? content : Buffer.from(content));
  }
  return zip.toBuffer();
}

// ─── getMimeType() ────────────────────────────────────────────────────────────

describe('getMimeType()', () => {
  it('returns application/pdf for .pdf', () => {
    expect(getMimeType('document.pdf')).toBe('application/pdf');
  });

  it('returns text/csv for .csv', () => {
    expect(getMimeType('data.csv')).toBe('text/csv');
  });

  it('returns spreadsheet MIME for .xlsx', () => {
    expect(getMimeType('model.xlsx')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('returns application/octet-stream for unknown extensions', () => {
    expect(getMimeType('binary.xyz')).toBe('application/octet-stream');
  });

  it('is case-insensitive via path.extname', () => {
    // path.extname returns the extension as-is; getMimeType lowercases it
    expect(getMimeType('Photo.JPG')).toBe('image/jpeg');
  });
});

// ─── shouldSkipEntry() ────────────────────────────────────────────────────────

describe('shouldSkipEntry()', () => {
  it('returns a reason for directory entries ending with /', () => {
    expect(shouldSkipEntry('docs/')).toBeTruthy();
  });

  it('returns a reason for __MACOSX entries', () => {
    expect(shouldSkipEntry('__MACOSX/._file.pdf')).toBeTruthy();
  });

  it('returns a reason for .DS_Store', () => {
    expect(shouldSkipEntry('.DS_Store')).toBeTruthy();
  });

  it('returns a reason for hidden files (leading dot)', () => {
    expect(shouldSkipEntry('.hidden')).toBeTruthy();
  });

  it('returns null for normal files', () => {
    expect(shouldSkipEntry('report.pdf')).toBeNull();
  });

  it('returns null for files in subdirectories', () => {
    expect(shouldSkipEntry('legal/incorporation.pdf')).toBeNull();
  });
});

// ─── assertNoPathTraversal() ──────────────────────────────────────────────────

describe('assertNoPathTraversal()', () => {
  it('throws on ../file.pdf', () => {
    expect(() => assertNoPathTraversal('../file.pdf')).toThrow('Path traversal');
  });

  it('throws on subdir/../../etc/passwd', () => {
    expect(() => assertNoPathTraversal('subdir/../../etc/passwd')).toThrow('Path traversal');
  });

  it('does not throw for normal relative paths', () => {
    expect(() => assertNoPathTraversal('legal/contracts/nda.pdf')).not.toThrow();
  });

  it('does not throw for a flat filename', () => {
    expect(() => assertNoPathTraversal('report.pdf')).not.toThrow();
  });
});

// ─── extractZip() ─────────────────────────────────────────────────────────────

describe('extractZip()', () => {
  it('throws when input is not a Buffer', async () => {
    await expect(extractZip('not a buffer')).rejects.toThrow('Buffer');
  });

  it('throws when the buffer is not a valid ZIP', async () => {
    await expect(extractZip(Buffer.from('this is not a zip'))).rejects.toThrow();
  });

  it('extracts a simple PDF from a ZIP', async () => {
    const buf = buildZipBuffer([{ name: 'report.pdf', content: '%PDF-1.4 content' }]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('report.pdf');
    expect(results[0].mimeType).toBe('application/pdf');
    expect(Buffer.isBuffer(results[0].buffer)).toBe(true);
    expect(results[0].sizeBytes).toBeGreaterThan(0);
  });

  it('extracts multiple files', async () => {
    const buf = buildZipBuffer([
      { name: 'a.pdf',  content: 'content a' },
      { name: 'b.csv',  content: 'content b' },
      { name: 'c.docx', content: 'content c' }
    ]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(3);
  });

  it('skips directory entries', async () => {
    const zip = new AdmZip();
    zip.addFile('subfolder/', Buffer.alloc(0));
    zip.addFile('subfolder/file.pdf', Buffer.from('hello'));
    const results = await extractZip(zip.toBuffer());
    expect(results.every(r => r.filename !== '')).toBe(true);
    // only the file, not the directory
    expect(results.some(r => r.filename === 'file.pdf')).toBe(true);
  });

  it('skips __MACOSX entries', async () => {
    const buf = buildZipBuffer([
      { name: '__MACOSX/._doc.pdf', content: 'mac junk' },
      { name: 'doc.pdf',           content: 'real content' }
    ]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('doc.pdf');
  });

  it('skips .DS_Store files', async () => {
    const buf = buildZipBuffer([
      { name: '.DS_Store', content: 'mac store' },
      { name: 'file.txt',  content: 'hello' }
    ]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('file.txt');
  });

  it('skips hidden files (leading dot)', async () => {
    const buf = buildZipBuffer([
      { name: '.hidden_file', content: 'secret' },
      { name: 'visible.pdf',  content: 'public' }
    ]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('visible.pdf');
  });

  it('silently skips .exe files', async () => {
    const buf = buildZipBuffer([
      { name: 'malware.exe', content: 'bad' },
      { name: 'good.pdf',    content: 'ok' }
    ]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('good.pdf');
  });

  it('silently skips .bat, .cmd, .sh, .ps1, .vbs, .msi, .dll, .com', async () => {
    const blocked = [
      { name: 'run.bat',     content: 'x' },
      { name: 'run.cmd',     content: 'x' },
      { name: 'run.sh',      content: 'x' },
      { name: 'run.ps1',     content: 'x' },
      { name: 'run.vbs',     content: 'x' },
      { name: 'install.msi', content: 'x' },
      { name: 'lib.dll',     content: 'x' },
      { name: 'prog.com',    content: 'x' }
    ];
    const buf = buildZipBuffer([...blocked, { name: 'safe.pdf', content: 'ok' }]);
    const results = await extractZip(buf);
    expect(results).toHaveLength(1);
    expect(results[0].filename).toBe('safe.pdf');
  });

  it('throws on path traversal in entry names', async () => {
    // AdmZip.addFile() silently strips '../' — craft raw ZIP bytes to preserve it
    function uint16LE(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
    function uint32LE(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
    const filename = Buffer.from('../etc/passwd');
    const content  = Buffer.from('pwned');
    const crc32    = 0x12345678;
    const localHeader = Buffer.concat([
      Buffer.from([0x50,0x4B,0x03,0x04]),
      uint16LE(20), uint16LE(0), uint16LE(0), uint16LE(0), uint16LE(0),
      uint32LE(crc32), uint32LE(content.length), uint32LE(content.length),
      uint16LE(filename.length), uint16LE(0)
    ]);
    const centralDir = Buffer.concat([
      Buffer.from([0x50,0x4B,0x01,0x02]),
      uint16LE(20), uint16LE(20), uint16LE(0), uint16LE(0), uint16LE(0),
      uint16LE(0), uint32LE(crc32), uint32LE(content.length),
      uint32LE(content.length), uint16LE(filename.length),
      uint16LE(0), uint16LE(0), uint16LE(0), uint16LE(0), uint32LE(0),
      uint32LE(0)
    ]);
    const localSize = localHeader.length + filename.length + content.length;
    const cdSize    = centralDir.length + filename.length;
    const endRecord = Buffer.concat([
      Buffer.from([0x50,0x4B,0x05,0x06]),
      uint16LE(0), uint16LE(0),
      uint16LE(1), uint16LE(1),
      uint32LE(cdSize), uint32LE(localSize), uint16LE(0)
    ]);
    const rawZip = Buffer.concat([localHeader, filename, content, centralDir, filename, endRecord]);
    await expect(extractZip(rawZip)).rejects.toThrow('Path traversal');
  });

  it('sets extractedFrom from options', async () => {
    const buf = buildZipBuffer([{ name: 'a.pdf', content: 'content' }]);
    const results = await extractZip(buf, { extractedFrom: 'upload.zip' });
    expect(results[0].extractedFrom).toBe('upload.zip');
  });

  it('recursively extracts nested ZIPs at depth 1', async () => {
    const innerBuf = buildZipBuffer([{ name: 'inner.pdf', content: 'inner content' }]);
    const outerBuf = buildZipBuffer([
      { name: 'nested.zip', content: innerBuf },
      { name: 'outer.pdf',  content: 'outer content' }
    ]);

    const results = await extractZip(outerBuf);
    const filenames = results.map(r => r.filename);
    expect(filenames).toContain('outer.pdf');
    expect(filenames).toContain('inner.pdf');
  });

  it('does not recurse beyond maxDepth', async () => {
    // depth-0 → depth-1 → depth-2 (should not recurse into depth-3)
    const d3 = buildZipBuffer([{ name: 'deep.pdf', content: 'deep' }]);
    const d2 = buildZipBuffer([{ name: 'level3.zip', content: d3 }]);
    const d1 = buildZipBuffer([{ name: 'level2.zip', content: d2 }]);
    const d0 = buildZipBuffer([{ name: 'level1.zip', content: d1 }]);

    const results = await extractZip(d0, { maxDepth: 2 });
    const filenames = results.map(r => r.filename);
    // level1.zip is extracted at depth 1, level2.zip at depth 2 — depth 3 not entered
    expect(filenames).not.toContain('deep.pdf');
  });

  it('returns sizeBytes equal to buffer length', async () => {
    const content = 'exactly this content';
    const buf = buildZipBuffer([{ name: 'file.txt', content }]);
    const results = await extractZip(buf);
    expect(results[0].sizeBytes).toBe(results[0].buffer.length);
  });

  it('returns an empty array for a ZIP with only skipped entries', async () => {
    const buf = buildZipBuffer([
      { name: '.DS_Store',         content: 'x' },
      { name: '__MACOSX/._f',      content: 'x' },
      { name: 'hidden/',           content: '' }
    ]);
    const results = await extractZip(buf);
    expect(results).toEqual([]);
  });
});
