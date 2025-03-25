/**
 * Response Debugger and Fixer Middleware
 * [Bug] OCAE-empty-response: Fix SPVasset controller empty response objects
 * 
 * This middleware has two purposes:
 * 1. Debug: Log response data before it is sent
 * 2. Fix: Ensure response objects are properly serialized from Mongoose documents
 */

/**
 * Safely converts any object to a plain JavaScript object
 * Handles Mongoose documents, arrays, and nested objects
 * 
 * @param {*} data - The data to convert
 * @return {*} - The converted plain JavaScript object
 */
const sanitizeMongooseData = (data) => {
  // Return null/undefined as is
  if (data == null) return data;
  
  // Handle arrays recursively
  if (Array.isArray(data)) {
    return data.map(item => sanitizeMongooseData(item));
  }
  
  // For objects that have toJSON or toObject methods (like Mongoose documents)
  if (typeof data === 'object') {
    // First try official Mongoose conversion methods
    if (typeof data.toJSON === 'function') {
      return data.toJSON();
    }
    
    if (typeof data.toObject === 'function') {
      return data.toObject();
    }
    
    // For plain objects, process each property recursively
    if (data.constructor === Object) {
      const result = {};
      
      // Process each property
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          result[key] = sanitizeMongooseData(data[key]);
        }
      }
      
      return result;
    }
  }
  
  // Return primitives and other types as is
  return data;
};

/**
 * Middleware to debug response data and ensure it's properly serialized
 */
const responseDebugger = (req, res, next) => {
  // Store original res.json
  const originalJson = res.json;
  
  // Override res.json to log and fix data before sending
  res.json = function(data) {
    console.log('DEBUG - Response data before sanitization:', JSON.stringify(data));
    
    // Check if data is empty object but response status is 200 OK
    if (data && typeof data === 'object' && Object.keys(data).length === 0 && res.statusCode >= 200 && res.statusCode < 300) {
      console.warn('WARN - Empty response object detected with success status code');
      
      // Try to recover data from res.locals if available (some middleware might store it there)
      if (res.locals && res.locals.responseData) {
        console.log('INFO - Using data from res.locals.responseData');
        data = res.locals.responseData;
      }
    }
    
    // Sanitize data to ensure proper serialization
    const sanitizedData = sanitizeMongooseData(data);
    
    console.log('DEBUG - Response data after sanitization:', JSON.stringify(sanitizedData));
    
    // Call original res.json with sanitized data
    return originalJson.call(this, sanitizedData);
  };
  
  next();
};

module.exports = responseDebugger;
