'use strict';

/**
 * Token Encryption Utility Tests
 * Issue #680: AES-256-GCM token encryption for OAuth tokens
 * TDD: RED phase — tests written before implementation
 */

const crypto = require('crypto');

// Generate a deterministic 32-byte key for testing (hex-encoded = 64 chars)
const TEST_KEY = crypto.randomBytes(32).toString('hex');

// Set env before requiring module
process.env.ENCRYPTION_KEY = TEST_KEY;

const { encrypt, decrypt } = require('../../../utils/tokenEncryption');

describe('tokenEncryption', () => {
  describe('encrypt', () => {
    it('should return a string in iv:authTag:ciphertext format', () => {
      const result = encrypt('my-secret-token');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
      // Each part should be valid base64
      parts.forEach((part) => {
        const buf = Buffer.from(part, 'base64');
        expect(buf.length).toBeGreaterThan(0);
      });
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const a = encrypt('same-token');
      const b = encrypt('same-token');
      expect(a).not.toBe(b);
    });

    it('should throw when plaintext is empty or not a string', () => {
      expect(() => encrypt('')).toThrow();
      expect(() => encrypt(null)).toThrow();
      expect(() => encrypt(undefined)).toThrow();
      expect(() => encrypt(123)).toThrow();
    });

    it('should throw when ENCRYPTION_KEY is missing', () => {
      const origKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      // Re-require to pick up missing key behavior
      jest.resetModules();
      const mod = require('../../../utils/tokenEncryption');
      expect(() => mod.encrypt('test')).toThrow(/ENCRYPTION_KEY/);
      process.env.ENCRYPTION_KEY = origKey;
    });
  });

  describe('decrypt', () => {
    it('should recover the original plaintext', () => {
      const original = 'mercury_access_token_abc123';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should handle long tokens', () => {
      const longToken = 'x'.repeat(2048);
      const encrypted = encrypt(longToken);
      expect(decrypt(encrypted)).toBe(longToken);
    });

    it('should handle tokens with special characters', () => {
      const special = 'tok/en+with=special&chars!@#$%^';
      const encrypted = encrypt(special);
      expect(decrypt(encrypted)).toBe(special);
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = encrypt('valid-token');
      const parts = encrypted.split(':');
      // Tamper with the ciphertext portion
      const tampered = parts[0] + ':' + parts[1] + ':' +
        Buffer.from('tampered-data').toString('base64');
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on tampered auth tag', () => {
      const encrypted = encrypt('valid-token');
      const parts = encrypted.split(':');
      const badTag = Buffer.alloc(16, 0).toString('base64');
      const tampered = parts[0] + ':' + badTag + ':' + parts[2];
      expect(() => decrypt(tampered)).toThrow();
    });

    it('should throw on malformed input', () => {
      expect(() => decrypt('not-valid-format')).toThrow();
      expect(() => decrypt('')).toThrow();
      expect(() => decrypt(null)).toThrow();
    });
  });

  describe('round-trip', () => {
    it('should encrypt and decrypt multiple tokens correctly', () => {
      const tokens = [
        'mercury_tok_abc123',
        'google_refresh_xyz789',
        'eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoidmFsdWUifQ.signature',
      ];
      tokens.forEach((token) => {
        const encrypted = encrypt(token);
        expect(decrypt(encrypted)).toBe(token);
      });
    });

    it('should work with different key per module reload', () => {
      const newKey = crypto.randomBytes(32).toString('hex');
      process.env.ENCRYPTION_KEY = newKey;
      jest.resetModules();
      const mod = require('../../../utils/tokenEncryption');
      const encrypted = mod.encrypt('test-token');
      expect(mod.decrypt(encrypted)).toBe('test-token');
      // Restore original key
      process.env.ENCRYPTION_KEY = TEST_KEY;
    });
  });
});
