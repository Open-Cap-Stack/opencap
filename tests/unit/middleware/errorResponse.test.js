const { errorResponse } = require('../../../middleware/errorResponse');

describe('errorResponse', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  test('returns standard error format', () => {
    errorResponse(mockRes, 400, 'Bad request');
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { status: 400, message: 'Bad request' }
    });
  });

  test('includes details in non-production', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    errorResponse(mockRes, 500, 'Server error', 'stack trace here');
    const call = mockRes.json.mock.calls[0][0];
    expect(call.error.details).toBe('stack trace here');
    process.env.NODE_ENV = origEnv;
  });

  test('omits details in production', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    errorResponse(mockRes, 500, 'Server error', 'stack trace here');
    const call = mockRes.json.mock.calls[0][0];
    expect(call.error.details).toBeUndefined();
    process.env.NODE_ENV = origEnv;
  });

  test('handles Error object details', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    errorResponse(mockRes, 500, 'Server error', new Error('db connection failed'));
    const call = mockRes.json.mock.calls[0][0];
    expect(call.error.details).toBe('db connection failed');
    process.env.NODE_ENV = origEnv;
  });

  test('always returns success: false', () => {
    errorResponse(mockRes, 404, 'Not found');
    const call = mockRes.json.mock.calls[0][0];
    expect(call.success).toBe(false);
  });

  test('handles null details without including details field', () => {
    errorResponse(mockRes, 500, 'Server error', null);
    const call = mockRes.json.mock.calls[0][0];
    expect(call.error.details).toBeUndefined();
  });

  test('returns the res object for chaining', () => {
    const result = errorResponse(mockRes, 400, 'Bad request');
    expect(result).toBe(mockRes);
  });

  test('handles various HTTP status codes', () => {
    errorResponse(mockRes, 401, 'Unauthorized');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: { status: 401, message: 'Unauthorized' }
    });
  });

  test('handles object details without message property in non-production', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    errorResponse(mockRes, 500, 'Server error', { code: 'ERR_CONN' });
    const call = mockRes.json.mock.calls[0][0];
    expect(call.error.details).toBe('[object Object]');
    process.env.NODE_ENV = origEnv;
  });
});
