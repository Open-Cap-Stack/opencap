'use strict';

/**
 * Token Encryption Utility
 * Issue #680: AES-256-GCM encryption for OAuth tokens
 *
 * Encrypts/decrypts sensitive tokens (OAuth access/refresh tokens)
 * before storing them in the database.
 *
 * Format: iv:authTag:ciphertext (all base64-encoded)
 * - iv: 12-byte random initialization vector (unique per encryption)
 * - authTag: 16-byte GCM authentication tag (integrity check)
 * - ciphertext: AES-256-GCM encrypted data
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;       // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;  // 128-bit auth tag

/**
 * Derive the 32-byte key from the hex-encoded ENCRYPTION_KEY env var.
 * Throws if the key is missing or invalid.
 */
function _getKey() {
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey) {
        throw new Error(
            'ENCRYPTION_KEY environment variable is required for token encryption'
        );
    }
    return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param {string} plaintext - The token to encrypt
 * @returns {string} Encrypted string in format: iv:authTag:ciphertext (base64)
 * @throws {Error} If plaintext is empty/invalid or ENCRYPTION_KEY is missing
 */
function encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('plaintext must be a non-empty string');
    }

    const key = _getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    return [
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
    ].join(':');
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 *
 * @param {string} ciphertext - Encrypted string in iv:authTag:ciphertext format
 * @returns {string} Decrypted plaintext
 * @throws {Error} If ciphertext is malformed, tampered, or ENCRYPTION_KEY is wrong
 */
function decrypt(ciphertext) {
    if (!ciphertext || typeof ciphertext !== 'string') {
        throw new Error('ciphertext must be a non-empty string');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error(
            'Invalid ciphertext format: expected iv:authTag:ciphertext'
        );
    }

    const key = _getKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedData = Buffer.from(parts[2], 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
