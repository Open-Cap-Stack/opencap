/**
 * Newsletter Controller Tests
 * Full coverage for subscribe and list handlers
 */

const mockQueryRows = jest.fn();
const mockInsertRow = jest.fn();

jest.mock('../../../services/zerodbService', () => ({
  queryRows: mockQueryRows,
  insertRow: mockInsertRow
}));

const httpMocks = require('node-mocks-http');
const newsletterController = require('../../../controllers/newsletterController');

describe('NewsletterController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('subscribe', () => {
    it('should subscribe a new email successfully', async () => {
      req.body = { email: 'new@example.com' };
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_1' });

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Subscribed successfully');
      expect(mockInsertRow).toHaveBeenCalledWith('newsletter_subscribers', expect.objectContaining({
        email: 'new@example.com',
        status: 'active'
      }));
    });

    it('should normalize email to lowercase and trimmed', async () => {
      req.body = { email: '  USER@EXAMPLE.COM  ' };
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_2' });

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockQueryRows).toHaveBeenCalledWith('newsletter_subscribers', {
        filter: { email: 'user@example.com' },
        limit: 1
      });
      expect(mockInsertRow).toHaveBeenCalledWith('newsletter_subscribers', expect.objectContaining({
        email: 'user@example.com'
      }));
    });

    it('should return 200 when email is already subscribed', async () => {
      req.body = { email: 'existing@example.com' };
      mockQueryRows.mockResolvedValue({
        data: [{ email: 'existing@example.com', status: 'active' }]
      });

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Already subscribed');
      expect(mockInsertRow).not.toHaveBeenCalled();
    });

    it('should return 400 when email is missing', async () => {
      req.body = {};

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Email is required');
    });

    it('should return 400 when email is null', async () => {
      req.body = { email: null };

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Email is required');
    });

    it('should return 400 when email is not a string', async () => {
      req.body = { email: 123 };

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Email is required');
    });

    it('should return 400 when email is empty string', async () => {
      req.body = { email: '' };

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Email is required');
    });

    it('should return 400 for invalid email format - no @', async () => {
      req.body = { email: 'notanemail' };

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Invalid email address');
    });

    it('should return 400 for invalid email format - no domain', async () => {
      req.body = { email: 'user@' };

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Invalid email address');
    });

    it('should return 400 for invalid email format - no TLD', async () => {
      req.body = { email: 'user@domain' };

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Invalid email address');
    });

    it('should use source from request body when provided', async () => {
      req.body = { email: 'source@example.com', source: 'landing-page' };
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_3' });

      await newsletterController.subscribe(req, res);

      expect(mockInsertRow).toHaveBeenCalledWith('newsletter_subscribers', expect.objectContaining({
        source: 'landing-page'
      }));
    });

    it('should use referer header as source when body source is missing', async () => {
      req.body = { email: 'referer@example.com' };
      req.headers = { referer: 'https://blog.example.com/article' };
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_4' });

      await newsletterController.subscribe(req, res);

      expect(mockInsertRow).toHaveBeenCalledWith('newsletter_subscribers', expect.objectContaining({
        source: 'https://blog.example.com/article'
      }));
    });

    it('should use unknown as source when neither body source nor referer exists', async () => {
      req.body = { email: 'nosource@example.com' };
      req.headers = {};
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_5' });

      await newsletterController.subscribe(req, res);

      expect(mockInsertRow).toHaveBeenCalledWith('newsletter_subscribers', expect.objectContaining({
        source: 'unknown'
      }));
    });

    it('should return 201 even when database insert fails (graceful degradation)', async () => {
      req.body = { email: 'error@example.com' };
      mockQueryRows.mockRejectedValue(new Error('Database unavailable'));

      await newsletterController.subscribe(req, res);

      // The controller catches errors and returns 201 for graceful degradation
      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Subscribed successfully');
    });

    it('should include subscribedAt timestamp in subscription record', async () => {
      req.body = { email: 'timestamp@example.com' };
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_6' });

      await newsletterController.subscribe(req, res);

      expect(mockInsertRow).toHaveBeenCalledWith('newsletter_subscribers', expect.objectContaining({
        subscribedAt: expect.any(String)
      }));
    });

    it('should accept valid emails with + tags', async () => {
      req.body = { email: 'user+newsletter@example.com' };
      mockQueryRows.mockResolvedValue({ data: [] });
      mockInsertRow.mockResolvedValue({ row_id: 'row_7' });

      await newsletterController.subscribe(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('list', () => {
    it('should return list of subscribers', async () => {
      const mockSubscribers = [
        { email: 'user1@example.com', subscribedAt: '2026-01-01' },
        { email: 'user2@example.com', subscribedAt: '2026-01-02' }
      ];
      mockQueryRows.mockResolvedValue({ data: mockSubscribers, total: 2 });

      await newsletterController.list(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it('should return empty array when no subscribers exist', async () => {
      mockQueryRows.mockResolvedValue({ data: [], total: 0 });

      await newsletterController.list(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return empty array on database error (graceful degradation)', async () => {
      mockQueryRows.mockRejectedValue(new Error('Database error'));

      await newsletterController.list(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should handle null data response', async () => {
      mockQueryRows.mockResolvedValue({ data: null, total: null });

      await newsletterController.list(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should handle undefined response', async () => {
      mockQueryRows.mockResolvedValue(undefined);

      await newsletterController.list(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should query with correct table name and sort', async () => {
      mockQueryRows.mockResolvedValue({ data: [], total: 0 });

      await newsletterController.list(req, res);

      expect(mockQueryRows).toHaveBeenCalledWith('newsletter_subscribers', {
        limit: 1000,
        sort: { subscribedAt: -1 }
      });
    });
  });
});
