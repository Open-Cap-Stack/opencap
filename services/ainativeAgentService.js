/**
 * AINative Agent Service
 * Issue #625: Shared AINative chat completion service for AI agent pipeline
 *
 * Wraps the AINative OpenAI-compatible chat/completions endpoint with:
 * - Model fallback chain on overload (5xx / 429 / 402)
 * - 120-second timeout
 * - JSON response parsing with fence stripping
 */

const axios = require('axios');

const AINATIVE_BASE = 'https://api.ainative.studio/v1';
const DEFAULT_MODEL = 'llama-3.1-8b';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 120000;

// Fallback chain: primary → alternates tried in order on 429/402/503/529
const FALLBACK_CHAIN = [
  'llama-3.1-8b',
  'deepseek-v3',
  'mistral-large'
];

/**
 * Send a chat completion request to AINative's OpenAI-compatible endpoint.
 * Retries down the fallback chain on rate-limit / overload errors.
 *
 * @param {Array<{role:string, content:string}>} messages
 * @param {Object} [options]
 * @param {string} [options.model]        - Override primary model
 * @param {number} [options.temperature]  - Sampling temperature
 * @param {number} [options.max_tokens]   - Maximum output tokens
 * @param {string} [options.system]       - Optional system prompt injected as first message
 * @returns {Promise<string>} The assistant's text content
 */
async function ainativeChat(messages, options = {}) {
  const primaryModel = options.model || DEFAULT_MODEL;

  // Build the fallback list: primary first, then the rest of the chain (deduplicated)
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_CHAIN.filter(m => m !== primaryModel)
  ];

  const temperature = options.temperature !== undefined ? options.temperature : DEFAULT_TEMPERATURE;
  const max_tokens  = options.max_tokens  !== undefined ? options.max_tokens  : DEFAULT_MAX_TOKENS;

  // If a system prompt was supplied, inject it as a leading system message
  const finalMessages = options.system
    ? [{ role: 'system', content: options.system }, ...messages]
    : messages;

  const apiToken = process.env.AINATIVE_API_TOKEN;
  if (!apiToken) {
    throw new Error('AINATIVE_API_TOKEN environment variable is not set');
  }

  let lastErr;

  for (const model of modelsToTry) {
    try {
      if (model !== primaryModel) {
        console.log(`[AINative] Falling back to ${model} (${primaryModel} unavailable)`);
      }

      const response = await axios.post(
        `${AINATIVE_BASE}/chat/completions`,
        {
          model,
          messages:    finalMessages,
          temperature,
          max_tokens
        },
        {
          headers: {
            Authorization:  `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          },
          timeout: REQUEST_TIMEOUT_MS
        }
      );

      const content = response?.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AINative chat/completions');
      }
      return content;

    } catch (err) {
      const status = err.response?.status;
      // Retriable: rate-limited, overloaded, payment required, service unavailable
      if (status === 429 || status === 402 || status === 503 || status === 529) {
        lastErr = err;
        continue;
      }
      // Non-retriable — surface immediately
      throw err;
    }
  }

  throw lastErr;
}

/**
 * Parse JSON from an LLM response that may be wrapped in markdown code fences
 * or prefixed/suffixed with prose.
 *
 * Handles:
 *   - ```json ... ``` fences
 *   - ``` ... ``` fences
 *   - <thinking>...</thinking> chain-of-thought blocks
 *   - Raw JSON
 *   - JSON embedded inside prose (extracts outermost object or array)
 *
 * @param {string} content - Raw string from ainativeChat()
 * @returns {*} Parsed JavaScript value
 * @throws {Error} If no valid JSON can be extracted
 */
function parseJsonFromResponse(content) {
  if (typeof content !== 'string') {
    throw new Error('parseJsonFromResponse: input must be a string');
  }

  let clean = content
    .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Direct parse
  try {
    return JSON.parse(clean);
  } catch { /* fall through */ }

  // Extract outermost object { ... }
  const objStart  = clean.indexOf('{');
  const objEnd    = clean.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      return JSON.parse(clean.slice(objStart, objEnd + 1));
    } catch { /* fall through */ }
  }

  // Extract outermost array [ ... ]
  const arrStart = clean.indexOf('[');
  const arrEnd   = clean.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try {
      return JSON.parse(clean.slice(arrStart, arrEnd + 1));
    } catch { /* fall through */ }
  }

  const err = new Error(
    `parseJsonFromResponse: could not extract valid JSON from response: ${clean.slice(0, 300)}`
  );
  err.rawContent = content;
  throw err;
}

/**
 * ainativeChatWithRetry — wraps ainativeChat with tracewright-style retry loop.
 * On JSON parse failure, injects the bad response + error back into context.
 * Up to maxRetries attempts.
 *
 * @param {Array<{role:string, content:string}>} messages
 * @param {Object} [options] - same options as ainativeChat
 * @param {number} [maxRetries=3] - maximum number of attempts
 * @returns {Promise<{ content: string, parsed: * }>}
 */
async function ainativeChatWithRetry(messages, options = {}, maxRetries = 3) {
  let lastError;
  let contextMessages = [...messages];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const content = await ainativeChat(contextMessages, options);
      const parsed = parseJsonFromResponse(content);
      return { content, parsed };
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        // Inject error context for next attempt (tracewright pattern)
        contextMessages = [
          ...contextMessages,
          { role: 'assistant', content: err.rawContent || '' },
          {
            role: 'user',
            content: `Your previous response could not be parsed as JSON. Error: ${err.message}. Please respond with valid JSON only, no markdown fences.`
          }
        ];
      }
    }
  }
  throw lastError;
}

module.exports = { ainativeChat, parseJsonFromResponse, ainativeChatWithRetry };
