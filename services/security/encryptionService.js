/**
 * EncryptionService
 *
 * Data encryption service for field-level encryption,
 * key management, and encryption utilities
 */

const crypto = require('crypto');

class EncryptionService {
  constructor(config = {}) {
    if (!config.masterKey) {
      throw new Error('Master key is required');
    }
    if (config.masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }

    this.config = {
      masterKey: config.masterKey,
      algorithm: config.algorithm || 'aes-256-gcm',
      ivLength: config.ivLength || 12,
      tagLength: config.tagLength || 16,
      saltLength: config.saltLength || 16,
      keyDerivationIterations: config.keyDerivationIterations || 100000,
      ...config
    };

    // Derive the actual encryption key from master key
    this.encryptionKey = this.deriveKeyFromMaster(this.config.masterKey);
  }

  /**
   * Derive encryption key from master key
   */
  deriveKeyFromMaster(masterKey) {
    return crypto.createHash('sha256').update(masterKey).digest();
  }

  /**
   * Generate a random IV
   */
  generateIV() {
    return crypto.randomBytes(this.config.ivLength);
  }

  /**
   * Encrypt a string
   */
  encrypt(plaintext) {
    const iv = this.generateIV();
    const cipher = crypto.createCipheriv(this.config.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);

    return combined.toString('base64');
  }

  /**
   * Decrypt a string
   */
  decrypt(ciphertext) {
    try {
      const combined = Buffer.from(ciphertext, 'base64');

      // Extract IV, authTag, and encrypted data
      const iv = combined.slice(0, this.config.ivLength);
      const authTag = combined.slice(this.config.ivLength, this.config.ivLength + this.config.tagLength);
      const encrypted = combined.slice(this.config.ivLength + this.config.tagLength);

      const decipher = crypto.createDecipheriv(this.config.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * Get value at nested path in object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set value at nested path in object
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Encrypt specified fields in an object
   */
  encryptFields(data, fields) {
    const result = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const field of fields) {
      // Handle array notation like "users[].ssn"
      if (field.includes('[]')) {
        const [arrayPath, ...rest] = field.split('[].');
        const nestedField = rest.join('[].');
        const array = this.getNestedValue(result, arrayPath);

        if (Array.isArray(array)) {
          array.forEach(item => {
            const value = this.getNestedValue(item, nestedField);
            if (value !== null && value !== undefined) {
              this.setNestedValue(item, nestedField, this.encrypt(String(value)));
            }
          });
        }
      } else {
        const value = this.getNestedValue(result, field);
        if (value !== null && value !== undefined) {
          this.setNestedValue(result, field, this.encrypt(String(value)));
        }
      }
    }

    return result;
  }

  /**
   * Decrypt specified fields in an object
   */
  decryptFields(data, fields) {
    const result = JSON.parse(JSON.stringify(data)); // Deep clone

    for (const field of fields) {
      if (field.includes('[]')) {
        const [arrayPath, ...rest] = field.split('[].');
        const nestedField = rest.join('[].');
        const array = this.getNestedValue(result, arrayPath);

        if (Array.isArray(array)) {
          array.forEach(item => {
            const value = this.getNestedValue(item, nestedField);
            if (value !== null && value !== undefined) {
              this.setNestedValue(item, nestedField, this.decrypt(value));
            }
          });
        }
      } else {
        const value = this.getNestedValue(result, field);
        if (value !== null && value !== undefined) {
          this.setNestedValue(result, field, this.decrypt(value));
        }
      }
    }

    return result;
  }

  /**
   * Generate a new encryption key
   */
  generateKey(options = {}) {
    const bits = options.bits || 256;
    const bytes = bits / 8;
    return crypto.randomBytes(bytes).toString('base64');
  }

  /**
   * Derive key from password using PBKDF2
   */
  deriveKey({ password, salt, iterations }) {
    const iterCount = iterations || this.config.keyDerivationIterations;
    return crypto.pbkdf2Sync(password, salt, iterCount, 32, 'sha256').toString('base64');
  }

  /**
   * Rotate encryption key
   */
  rotateKey(encryptedData, newKey) {
    // Decrypt with current key
    const plaintext = this.decrypt(encryptedData);

    // Create new service with new key
    const newService = new EncryptionService({ masterKey: newKey });

    // Encrypt with new key
    return newService.encrypt(plaintext);
  }

  /**
   * Batch rotate keys for multiple records
   */
  batchRotateKeys(records, field, newKey) {
    return records.map(record => {
      const newRecord = { ...record };
      newRecord[field] = this.rotateKey(record[field], newKey);
      return newRecord;
    });
  }

  /**
   * Hash a password (using argon2-like approach with PBKDF2)
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, this.config.keyDerivationIterations, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password hash
   */
  verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, this.config.keyDerivationIterations, 64, 'sha512').toString('hex');
    return this.constantTimeCompare(hash, verifyHash);
  }

  /**
   * Create deterministic hash for data integrity
   */
  hash(data, options = {}) {
    const algorithm = options.algorithm || 'sha256';
    return crypto.createHash(algorithm).update(data).digest('hex');
  }

