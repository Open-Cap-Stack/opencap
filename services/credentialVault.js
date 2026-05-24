/**
 * Credential Vault — ephemeral in-memory store for browser automation credentials.
 * Issue #639
 *
 * Credentials arrive in the HTTP request body and must bridge to the async pipeline
 * without ever touching ZeroDB or log files.
 *
 * Security rules:
 * - Never log credential values — only jobIds
 * - consume() deletes the entry immediately after returning
 * - 5-minute TTL auto-deletes entries if pipeline never calls consume()
 */

const vault = new Map(); // Map<jobId, { creds, timer }>

/**
 * Store credentials for a job with an automatic TTL.
 *
 * @param {string} jobId
 * @param {Object} credentials
 * @param {number} [ttlMs=300000] - TTL in milliseconds (default 5 minutes)
 */
function store(jobId, credentials, ttlMs = 300_000) {
  // Clear any existing entry for this jobId
  clear(jobId);

  const timer = setTimeout(() => {
    vault.delete(jobId);
  }, ttlMs);

  // Allow the timer to be garbage collected without blocking process exit
  if (timer.unref) timer.unref();

  vault.set(jobId, { creds: credentials, timer });
}

/**
 * Consume credentials for a job — returns credentials and immediately deletes the entry.
 * Returns null if the entry does not exist or has already been consumed.
 *
 * @param {string} jobId
 * @returns {Object|null}
 */
function consume(jobId) {
  const entry = vault.get(jobId);
  if (!entry) return null;

  clearTimeout(entry.timer);
  vault.delete(jobId);

  return entry.creds;
}

/**
 * Explicitly remove an entry from the vault (e.g. cleanup after browser session ends).
 *
 * @param {string} jobId
 */
function clear(jobId) {
  const entry = vault.get(jobId);
  if (entry) {
    clearTimeout(entry.timer);
    vault.delete(jobId);
  }
}

module.exports = { store, consume, clear };
