/**
 * Custom Error Classes
 * 
 * [Feature] OCAE-204: Implement company management endpoints
 * Provides standardized error classes for API responses
 */

class CustomAPIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CustomAPIError';
  }
}

class BadRequestError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
  }
}

class NotFoundError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class UnauthorizedError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
  }
}

class ForbiddenError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
  }
}

class ConflictError extends CustomAPIError {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

class ValidationError extends CustomAPIError {
  constructor(message, errors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 422;
    this.errors = errors;
  }
}

class InternalServerError extends CustomAPIError {
  constructor(message = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
    this.statusCode = 500;
  }
}

module.exports = {
  CustomAPIError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InternalServerError
};