  /**
   * Sign data using HMAC
   */
  sign(data) {
    return crypto.createHmac('sha256', this.encryptionKey).update(data).digest('hex');
  }

  /**
   * Verify signature
   */
  verify(data, signature) {
    const expectedSignature = this.sign(data);
    return this.constantTimeCompare(signature, expectedSignature);
  }

  /**
   * Generate secure random token
   */
  generateToken(options = {}) {
    const length = options.length || 32;
    const bytes = crypto.randomBytes(Math.ceil(length * 0.75));

    if (options.urlSafe) {
      return bytes.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .slice(0, length);
    }

    return bytes.toString('hex').slice(0, length);
  }

  /**
   * Envelope encryption - encrypt data with a data key, then encrypt the data key
   */
  envelopeEncrypt(plaintext) {
    // Generate a random data key
    const dataKey = crypto.randomBytes(32);
    const iv = this.generateIV();

    // Encrypt data with data key
    const dataCipher = crypto.createCipheriv('aes-256-gcm', dataKey, iv);
    let encryptedData = dataCipher.update(plaintext, 'utf8', 'base64');
    encryptedData += dataCipher.final('base64');
    const dataAuthTag = dataCipher.getAuthTag();

    // Encrypt data key with master key
    const keyIv = this.generateIV();
    const keyCipher = crypto.createCipheriv(this.config.algorithm, this.encryptionKey, keyIv);
    let encryptedKey = keyCipher.update(dataKey);
    encryptedKey = Buffer.concat([encryptedKey, keyCipher.final()]);
    const keyAuthTag = keyCipher.getAuthTag();

    return {
      encryptedData: Buffer.concat([dataAuthTag, Buffer.from(encryptedData, 'base64')]).toString('base64'),
      encryptedKey: Buffer.concat([keyIv, keyAuthTag, encryptedKey]).toString('base64'),
      iv: iv.toString('base64')
    };
  }

  /**
   * Envelope decryption
   */
  envelopeDecrypt(envelope) {
    // Decrypt data key
    const encryptedKeyData = Buffer.from(envelope.encryptedKey, 'base64');
    const keyIv = encryptedKeyData.slice(0, this.config.ivLength);
    const keyAuthTag = encryptedKeyData.slice(this.config.ivLength, this.config.ivLength + this.config.tagLength);
    const encryptedKey = encryptedKeyData.slice(this.config.ivLength + this.config.tagLength);

    const keyDecipher = crypto.createDecipheriv(this.config.algorithm, this.encryptionKey, keyIv);
    keyDecipher.setAuthTag(keyAuthTag);
    const dataKey = Buffer.concat([keyDecipher.update(encryptedKey), keyDecipher.final()]);

    // Decrypt data
    const iv = Buffer.from(envelope.iv, 'base64');
    const encryptedDataBuffer = Buffer.from(envelope.encryptedData, 'base64');
    const dataAuthTag = encryptedDataBuffer.slice(0, 16);
    const encryptedData = encryptedDataBuffer.slice(16);

    const dataDecipher = crypto.createDecipheriv('aes-256-gcm', dataKey, iv);
    dataDecipher.setAuthTag(dataAuthTag);
    let decrypted = dataDecipher.update(encryptedData, undefined, 'utf8');
    decrypted += dataDecipher.final('utf8');

    return decrypted;
  }

  /**
   * Encode to base64
   */
  toBase64(data) {
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decode from base64
   */
  fromBase64(data) {
    return Buffer.from(data, 'base64').toString('utf8');
  }

  /**
   * Encode to hex
   */
  toHex(data) {
    return Buffer.from(data).toString('hex');
  }

  /**
   * Decode from hex
   */
  fromHex(data) {
    return Buffer.from(data, 'hex').toString('utf8');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Securely wipe sensitive data from memory
   */
  secureWipe(buffer) {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }

  /**
   * Mask sensitive data for logging
   */
  mask(value, options = {}) {
    const type = options.type || 'default';

    if (!value) return value;

    switch (type) {
      case 'creditCard':
        return '*'.repeat(value.length - 4) + value.slice(-4);

      case 'email': {
        const [local, domain] = value.split('@');
        if (!domain) return value;
        const maskedLocal = local[0] + '*'.repeat(Math.max(local.length - 2, 1)) + local[local.length - 1];
        return `${maskedLocal}@${domain}`;
      }

      default:
        // SSN-like masking: show last 4
        if (value.includes('-')) {
          const parts = value.split('-');
          const maskedParts = parts.map((part, i) =>
            i === parts.length - 1 ? part : '*'.repeat(part.length)
          );
          return maskedParts.join('-');
        }
        return '*'.repeat(value.length - 4) + value.slice(-4);
    }
  }

  /**
   * Encrypt with metadata
   */
  encryptWithMetadata(plaintext) {
    const encrypted = this.encrypt(plaintext);
    return {
      data: encrypted,
      metadata: {
        algorithm: this.config.algorithm,
        timestamp: Date.now(),
        version: '1.0'
      }
    };
  }

  /**
   * Decrypt with metadata
   */
  decryptWithMetadata(envelope) {
    return {
      data: this.decrypt(envelope.data),
      metadata: envelope.metadata
    };
  }
}

module.exports = EncryptionService;
