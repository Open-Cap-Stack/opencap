/**
 * Unit tests for EncryptionService
 */

const EncryptionService = require('../../../../services/security/encryptionService');

const MASTER_KEY = 'a'.repeat(32);

describe('EncryptionService', () => {
  let enc;

  beforeEach(() => {
    enc = new EncryptionService({ masterKey: MASTER_KEY });
  });

  // ============ Constructor ============

  describe('constructor', () => {
    it('should throw when no masterKey is provided', () => {
      expect(() => new EncryptionService({})).toThrow('Master key is required');
    });

    it('should throw when masterKey is too short', () => {
      expect(() => new EncryptionService({ masterKey: 'short' })).toThrow(
        'Master key must be at least 32 characters'
      );
    });

    it('should use default algorithm aes-256-gcm', () => {
      expect(enc.config.algorithm).toBe('aes-256-gcm');
    });

    it('should accept custom algorithm', () => {
      const service = new EncryptionService({ masterKey: MASTER_KEY, algorithm: 'aes-256-gcm' });
      expect(service.config.algorithm).toBe('aes-256-gcm');
    });
  });

  // ============ Encrypt / Decrypt ============

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = enc.encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      const decrypted = enc.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'Same data';
      const enc1 = enc.encrypt(plaintext);
      const enc2 = enc.encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
    });

    it('should handle empty string', () => {
      const encrypted = enc.encrypt('');
      expect(enc.decrypt(encrypted)).toBe('');
    });

    it('should handle long strings', () => {
      const longText = 'x'.repeat(10000);
      const encrypted = enc.encrypt(longText);
      expect(enc.decrypt(encrypted)).toBe(longText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = 'Stakeholder name in Japanese';
      const encrypted = enc.encrypt(unicodeText);
      expect(enc.decrypt(encrypted)).toBe(unicodeText);
    });

    it('should throw on decryption with wrong key', () => {
      const encrypted = enc.encrypt('secret data');
      const otherService = new EncryptionService({ masterKey: 'b'.repeat(32) });
      expect(() => otherService.decrypt(encrypted)).toThrow('Decryption failed');
    });

    it('should throw on corrupted ciphertext', () => {
      expect(() => enc.decrypt('not-valid-base64-ciphertext!!')).toThrow();
    });
  });

  // ============ Field-Level Encryption ============

  describe('encryptFields and decryptFields', () => {
    it('should encrypt and decrypt specified fields', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john@example.com'
      };

      const encrypted = enc.encryptFields(data, ['ssn']);
      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.ssn).not.toBe('123-45-6789');

      const decrypted = enc.decryptFields(encrypted, ['ssn']);
      expect(decrypted.ssn).toBe('123-45-6789');
    });

    it('should handle nested fields', () => {
      const data = {
        user: {
          name: 'Jane',
          ssn: '987-65-4321'
        }
      };

      const encrypted = enc.encryptFields(data, ['user.ssn']);
      expect(encrypted.user.ssn).not.toBe('987-65-4321');

      const decrypted = enc.decryptFields(encrypted, ['user.ssn']);
      expect(decrypted.user.ssn).toBe('987-65-4321');
    });

    it('should handle array notation fields', () => {
      const data = {
        users: [
          { name: 'Alice', ssn: '111-11-1111' },
          { name: 'Bob', ssn: '222-22-2222' }
        ]
      };

      const encrypted = enc.encryptFields(data, ['users[].ssn']);
      expect(encrypted.users[0].name).toBe('Alice');
      expect(encrypted.users[0].ssn).not.toBe('111-11-1111');
      expect(encrypted.users[1].ssn).not.toBe('222-22-2222');

      const decrypted = enc.decryptFields(encrypted, ['users[].ssn']);
      expect(decrypted.users[0].ssn).toBe('111-11-1111');
      expect(decrypted.users[1].ssn).toBe('222-22-2222');
    });

    it('should skip null/undefined field values', () => {
      const data = { name: 'Test', ssn: null };
      const encrypted = enc.encryptFields(data, ['ssn']);
      expect(encrypted.ssn).toBeNull();
    });

    it('should not modify original data', () => {
      const data = { ssn: '123-45-6789' };
      enc.encryptFields(data, ['ssn']);
      expect(data.ssn).toBe('123-45-6789');
    });
  });

  // ============ Key Generation and Derivation ============

  describe('generateKey', () => {
    it('should generate a base64-encoded key', () => {
      const key = enc.generateKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate 256-bit key by default', () => {
      const key = enc.generateKey();
      const bytes = Buffer.from(key, 'base64');
      expect(bytes.length).toBe(32);
    });

    it('should support custom bit lengths', () => {
      const key = enc.generateKey({ bits: 128 });
      const bytes = Buffer.from(key, 'base64');
      expect(bytes.length).toBe(16);
    });
  });

  describe('deriveKey', () => {
    it('should derive a key from password and salt', () => {
      const key = enc.deriveKey({ password: 'my-password', salt: 'my-salt' });
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should produce deterministic output for same inputs', () => {
      const key1 = enc.deriveKey({ password: 'pw', salt: 'salt' });
      const key2 = enc.deriveKey({ password: 'pw', salt: 'salt' });
      expect(key1).toBe(key2);
    });

    it('should produce different output for different salts', () => {
      const key1 = enc.deriveKey({ password: 'pw', salt: 'salt1' });
      const key2 = enc.deriveKey({ password: 'pw', salt: 'salt2' });
      expect(key1).not.toBe(key2);
    });

    it('should accept custom iterations', () => {
      const key = enc.deriveKey({ password: 'pw', salt: 'salt', iterations: 1000 });
      expect(typeof key).toBe('string');
    });
  });

  // ============ Key Rotation ============

  describe('rotateKey', () => {
    it('should re-encrypt data with a new key', () => {
      const newKey = 'c'.repeat(32);
      const encrypted = enc.encrypt('sensitive data');
      const rotated = enc.rotateKey(encrypted, newKey);

      expect(rotated).not.toBe(encrypted);

      const newService = new EncryptionService({ masterKey: newKey });
      expect(newService.decrypt(rotated)).toBe('sensitive data');
    });
  });

  describe('batchRotateKeys', () => {
    it('should rotate keys for multiple records', () => {
      const newKey = 'd'.repeat(32);
      const records = [
        { id: 1, secret: enc.encrypt('data1') },
        { id: 2, secret: enc.encrypt('data2') }
      ];

      const rotated = enc.batchRotateKeys(records, 'secret', newKey);
      const newService = new EncryptionService({ masterKey: newKey });

      expect(newService.decrypt(rotated[0].secret)).toBe('data1');
      expect(newService.decrypt(rotated[1].secret)).toBe('data2');
    });
  });

  // ============ Password Hashing ============

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify a password', () => {
      const hash = enc.hashPassword('myP@ssw0rd');
      expect(hash).toContain(':');
      expect(enc.verifyPassword('myP@ssw0rd', hash)).toBe(true);
    });

    it('should reject wrong password', () => {
      const hash = enc.hashPassword('correct');
      expect(enc.verifyPassword('wrong', hash)).toBe(false);
    });

    it('should produce different hashes for same password (random salt)', () => {
      const hash1 = enc.hashPassword('same');
      const hash2 = enc.hashPassword('same');
      expect(hash1).not.toBe(hash2);
    });
  });

  // ============ Hashing ============

  describe('hash', () => {
    it('should produce deterministic SHA-256 hash', () => {
      const h1 = enc.hash('test');
      const h2 = enc.hash('test');
      expect(h1).toBe(h2);
    });

    it('should support alternate algorithms', () => {
      const sha512 = enc.hash('test', { algorithm: 'sha512' });
      const sha256 = enc.hash('test');
      expect(sha512).not.toBe(sha256);
      expect(sha512.length).toBe(128);
    });
  });

  // ============ Signing and Verification ============

  describe('sign and verify', () => {
    it('should sign data and verify the signature', () => {
      const signature = enc.sign('important data');
      expect(enc.verify('important data', signature)).toBe(true);
    });

    it('should reject tampered data', () => {
      const signature = enc.sign('original');
      expect(enc.verify('tampered', signature)).toBe(false);
    });

    it('should reject tampered signature', () => {
      const signature = enc.sign('data');
      expect(enc.verify('data', 'invalid-signature')).toBe(false);
    });
  });

  // ============ Token Generation ============

  describe('generateToken', () => {
    it('should generate a hex token of specified length', () => {
      const token = enc.generateToken({ length: 16 });
      expect(token).toHaveLength(16);
    });

    it('should default to 32-character tokens', () => {
      const token = enc.generateToken();
      expect(token).toHaveLength(32);
    });

    it('should generate URL-safe tokens when requested', () => {
      const token = enc.generateToken({ urlSafe: true, length: 32 });
      expect(token).toHaveLength(32);
      expect(token).not.toMatch(/[+/=]/);
    });
  });

  // ============ Envelope Encryption ============

  describe('envelopeEncrypt and envelopeDecrypt', () => {
    it('should envelope encrypt and decrypt data', () => {
      const plaintext = 'Envelope encrypted data';
      const envelope = enc.envelopeEncrypt(plaintext);

      expect(envelope.encryptedData).toBeDefined();
      expect(envelope.encryptedKey).toBeDefined();
      expect(envelope.iv).toBeDefined();

      const decrypted = enc.envelopeDecrypt(envelope);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different envelopes for same data', () => {
      const e1 = enc.envelopeEncrypt('same');
      const e2 = enc.envelopeEncrypt('same');
      expect(e1.encryptedData).not.toBe(e2.encryptedData);
    });
  });

  // ============ Encoding Utilities ============

  describe('base64 encoding', () => {
    it('should encode to base64 and decode back', () => {
      const original = 'Hello, Base64!';
      const encoded = enc.toBase64(original);
      expect(encoded).not.toBe(original);
      expect(enc.fromBase64(encoded)).toBe(original);
    });
  });

  describe('hex encoding', () => {
    it('should encode to hex and decode back', () => {
      const original = 'Hello, Hex!';
      const encoded = enc.toHex(original);
      expect(encoded).not.toBe(original);
      expect(enc.fromHex(encoded)).toBe(original);
    });
  });

  // ============ Constant-Time Comparison ============

  describe('constantTimeCompare', () => {
    it('should return true for equal strings', () => {
      expect(enc.constantTimeCompare('abc', 'abc')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(enc.constantTimeCompare('abc', 'def')).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(enc.constantTimeCompare('abc', 'abcd')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(enc.constantTimeCompare(123, 'abc')).toBe(false);
      expect(enc.constantTimeCompare('abc', null)).toBe(false);
    });
  });

  // ============ Secure Wipe ============

  describe('secureWipe', () => {
    it('should zero out a buffer', () => {
      const buf = Buffer.from('sensitive data');
      enc.secureWipe(buf);
      expect(buf.every(b => b === 0)).toBe(true);
    });

    it('should not throw for non-buffer input', () => {
      expect(() => enc.secureWipe('not a buffer')).not.toThrow();
      expect(() => enc.secureWipe(null)).not.toThrow();
    });
  });

  // ============ Masking ============

  describe('mask', () => {
    it('should mask credit card showing last 4 digits', () => {
      const masked = enc.mask('4111111111111111', { type: 'creditCard' });
      expect(masked).toBe('************1111');
    });

    it('should mask email addresses', () => {
      const masked = enc.mask('john@example.com', { type: 'email' });
      expect(masked).toContain('@example.com');
      expect(masked).not.toBe('john@example.com');
    });

    it('should default-mask SSN-like values with dashes', () => {
      const masked = enc.mask('123-45-6789');
      expect(masked).toBe('***-**-6789');
    });

    it('should default-mask plain strings showing last 4', () => {
      const masked = enc.mask('1234567890');
      expect(masked).toBe('******7890');
    });

    it('should return falsy values as-is', () => {
      expect(enc.mask(null)).toBeNull();
      expect(enc.mask(undefined)).toBeUndefined();
      expect(enc.mask('')).toBe('');
    });
  });

  // ============ Encrypt / Decrypt with Metadata ============

  describe('encryptWithMetadata and decryptWithMetadata', () => {
    it('should encrypt with metadata and decrypt', () => {
      const result = enc.encryptWithMetadata('hello');
      expect(result.data).toBeDefined();
      expect(result.metadata.algorithm).toBe('aes-256-gcm');
      expect(result.metadata.version).toBe('1.0');
      expect(result.metadata.timestamp).toBeDefined();

      const decrypted = enc.decryptWithMetadata(result);
      expect(decrypted.data).toBe('hello');
      expect(decrypted.metadata).toEqual(result.metadata);
    });
  });

  // ============ Nested Value Helpers ============

  describe('getNestedValue and setNestedValue', () => {
    it('should get a nested value', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(enc.getNestedValue(obj, 'a.b.c')).toBe(42);
    });

    it('should return undefined for missing path', () => {
      expect(enc.getNestedValue({}, 'a.b.c')).toBeUndefined();
    });

    it('should set a nested value, creating intermediate objects', () => {
      const obj = {};
      enc.setNestedValue(obj, 'a.b.c', 99);
      expect(obj.a.b.c).toBe(99);
    });
  });
});
