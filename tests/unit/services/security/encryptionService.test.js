/**
 * EncryptionService Tests
 *
 * Test suite for data encryption service
 * Tests field-level encryption, key management, encryption utilities
 */

const EncryptionService = require('../../../../services/security/encryptionService');

describe('EncryptionService', () => {
  let encryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService({
      masterKey: 'test-master-key-32-characters!!X'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with configuration', () => {
      expect(encryptionService).toBeDefined();
      expect(encryptionService.config).toBeDefined();
    });

    it('should require a master key', () => {
      expect(() => new EncryptionService()).toThrow('Master key is required');
    });

    it('should validate master key length', () => {
      expect(() => new EncryptionService({ masterKey: 'short' })).toThrow('Master key must be at least 32 characters');
    });

    it('should accept custom algorithm configuration', () => {
      const customService = new EncryptionService({
        masterKey: 'test-master-key-32-characters!!X',
        algorithm: 'aes-128-cbc'
      });
      expect(customService.config.algorithm).toBe('aes-128-cbc');
    });

    it('should default to aes-256-gcm algorithm', () => {
      expect(encryptionService.config.algorithm).toBe('aes-256-gcm');
    });
  });

  describe('symmetric encryption', () => {
    it('should encrypt a string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt an encrypted string', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Hello, World!';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?/`~';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello, World! Emoji: test';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle large data', () => {
      const plaintext = 'A'.repeat(100000);
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid ciphertext', () => {
      expect(() => encryptionService.decrypt('invalid-ciphertext')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const encrypted = encryptionService.encrypt('Hello, World!');
      const tampered = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => encryptionService.decrypt(tampered)).toThrow();
    });
  });

  describe('field-level encryption', () => {
    it('should encrypt specified fields in an object', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john@example.com'
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn']);

      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.email).toBe('john@example.com');
      expect(encrypted.ssn).not.toBe('123-45-6789');
    });

    it('should decrypt specified fields in an object', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789'
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn']);
      const decrypted = encryptionService.decryptFields(encrypted, ['ssn']);

      expect(decrypted.ssn).toBe('123-45-6789');
    });

    it('should handle nested objects', () => {
      const data = {
        name: 'John Doe',
        personal: {
          ssn: '123-45-6789',
          dob: '1990-01-01'
        }
      };

      const encrypted = encryptionService.encryptFields(data, ['personal.ssn']);

      expect(encrypted.personal.ssn).not.toBe('123-45-6789');
      expect(encrypted.personal.dob).toBe('1990-01-01');
    });

    it('should handle arrays of objects', () => {
      const data = {
        users: [
          { name: 'John', ssn: '111-11-1111' },
          { name: 'Jane', ssn: '222-22-2222' }
        ]
      };

      const encrypted = encryptionService.encryptFields(data, ['users[].ssn']);

      expect(encrypted.users[0].ssn).not.toBe('111-11-1111');
      expect(encrypted.users[1].ssn).not.toBe('222-22-2222');
      expect(encrypted.users[0].name).toBe('John');
    });

    it('should skip null and undefined fields', () => {
      const data = {
        name: 'John Doe',
        ssn: null,
        taxId: undefined
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn', 'taxId']);

      expect(encrypted.ssn).toBeNull();
      expect(encrypted.taxId).toBeUndefined();
    });

    it('should handle multiple encryption fields', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        creditCard: '4111111111111111',
        bankAccount: '123456789'
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn', 'creditCard', 'bankAccount']);

      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.ssn).not.toBe('123-45-6789');
      expect(encrypted.creditCard).not.toBe('4111111111111111');
      expect(encrypted.bankAccount).not.toBe('123456789');
    });
  });

  describe('key management', () => {
    it('should generate a new encryption key', () => {
      const key = encryptionService.generateKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate unique keys', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();

      expect(key1).not.toBe(key2);
    });

    it('should generate key with specified length', () => {
      const key = encryptionService.generateKey({ bits: 128 });
      // Base64 encoded 128 bits = 16 bytes = ~24 chars with padding
      expect(key.length).toBeGreaterThanOrEqual(16);
    });

    it('should derive key from password', () => {
      const derivedKey = encryptionService.deriveKey({
        password: 'user-password',
        salt: 'random-salt-value'
      });

      expect(derivedKey).toBeDefined();
      expect(typeof derivedKey).toBe('string');
    });

    it('should produce consistent derived keys', () => {
      const key1 = encryptionService.deriveKey({
        password: 'user-password',
        salt: 'random-salt-value'
      });

      const key2 = encryptionService.deriveKey({
        password: 'user-password',
        salt: 'random-salt-value'
      });

      expect(key1).toBe(key2);
    });

    it('should produce different keys with different salts', () => {
      const key1 = encryptionService.deriveKey({
        password: 'user-password',
        salt: 'salt1'
      });

      const key2 = encryptionService.deriveKey({
        password: 'user-password',
        salt: 'salt2'
      });

      expect(key1).not.toBe(key2);
    });

    it('should rotate encryption key', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);

      const newKey = 'new-master-key-32-characters!!--';
      const reEncrypted = encryptionService.rotateKey(encrypted, newKey);

      // Create new service with new key to decrypt
      const newService = new EncryptionService({ masterKey: newKey });
      const decrypted = newService.decrypt(reEncrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should batch rotate keys for multiple records', () => {
      const records = [
        { id: 1, data: encryptionService.encrypt('data1') },
        { id: 2, data: encryptionService.encrypt('data2') },
        { id: 3, data: encryptionService.encrypt('data3') }
      ];

      const newKey = 'new-master-key-32-characters!!--';
      const rotated = encryptionService.batchRotateKeys(records, 'data', newKey);

      const newService = new EncryptionService({ masterKey: newKey });
      expect(newService.decrypt(rotated[0].data)).toBe('data1');
      expect(newService.decrypt(rotated[1].data)).toBe('data2');
      expect(newService.decrypt(rotated[2].data)).toBe('data3');
    });
  });

  describe('hashing', () => {
    it('should hash a password', () => {
      const password = 'user-password';
      const hash = encryptionService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
    });

    it('should verify a password hash', () => {
      const password = 'user-password';
      const hash = encryptionService.hashPassword(password);

      const isValid = encryptionService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject invalid password', () => {
      const password = 'user-password';
      const hash = encryptionService.hashPassword(password);

      const isValid = encryptionService.verifyPassword('wrong-password', hash);
      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password', () => {
      const password = 'user-password';
      const hash1 = encryptionService.hashPassword(password);
      const hash2 = encryptionService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should create deterministic hash for data integrity', () => {
      const data = 'important data';
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should support different hash algorithms', () => {
      const data = 'test data';
      const sha256 = encryptionService.hash(data, { algorithm: 'sha256' });
      const sha512 = encryptionService.hash(data, { algorithm: 'sha512' });

      expect(sha256).not.toBe(sha512);
      expect(sha512.length).toBeGreaterThan(sha256.length);
    });
  });

  describe('digital signatures', () => {
    it('should sign data', () => {
      const data = 'important document content';
      const signature = encryptionService.sign(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    it('should verify valid signature', () => {
      const data = 'important document content';
      const signature = encryptionService.sign(data);

      const isValid = encryptionService.verify(data, signature);
      expect(isValid).toBe(true);
    });

    it('should reject tampered data', () => {
      const data = 'important document content';
      const signature = encryptionService.sign(data);

      const isValid = encryptionService.verify('modified content', signature);
      expect(isValid).toBe(false);
    });

    it('should reject invalid signature', () => {
      const data = 'important document content';

      const isValid = encryptionService.verify(data, 'invalid-signature');
      expect(isValid).toBe(false);
    });
  });

  describe('token generation', () => {
    it('should generate secure random tokens', () => {
      const token = encryptionService.generateToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(encryptionService.generateToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate token with specified length', () => {
      const token = encryptionService.generateToken({ length: 64 });
      expect(token.length).toBe(64);
    });

    it('should generate URL-safe tokens', () => {
      const token = encryptionService.generateToken({ urlSafe: true });
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('envelope encryption', () => {
    it('should encrypt data with envelope encryption', () => {
      const plaintext = 'Sensitive data';
      const envelope = encryptionService.envelopeEncrypt(plaintext);

      expect(envelope).toHaveProperty('encryptedData');
      expect(envelope).toHaveProperty('encryptedKey');
      expect(envelope).toHaveProperty('iv');
    });

    it('should decrypt envelope encrypted data', () => {
      const plaintext = 'Sensitive data';
      const envelope = encryptionService.envelopeEncrypt(plaintext);
      const decrypted = encryptionService.envelopeDecrypt(envelope);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encryption utilities', () => {
    it('should encode data to base64', () => {
      const data = 'Hello, World!';
      const encoded = encryptionService.toBase64(data);

      expect(encoded).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should decode data from base64', () => {
      const encoded = 'SGVsbG8sIFdvcmxkIQ==';
      const decoded = encryptionService.fromBase64(encoded);

      expect(decoded).toBe('Hello, World!');
    });

    it('should encode data to hex', () => {
      const data = 'Hello';
      const encoded = encryptionService.toHex(data);

      expect(encoded).toBe('48656c6c6f');
    });

    it('should decode data from hex', () => {
      const encoded = '48656c6c6f';
      const decoded = encryptionService.fromHex(encoded);

      expect(decoded).toBe('Hello');
    });

    it('should generate a secure IV', () => {
      const iv = encryptionService.generateIV();

      expect(iv).toBeDefined();
      expect(iv.length).toBe(12); // 96 bits for GCM
    });

    it('should generate unique IVs', () => {
      const ivs = new Set();
      for (let i = 0; i < 100; i++) {
        ivs.add(encryptionService.generateIV().toString('hex'));
      }
      expect(ivs.size).toBe(100);
    });
  });

  describe('constant-time comparison', () => {
    it('should compare strings in constant time', () => {
      const a = 'secret-value';
      const b = 'secret-value';

      const isEqual = encryptionService.constantTimeCompare(a, b);
      expect(isEqual).toBe(true);
    });

    it('should detect different strings', () => {
      const a = 'secret-value';
      const b = 'different-value';

      const isEqual = encryptionService.constantTimeCompare(a, b);
      expect(isEqual).toBe(false);
    });

    it('should handle different length strings', () => {
      const a = 'short';
      const b = 'longer-string';

      const isEqual = encryptionService.constantTimeCompare(a, b);
      expect(isEqual).toBe(false);
    });
  });

  describe('secure data handling', () => {
    it('should securely wipe sensitive data from memory', () => {
      const sensitiveData = Buffer.from('sensitive-data');
      encryptionService.secureWipe(sensitiveData);

      // All bytes should be zeroed
      expect(sensitiveData.every(byte => byte === 0)).toBe(true);
    });

    it('should mask sensitive data for logging', () => {
      const ssn = '123-45-6789';
      const masked = encryptionService.mask(ssn);

      expect(masked).toBe('***-**-6789');
    });

    it('should mask credit card numbers', () => {
      const cc = '4111111111111111';
      const masked = encryptionService.mask(cc, { type: 'creditCard' });

      expect(masked).toBe('************1111');
    });

    it('should mask email addresses', () => {
      const email = 'john.doe@example.com';
      const masked = encryptionService.mask(email, { type: 'email' });

      expect(masked).toBe('j******e@example.com');
    });
  });

  describe('encryption metadata', () => {
    it('should include metadata with encrypted data', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryptionService.encryptWithMetadata(plaintext);

      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('metadata');
      expect(encrypted.metadata).toHaveProperty('algorithm');
      expect(encrypted.metadata).toHaveProperty('timestamp');
      expect(encrypted.metadata).toHaveProperty('version');
    });

    it('should decrypt data with metadata', () => {
      const plaintext = 'Hello, World!';
      const encrypted = encryptionService.encryptWithMetadata(plaintext);
      const decrypted = encryptionService.decryptWithMetadata(encrypted);

      expect(decrypted.data).toBe(plaintext);
      expect(decrypted.metadata).toEqual(encrypted.metadata);
    });
  });

  describe('error handling', () => {
    it('should handle encryption of non-string types', () => {
      const data = { key: 'value' };
      const encrypted = encryptionService.encrypt(JSON.stringify(data));
      const decrypted = JSON.parse(encryptionService.decrypt(encrypted));

      expect(decrypted).toEqual(data);
    });

    it('should throw meaningful error for decryption with wrong key', () => {
      const encrypted = encryptionService.encrypt('Hello, World!');

      const wrongKeyService = new EncryptionService({
        masterKey: 'different-key-32-characters!!!!!'
      });

      expect(() => wrongKeyService.decrypt(encrypted)).toThrow();
    });
  });
});
