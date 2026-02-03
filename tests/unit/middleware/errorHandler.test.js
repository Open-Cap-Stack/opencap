/**
 * Error Handler Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for centralized error handling middleware
 * Target coverage: 80%+
 */

const errorHandlerMiddleware = require('../../../middleware/errorHandler');
const { StatusCodes } = require('http-status-codes');
const {
  CustomAPIError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InternalServerError
} = require('../../../errors');

describe('Error Handler Middleware', () => {
  let req;
  let res;
  let next;
  let consoleSpy;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/api/test'
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    // Suppress console.error during tests
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('CustomAPIError handling', () => {
    it('should handle BadRequestError', () => {
      const error = new BadRequestError('Invalid input data');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'BadRequestError',
        message: 'Invalid input data'
      });
    });

    it('should handle NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'NotFoundError',
        message: 'Resource not found'
      });
    });

    it('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Authentication required');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    });

    it('should handle ForbiddenError', () => {
      const error = new ForbiddenError('Access denied');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ForbiddenError',
        message: 'Access denied'
      });
    });

    it('should handle ConflictError', () => {
      const error = new ConflictError('Resource already exists');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ConflictError',
        message: 'Resource already exists'
      });
    });

    it('should handle ValidationError with errors object', () => {
      const error = new ValidationError('Validation failed', {
        email: 'Invalid email format',
        name: 'Name is required'
      });
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ValidationError',
        message: 'Validation failed',
        errors: {
          email: 'Invalid email format',
          name: 'Name is required'
        }
      });
    });

    it('should handle InternalServerError', () => {
      const error = new InternalServerError('Database connection failed');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'InternalServerError',
        message: 'Database connection failed'
      });
    });
  });

  describe('Mongoose ValidationError handling', () => {
    it('should handle Mongoose validation errors', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          name: { message: 'Name must be at least 3 characters' }
        }
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ValidationError',
        message: 'Validation failed',
        errors: ['Email is required', 'Name must be at least 3 characters']
      });
    });

    it('should handle single field validation error', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          status: { message: 'Status is invalid' }
        }
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'ValidationError',
        message: 'Validation failed',
        errors: ['Status is invalid']
      });
    });
  });

  describe('MongoDB duplicate key error handling', () => {
    it('should handle duplicate key error', () => {
      const error = {
        code: 11000,
        keyValue: { email: 'test@example.com' }
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'DuplicateError',
        message: 'Duplicate value for email',
        field: 'email'
      });
    });

    it('should handle duplicate key error for different fields', () => {
      const error = {
        code: 11000,
        keyValue: { username: 'existinguser' }
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'DuplicateError',
        message: 'Duplicate value for username',
        field: 'username'
      });
    });
  });

  describe('MongoDB CastError handling', () => {
    it('should handle CastError for invalid ObjectId', () => {
      const error = {
        name: 'CastError',
        path: '_id',
        value: 'invalid-id'
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'CastError',
        message: 'Invalid _id: invalid-id',
        field: '_id'
      });
    });

    it('should handle CastError for other fields', () => {
      const error = {
        name: 'CastError',
        path: 'userId',
        value: 'not-an-objectid'
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'CastError',
        message: 'Invalid userId: not-an-objectid',
        field: 'userId'
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic errors with 500 status', () => {
      const error = new Error('Something went wrong');
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'ServerError',
          message: 'Something went wrong, please try again later'
        })
      );
    });

    it('should include stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Dev error');
      error.stack = 'Error: Dev error\n    at Test.fn';
      errorHandlerMiddleware(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.stringContaining('Error: Dev error')
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Prod error');
      error.stack = 'Error: Prod error\n    at Test.fn';
      errorHandlerMiddleware(error, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error logging', () => {
    it('should log all errors to console', () => {
      const error = new Error('Test error');
      errorHandlerMiddleware(error, req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith('Error:', error);
    });
  });

  describe('Edge cases', () => {
    it('should handle error without message', () => {
      const error = new Error();
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    });

    it('should handle error with code but no keyValue', () => {
      const error = {
        code: 11000,
        keyValue: {}
      };
      errorHandlerMiddleware(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
    });

    it('should handle CustomAPIError without errors property', () => {
      const error = new BadRequestError('Bad request');
      errorHandlerMiddleware(error, req, res, next);

      const jsonCall = res.json.mock.calls[0][0];
      expect(jsonCall.errors).toBeUndefined();
    });
  });
});
