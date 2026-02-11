/**
 * User Sanitization Utility
 * Issue #386: Remove password from API responses
 *
 * Provides utilities to remove sensitive fields from user objects
 * before sending them in API responses.
 */

/**
 * List of sensitive fields to remove from user objects
 */
const SENSITIVE_FIELDS = [
  'password',
  'verificationToken',
  'verificationTokenExpires',
  'resetPasswordToken',
  'resetPasswordExpires',
  '__v'
];

/**
 * Remove sensitive fields from a user object
 * @param {Object} user - User object (can be Mongoose doc or plain object)
 * @returns {Object} Sanitized user object without sensitive fields
 */
function sanitizeUser(user) {
  if (!user) return null;

  // Convert Mongoose document to plain object if needed
  const userObj = user.toObject ? user.toObject() : { ...user };

  // Remove sensitive fields
  SENSITIVE_FIELDS.forEach(field => {
    delete userObj[field];
  });

  return userObj;
}

/**
 * Remove sensitive fields from an array of user objects
 * @param {Array} users - Array of user objects
 * @returns {Array} Array of sanitized user objects
 */
function sanitizeUsers(users) {
  if (!Array.isArray(users)) return [];
  return users.map(user => sanitizeUser(user));
}

/**
 * Remove password field using destructuring (for inline use)
 * @param {Object} user - User object
 * @returns {Object} User object without password
 */
function removePassword(user) {
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  sanitizeUser,
  sanitizeUsers,
  removePassword,
  SENSITIVE_FIELDS
};
