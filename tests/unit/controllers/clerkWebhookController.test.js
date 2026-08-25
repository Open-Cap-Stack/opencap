/**
 * Clerk Webhook Controller Tests
 * Comprehensive coverage for webhook signature verification, user sync,
 * and all event type handlers
 */

const mockQueryTable = jest.fn();
const mockInsertRow = jest.fn();
const mockUpdateRows = jest.fn();

jest.mock('../../../services/zerodbService', () => ({
  queryTable: mockQueryTable,
  insertRow: mockInsertRow,
  updateRows: mockUpdateRows
}));

const crypto = require('crypto');
const httpMocks = require('node-mocks-http');
const clerkWebhookController = require('../../../controllers/clerkWebhookController');

describe('ClerkWebhookController', () => {
  let req, res;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    process.env.NODE_ENV = 'development';
    delete process.env.CLERK_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // Helper to build a valid Svix signature
  function buildSvixHeaders(body, secret) {
    const msgId = 'msg_test_123';
    const msgTimestamp = String(Math.floor(Date.now() / 1000));
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const toSign = `${msgId}.${msgTimestamp}.${bodyStr}`;
    const signature = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
    return {
      'svix-id': msgId,
      'svix-timestamp': msgTimestamp,
      'svix-signature': `v1,${signature}`
    };
  }

  describe('handleClerkWebhook - signature verification', () => {
    it('should skip signature verification in development when no secret configured', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CLERK_WEBHOOK_SECRET;

      req.body = { type: 'session.created', data: {} };

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.received).toBe(true);
    });

    it('should return 401 in production when CLERK_WEBHOOK_SECRET is not set', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CLERK_WEBHOOK_SECRET;

      req.body = { type: 'user.created', data: {} };

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('CLERK_WEBHOOK_SECRET not configured');
    });

    it('should return 401 when svix headers are missing', async () => {
      process.env.CLERK_WEBHOOK_SECRET = 'whsec_' + Buffer.from('test-secret-key-1234567890').toString('base64');

      req.body = { type: 'user.created', data: {} };
      // No svix headers set

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Missing required Svix headers');
    });

    it('should return 401 when timestamp is too old', async () => {
      const secret = 'whsec_' + Buffer.from('test-secret-key-1234567890').toString('base64');
      process.env.CLERK_WEBHOOK_SECRET = secret;

      const body = { type: 'user.created', data: {} };
      req.body = body;

      // Set timestamp 10 minutes in the past (> 300 seconds)
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600);
      req.headers['svix-id'] = 'msg_test_123';
      req.headers['svix-timestamp'] = oldTimestamp;
      req.headers['svix-signature'] = 'v1,invalid';

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('replay attack');
    });

    it('should return 401 when signature does not match', async () => {
      const rawSecret = 'test-secret-key-1234567890abc';
      const secret = 'whsec_' + Buffer.from(rawSecret).toString('base64');
      process.env.CLERK_WEBHOOK_SECRET = secret;

      const body = { type: 'user.created', data: {} };
      req.body = body;

      // Generate a valid-length but wrong signature
      const timestamp = String(Math.floor(Date.now() / 1000));
      const secretBytes = Buffer.from(rawSecret, 'base64');
      const wrongBody = 'different-body-content';
      const toSign = `msg_test_123.${timestamp}.${wrongBody}`;
      const wrongSig = require('crypto').createHmac('sha256', secretBytes).update(toSign).digest('base64');

      req.headers['svix-id'] = 'msg_test_123';
      req.headers['svix-timestamp'] = timestamp;
      req.headers['svix-signature'] = `v1,${wrongSig}`;

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('signature verification failed');
    });

    it('should accept valid signature and process webhook', async () => {
      const rawSecret = 'test-secret-key-1234567890abc';
      const secret = 'whsec_' + Buffer.from(rawSecret).toString('base64');
      process.env.CLERK_WEBHOOK_SECRET = secret;

      const body = {
        type: 'session.created',
        data: { id: 'sess_123' }
      };
      req.body = body;

      const headers = buildSvixHeaders(body, secret);
      Object.entries(headers).forEach(([key, val]) => {
        req.headers[key] = val;
      });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.received).toBe(true);
    });
  });

  describe('handleClerkWebhook - user.created', () => {
    it('should create a new user when user does not exist', async () => {
      const clerkUser = {
        id: 'clerk_user_123',
        first_name: 'Jane',
        last_name: 'Smith',
        email_addresses: [
          { id: 'email_1', email_address: 'jane@example.com' }
        ],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null,
        image_url: 'https://img.clerk.com/jane.jpg',
        public_metadata: { plan: 'starter' },
        created_at: 1700000000000
      };

      req.body = { type: 'user.created', data: clerkUser };

      // No existing user
      mockQueryTable.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_1' });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockQueryTable).toHaveBeenCalledWith('users', {
        filter: { clerkId: 'clerk_user_123' }
      });
      expect(mockInsertRow).toHaveBeenCalledWith('users', expect.objectContaining({
        clerkId: 'clerk_user_123',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee',
        clerkSynced: true
      }));
    });

    it('should skip creation when user already exists (idempotent)', async () => {
      const clerkUser = {
        id: 'clerk_user_existing',
        first_name: 'Existing',
        last_name: 'User',
        email_addresses: [{ id: 'email_1', email_address: 'existing@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.created', data: clerkUser };

      // User already exists
      mockQueryTable.mockResolvedValue({
        data: [{ row_data: { clerkId: 'clerk_user_existing', email: 'existing@example.com' }, row_id: 'row_1' }]
      });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockInsertRow).not.toHaveBeenCalled();
    });

    it('should extract primary email correctly', async () => {
      const clerkUser = {
        id: 'clerk_multi_email',
        first_name: 'Multi',
        last_name: 'Email',
        email_addresses: [
          { id: 'email_secondary', email_address: 'secondary@example.com' },
          { id: 'email_primary', email_address: 'primary@example.com' }
        ],
        primary_email_address_id: 'email_primary',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.created', data: clerkUser };
      mockQueryTable.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_2' });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(mockInsertRow).toHaveBeenCalledWith('users', expect.objectContaining({
        email: 'primary@example.com'
      }));
    });

    it('should handle missing email addresses gracefully', async () => {
      const clerkUser = {
        id: 'clerk_no_email',
        first_name: 'No',
        last_name: 'Email',
        email_addresses: [],
        primary_email_address_id: null,
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.created', data: clerkUser };
      mockQueryTable.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_3' });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockInsertRow).toHaveBeenCalledWith('users', expect.objectContaining({
        email: null,
        clerkId: 'clerk_no_email'
      }));
    });

    it('should extract primary phone number', async () => {
      const clerkUser = {
        id: 'clerk_with_phone',
        first_name: 'Phone',
        last_name: 'User',
        email_addresses: [{ id: 'email_1', email_address: 'phone@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [
          { id: 'phone_1', phone_number: '+15551234567' },
          { id: 'phone_2', phone_number: '+15559876543' }
        ],
        primary_phone_number_id: 'phone_1'
      };

      req.body = { type: 'user.created', data: clerkUser };
      mockQueryTable.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_4' });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(mockInsertRow).toHaveBeenCalledWith('users', expect.objectContaining({
        phone: '+15551234567'
      }));
    });
  });

  describe('handleClerkWebhook - user.updated', () => {
    it('should update an existing user', async () => {
      const clerkUser = {
        id: 'clerk_update_user',
        first_name: 'Updated',
        last_name: 'Name',
        email_addresses: [{ id: 'email_1', email_address: 'updated@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.updated', data: clerkUser };

      // User exists
      mockQueryTable.mockResolvedValue({
        data: [{ row_data: { clerkId: 'clerk_update_user' }, row_id: 'row_5' }]
      });
      mockUpdateRows.mockResolvedValue({ updated: 1 });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUpdateRows).toHaveBeenCalledWith('users', {
        filter: { clerkId: 'clerk_update_user' },
        update: expect.objectContaining({
          email: 'updated@example.com',
          firstName: 'Updated',
          lastName: 'Name',
          clerkSynced: true
        })
      });
    });

    it('should create user when user.updated arrives but user does not exist', async () => {
      const clerkUser = {
        id: 'clerk_new_via_update',
        first_name: 'New',
        last_name: 'ViaUpdate',
        email_addresses: [{ id: 'email_1', email_address: 'new-via-update@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.updated', data: clerkUser };

      // First query: user doesn't exist (for update check)
      // Second query: user doesn't exist (for creation idempotency check)
      mockQueryTable.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_6' });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      // Should have called insertRow as it fell through to handleUserCreated
      expect(mockInsertRow).toHaveBeenCalledWith('users', expect.objectContaining({
        clerkId: 'clerk_new_via_update',
        email: 'new-via-update@example.com'
      }));
    });
  });

  describe('handleClerkWebhook - user.deleted', () => {
    it('should soft-delete a user', async () => {
      const clerkUser = { id: 'clerk_delete_user' };

      req.body = { type: 'user.deleted', data: clerkUser };

      mockUpdateRows.mockResolvedValue({ updated: 1 });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockUpdateRows).toHaveBeenCalledWith('users', {
        filter: { clerkId: 'clerk_delete_user' },
        update: expect.objectContaining({
          clerkDeleted: true,
          clerkDeletedAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      });
    });
  });

  describe('handleClerkWebhook - unknown event types', () => {
    it('should acknowledge unknown event types with 200', async () => {
      req.body = { type: 'organization.created', data: { id: 'org_123' } };

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.received).toBe(true);
      expect(data.type).toBe('organization.created');
    });
  });

  describe('handleClerkWebhook - invalid body', () => {
    it('should return 400 for invalid JSON when body is a string', async () => {
      req.body = 'not-valid-json{{{';

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid JSON body');
    });
  });

  describe('handleClerkWebhook - handler errors', () => {
    it('should return 200 with warning when handler throws', async () => {
      const clerkUser = {
        id: 'clerk_error_user',
        first_name: 'Error',
        last_name: 'User',
        email_addresses: [{ id: 'email_1', email_address: 'error@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.created', data: clerkUser };

      // Simulate DB error
      mockQueryTable.mockRejectedValue(new Error('Database connection failed'));

      await clerkWebhookController.handleClerkWebhook(req, res);

      // Should still return 200 so Clerk doesn't retry
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.received).toBe(true);
      expect(data.warning).toBeDefined();
    });
  });

  describe('handleClerkWebhook - unwrap helper edge cases', () => {
    it('should handle result with rows format', async () => {
      const clerkUser = {
        id: 'clerk_rows_format',
        first_name: 'Rows',
        last_name: 'Format',
        email_addresses: [{ id: 'email_1', email_address: 'rows@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.created', data: clerkUser };

      // Return data in 'rows' format
      mockQueryTable.mockResolvedValue({
        rows: [{ row_data: { clerkId: 'clerk_rows_format' }, row_id: 'existing_row' }]
      });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      // Should have skipped insertion since user exists
      expect(mockInsertRow).not.toHaveBeenCalled();
    });

    it('should handle null query result', async () => {
      const clerkUser = {
        id: 'clerk_null_result',
        first_name: 'Null',
        last_name: 'Result',
        email_addresses: [{ id: 'email_1', email_address: 'null@example.com' }],
        primary_email_address_id: 'email_1',
        phone_numbers: [],
        primary_phone_number_id: null
      };

      req.body = { type: 'user.created', data: clerkUser };

      // Return null
      mockQueryTable.mockResolvedValue(null);
      mockInsertRow.mockResolvedValue({ row_id: 'row_null' });

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
      // null unwraps to [], so user does not exist -> should insert
      expect(mockInsertRow).toHaveBeenCalled();
    });
  });

  describe('handleClerkWebhook - signature with multiple signatures', () => {
    it('should accept when one of multiple signatures is valid', async () => {
      const rawSecret = 'multi-sig-secret-key-abcdef';
      const secret = 'whsec_' + Buffer.from(rawSecret).toString('base64');
      process.env.CLERK_WEBHOOK_SECRET = secret;

      const body = { type: 'session.ended', data: { id: 'sess_456' } };
      req.body = body;

      // The controller strips "whsec_" and base64-decodes, so secretBytes = Buffer.from(rawSecret)
      // because Buffer.from(rawSecret).toString('base64') -> base64-decode -> rawSecret bytes
      const secretBytes = Buffer.from(Buffer.from(rawSecret).toString('base64'), 'base64');

      const msgId = 'msg_multi_sig';
      const msgTimestamp = String(Math.floor(Date.now() / 1000));
      const bodyStr = JSON.stringify(body);
      const toSign = `${msgId}.${msgTimestamp}.${bodyStr}`;
      const validSig = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');

      // Build a fake invalid sig with the same length as the valid one
      const fakeWrongSig = crypto.createHmac('sha256', secretBytes).update('wrong-content').digest('base64');

      req.headers['svix-id'] = msgId;
      req.headers['svix-timestamp'] = msgTimestamp;
      // Multiple signatures, first is wrong, second is valid
      req.headers['svix-signature'] = `v1,${fakeWrongSig} v1,${validSig}`;

      await clerkWebhookController.handleClerkWebhook(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
