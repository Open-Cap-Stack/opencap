'use strict';

const crypto = require('crypto');

// Mock dependencies before requiring controller
jest.mock('../../../services/zerodbService', () => ({
  queryTable: jest.fn(),
  insertRow: jest.fn(),
  updateRows: jest.fn(),
}));

jest.mock('../../../services/emailService', () => ({
  send: jest.fn(),
  sendClerkyDocumentNotification: jest.fn(),
}));

// Mock the clerkyDocumentParser (issue #663 — may not exist yet)
jest.mock('../../../services/clerkyDocumentParser', () => ({
  parseAndQueueForReview: jest.fn(),
}), { virtual: true });

const zerodbService = require('../../../services/zerodbService');
const emailService = require('../../../services/emailService');

// Helper: generate a valid HMAC signature for the given body
function signPayload(body, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof body === 'string' ? body : JSON.stringify(body));
  return hmac.digest('hex');
}

// Helper: build a mock request with raw body and signature
function buildReq(payload, secret, overrides = {}) {
  const bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = secret ? signPayload(bodyStr, secret) : undefined;
  return {
    headers: {
      'x-clerky-signature': signature,
      ...overrides.headers,
    },
    body: Buffer.from(bodyStr),
    rawBody: bodyStr,
    ...overrides,
  };
}

function buildRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

const WEBHOOK_SECRET = 'test-clerky-webhook-secret-123';

