/**
 * Error Handling Middleware
 * 
 * [Feature] OCAE-204: Implement company management endpoints
 * Centralized error handling for consistent API responses
 */

const { StatusCodes } = require('http-status-codes');
const { CustomAPIError } = require('../errors');

const errorHandlerMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  // Check if this is one of our custom API errors
  if (err instanceof CustomAPIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.name,
      message: err.message,
      ...(err.errors && { errors: err.errors })
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'ValidationError',
      message: 'Validation failed',
      errors
    });
  }

  // Handle MongoDB duplicate key error
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(StatusCodes.CONFLICT).json({
      success: false,
      error: 'DuplicateError',
      message: `Duplicate value for ${field}`,
      field
    });
  }

  // Handle MongoDB cast errors (e.g., invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: 'CastError',
      message: `Invalid ${err.path}: ${err.value}`,
      field: err.path
    });
  }

  // Default server error
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: 'ServerError',
    message: 'Something went wrong, please try again later',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandlerMiddleware;
