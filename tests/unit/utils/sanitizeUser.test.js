/**
 * Tests for sanitizeUser utility
 * Issue #386: Remove password from API responses
 */

const { sanitizeUser, sanitizeUsers, removePassword, SENSITIVE_FIELDS } = require('../../../utils/sanitizeUser');

describe('sanitizeUser utility', () => {
  describe('sanitizeUser', () => {
    it('should remove password field from user object', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User'
      };

      const sanitized = sanitizeUser(user);

      expect(sanitized.password).toBeUndefined();
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.name).toBe('Test User');
    });

    it('should remove all sensitive fields', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        verificationToken: 'token123',
        resetPasswordToken: 'reset123',
        __v: 0
      };

      const sanitized = sanitizeUser(user);

      SENSITIVE_FIELDS.forEach(field => {
        expect(sanitized[field]).toBeUndefined();
      });
    });

    it('should handle null user', () => {
      expect(sanitizeUser(null)).toBeNull();
    });

    it('should handle user with toObject method (Mongoose docs)', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        toObject: function() {
          return { ...this };
        }
      };

      const sanitized = sanitizeUser(user);
      expect(sanitized.password).toBeUndefined();
    });
  });

  describe('sanitizeUsers', () => {
    it('should sanitize array of users', () => {
      const users = [
        { _id: '1', email: 'user1@example.com', password: 'pass1' },
        { _id: '2', email: 'user2@example.com', password: 'pass2' }
      ];

      const sanitized = sanitizeUsers(users);

      expect(sanitized).toHaveLength(2);
      sanitized.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should handle empty array', () => {
      expect(sanitizeUsers([])).toEqual([]);
    });

    it('should handle non-array input', () => {
      expect(sanitizeUsers(null)).toEqual([]);
      expect(sanitizeUsers('not an array')).toEqual([]);
    });
  });

  describe('removePassword', () => {
    it('should remove only password field', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        password: 'hashed_password',
        verificationToken: 'token123'
      };

      const result = removePassword(user);

      expect(result.password).toBeUndefined();
      expect(result.verificationToken).toBe('token123');
      expect(result.email).toBe('test@example.com');
    });

    it('should handle null input', () => {
      expect(removePassword(null)).toBeNull();
    });
  });
});