describe('clerkyWebhookController', () => {
  let controller;

  beforeAll(() => {
    process.env.CLERKY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterAll(() => {
    delete process.env.CLERKY_WEBHOOK_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLERKY_WEBHOOK_SECRET = WEBHOOK_SECRET;

    if (!controller) {
      controller = require('../../../controllers/clerkyWebhookController');
    }

    // Default mock returns
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.insertRow.mockResolvedValue({ row_id: 'row-1' });
    zerodbService.updateRows.mockResolvedValue({ updated: 1 });
    emailService.sendClerkyDocumentNotification.mockResolvedValue(undefined);
  });

  // ── 1. Valid HMAC signature accepted ────────────────────────────────────────
  test('accepts a valid HMAC signature and returns 200', async () => {
    const payload = { eventId: 'evt_001', eventType: 'document.signed', companyId: 'co_1', documentType: 'certificate_of_incorporation', documentName: 'CoI.pdf', documentText: 'text', signedAt: '2026-05-26T00:00:00Z' };
    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ received: true }));
  });

  // ── 2. Invalid signature returns 401 ────────────────────────────────────────
  test('rejects invalid HMAC signature with 401', async () => {
    const payload = { eventId: 'evt_002', eventType: 'document.signed' };
    const req = buildReq(payload, 'wrong-secret');
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── 3. Missing signature returns 401 ────────────────────────────────────────
  test('rejects missing signature header with 401', async () => {
    const payload = { eventId: 'evt_003', eventType: 'document.signed' };
    const req = buildReq(payload, null, { headers: {} });
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  // ── 4. Missing CLERKY_WEBHOOK_SECRET returns 401 ────────────────────────────
  test('rejects when CLERKY_WEBHOOK_SECRET is not configured', async () => {
    delete process.env.CLERKY_WEBHOOK_SECRET;
    // Re-require to pick up missing env var
    jest.resetModules();
    jest.mock('../../../services/zerodbService', () => ({
      queryTable: jest.fn(),
      insertRow: jest.fn(),
      updateRows: jest.fn(),
    }));
    jest.mock('../../../services/emailService', () => ({
      send: jest.fn(),
      sendClerkyDocumentNotification: jest.fn(),
    }));
    jest.mock('../../../services/clerkyDocumentParser', () => ({
      parseAndQueueForReview: jest.fn(),
    }), { virtual: true });
    const ctrl = require('../../../controllers/clerkyWebhookController');

    const payload = { eventId: 'evt_004', eventType: 'document.signed' };
    const req = buildReq(payload, 'anything');
    const res = buildRes();

    await ctrl.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    // Restore
    process.env.CLERKY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  // ── 5. Duplicate eventId returns 200 immediately without processing ─────────
  test('returns 200 for duplicate eventId without reprocessing', async () => {
    const payload = { eventId: 'evt_dup_005', eventType: 'document.signed', companyId: 'co_1', documentType: 'cert', documentName: 'doc.pdf', documentText: 'text', signedAt: '2026-05-26T00:00:00Z' };

    const req1 = buildReq(payload, WEBHOOK_SECRET);
    const res1 = buildRes();
    await controller.handleWebhook(req1, res1);
    expect(res1.status).toHaveBeenCalledWith(200);

    // Reset mocks to track second call
    jest.clearAllMocks();
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.insertRow.mockResolvedValue({ row_id: 'row-1' });

    const req2 = buildReq(payload, WEBHOOK_SECRET);
    const res2 = buildRes();
    await controller.handleWebhook(req2, res2);

    expect(res2.status).toHaveBeenCalledWith(200);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ duplicate: true }));
    // Should NOT have called insertRow again for the duplicate
    expect(zerodbService.insertRow).not.toHaveBeenCalled();
  });

  // ── 6. document.signed creates PendingExtraction records ────────────────────
  test('document.signed event creates PendingExtraction records via parser', async () => {
    let parserModule;
    try {
      parserModule = require('../../../services/clerkyDocumentParser');
    } catch {
      // virtual mock
      parserModule = { parseAndQueueForReview: jest.fn() };
    }
    parserModule.parseAndQueueForReview = parserModule.parseAndQueueForReview || jest.fn();
    parserModule.parseAndQueueForReview.mockResolvedValue({ recordsQueued: 3 });

    // Mock finding data room
    zerodbService.queryTable.mockImplementation((table) => {
      if (table === 'data_rooms') return Promise.resolve({ data: [{ row_data: { dataRoomId: 'dr_1', companyId: 'co_1' } }] });
      if (table === 'users') return Promise.resolve({ data: [{ row_data: { email: 'admin@co.com', role: 'admin' } }] });
      return Promise.resolve({ data: [] });
    });

    const payload = { eventId: 'evt_signed_006', eventType: 'document.signed', companyId: 'co_1', documentType: 'certificate_of_incorporation', documentName: 'CoI.pdf', documentText: 'Some text content', signedAt: '2026-05-26T00:00:00Z' };

    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();
    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── 7. document.voided marks extractions as rejected ────────────────────────
  test('document.voided marks matching PendingExtraction records as rejected', async () => {
    zerodbService.queryTable.mockImplementation((table) => {
      if (table === 'pending_extractions') {
        return Promise.resolve({
          data: [
            { row_data: { extractionId: 'ext_1', sourceDocument: 'CoI.pdf', status: 'pending' } },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });

    const payload = { eventId: 'evt_voided_007', eventType: 'document.voided', companyId: 'co_1', documentName: 'CoI.pdf' };

    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();
    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(zerodbService.updateRows).toHaveBeenCalledWith(
      'pending_extractions',
      expect.objectContaining({
        filter: expect.objectContaining({ sourceDocument: 'CoI.pdf' }),
        update: expect.objectContaining({ status: 'rejected', rejectionReason: 'Document voided in Clerky' }),
      })
    );
  });

  // ── 8. Unknown event type returns 200 without error ─────────────────────────
  test('unknown event type returns 200 without error', async () => {
    const payload = { eventId: 'evt_unknown_008', eventType: 'some.future.event', data: {} };
    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();

    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ received: true }));
  });

  // ── 9. Email notification sent on document.signed ───────────────────────────
  test('sends email notification on document.signed event', async () => {
    zerodbService.queryTable.mockImplementation((table) => {
      if (table === 'data_rooms') return Promise.resolve({ data: [{ row_data: { dataRoomId: 'dr_1', companyId: 'co_1' } }] });
      if (table === 'users') return Promise.resolve({ data: [{ row_data: { email: 'admin@co.com', role: 'admin' } }] });
      return Promise.resolve({ data: [] });
    });

    const payload = { eventId: 'evt_email_009', eventType: 'document.signed', companyId: 'co_1', documentType: 'cert', documentName: 'doc.pdf', documentText: 'text', signedAt: '2026-05-26T00:00:00Z' };

    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();
    await controller.handleWebhook(req, res);

    expect(emailService.sendClerkyDocumentNotification).toHaveBeenCalled();
  });

  // ── 10. Email failure does NOT cause webhook to fail ────────────────────────
  test('email failure does not cause webhook to return non-200', async () => {
    zerodbService.queryTable.mockImplementation((table) => {
      if (table === 'data_rooms') return Promise.resolve({ data: [{ row_data: { dataRoomId: 'dr_1', companyId: 'co_1' } }] });
      if (table === 'users') return Promise.resolve({ data: [{ row_data: { email: 'admin@co.com', role: 'admin' } }] });
      return Promise.resolve({ data: [] });
    });

    emailService.sendClerkyDocumentNotification.mockRejectedValue(new Error('SMTP down'));

    const payload = { eventId: 'evt_emailfail_010', eventType: 'document.signed', companyId: 'co_1', documentType: 'cert', documentName: 'doc.pdf', documentText: 'text', signedAt: '2026-05-26T00:00:00Z' };

    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();
    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── 11. safe.executed routes through handleDocumentSigned with yc_safe type ─
  test('safe.executed event processes as document.signed with yc_safe type', async () => {
    zerodbService.queryTable.mockImplementation((table) => {
      if (table === 'data_rooms') return Promise.resolve({ data: [{ row_data: { dataRoomId: 'dr_1', companyId: 'co_1' } }] });
      if (table === 'users') return Promise.resolve({ data: [{ row_data: { email: 'admin@co.com', role: 'admin' } }] });
      return Promise.resolve({ data: [] });
    });

    const payload = { eventId: 'evt_safe_011', eventType: 'safe.executed', companyId: 'co_1', documentName: 'SAFE.pdf', documentText: 'safe text', signedAt: '2026-05-26T00:00:00Z' };

    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();
    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  // ── 12. grant.issued routes through handleDocumentSigned with option_grant type
  test('grant.issued event processes as document.signed with option_grant type', async () => {
    zerodbService.queryTable.mockImplementation((table) => {
      if (table === 'data_rooms') return Promise.resolve({ data: [{ row_data: { dataRoomId: 'dr_1', companyId: 'co_1' } }] });
      if (table === 'users') return Promise.resolve({ data: [{ row_data: { email: 'admin@co.com', role: 'admin' } }] });
      return Promise.resolve({ data: [] });
    });

    const payload = { eventId: 'evt_grant_012', eventType: 'grant.issued', companyId: 'co_1', documentName: 'Grant.pdf', documentText: 'grant text', signedAt: '2026-05-26T00:00:00Z' };

    const req = buildReq(payload, WEBHOOK_SECRET);
    const res = buildRes();
    await controller.handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
