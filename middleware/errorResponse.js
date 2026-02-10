/**
 * Standard error response helper
 * Provides consistent error format across all controllers
 */
function errorResponse(res, status, message, details = null) {
  const response = {
    success: false,
    error: {
      status,
      message
    }
  };
  if (details && process.env.NODE_ENV !== 'production') {
    response.error.details = typeof details === 'object' ? details.message || String(details) : details;
  }
  return res.status(status).json(response);
}

module.exports = { errorResponse };
