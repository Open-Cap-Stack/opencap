'use strict';

/**
 * Clerky Document Parser
 * Issue #663: Template-aware parsers for Clerky legal document types
 *
 * Provides specialized extraction for known Clerky document templates
 * (YC SAFE, stock option grants, certificates of incorporation, board consents)
 * with higher accuracy than generic AI extraction.
 */

const { ainativeChatWithRetry } = require('./ainativeAgentService');
const PendingExtraction = require('../models/PendingExtraction');

// ── Document type keywords for auto-detection ────────────────────────────────

const TYPE_KEYWORDS = {
  yc_safe: [
    'simple agreement for future equity',
    'safe',
    'valuation cap',
    'discount rate',
    'mfn',
    'most favored nation',
    'pro rata',
    'investment amount',
  ],
  option_grant: [
    'stock option agreement',
    'option grant',
    'exercise price',
    'vesting',
    'grantee',
    'shares granted',
    'expiration',
  ],
  certificate_of_incorporation: [
    'certificate of incorporation',
    'articles of incorporation',
    'authorized shares',
    'par value',
    'state of incorporation',
    'incorporator',
  ],
  board_consent: [
    'unanimous written consent',
    'board of directors',
    'resolved',
    'approving directors',
    'board consent',
    'action by written consent',
  ],
};

// ── Confidence levels ────────────────────────────────────────────────────────

const KNOWN_TYPE_CONFIDENCE = 0.85;
const GENERIC_CONFIDENCE = 0.6;

// ── Record type mapping from document type to PendingExtraction recordType ───

const DOC_TYPE_TO_RECORD_TYPE = {
  yc_safe: 'safe',
  option_grant: 'equityGrant',
  certificate_of_incorporation: 'shareClass',
  board_consent: 'boardConsent',
  generic: 'generic',
};

// ── System prompts ───────────────────────────────────────────────────────────

const SAFE_SYSTEM_PROMPT = `You are a legal document extraction assistant specialized in YC SAFE (Simple Agreement for Future Equity) documents.

The YC SAFE standard template typically contains:
- Investor name in the preamble ("by and between [Company] and [Investor]")
- Investment amount (the "Purchase Amount")
- Valuation cap (in the "Valuation Cap" definition)
- Discount rate (in the "Discount Rate" definition, if applicable)
- MFN (Most Favored Nation) clause presence
- Pro rata rights section
- Signature date

Extract the following fields as a JSON object:
{
  "investorName": string,
  "investmentAmount": number,
  "valuationCap": number,
  "discountRate": number (percentage, e.g. 20 for 20%),
  "mfnClause": boolean,
  "proRataRights": boolean,
  "signedDate": string (ISO date format YYYY-MM-DD)
}

Return ONLY valid JSON. No markdown fences, no commentary.`;

const OPTION_GRANT_SYSTEM_PROMPT = `You are a legal document extraction assistant specialized in stock option grant agreements.

Stock option agreements from Clerky typically contain:
- Grantee name and email
- Number of shares granted
- Exercise price per share
- Grant date
- Vesting schedule (cliff period and total vesting period)
- Option expiration period

Extract the following fields as a JSON object:
{
  "granteeName": string,
  "granteeEmail": string,
  "sharesGranted": number,
  "exercisePrice": number,
  "grantDate": string (ISO date format YYYY-MM-DD),
  "vestingCliffMonths": number,
  "vestingTotalMonths": number,
  "expirationYears": number
}

Return ONLY valid JSON. No markdown fences, no commentary.`;

const COI_SYSTEM_PROMPT = `You are a legal document extraction assistant specialized in Certificates of Incorporation.

Certificates of Incorporation from Clerky typically contain:
- Company name
- State of incorporation (usually Delaware)
- Date of incorporation
- Authorized share classes with names, authorized share counts, and par values

Extract the following fields as a JSON object:
{
  "companyName": string,
  "stateOfIncorporation": string,
  "incorporationDate": string (ISO date format YYYY-MM-DD),
  "shareClasses": [
    { "name": string, "authorizedShares": number, "parValue": number }
  ]
}

Return ONLY valid JSON. No markdown fences, no commentary.`;

const BOARD_CONSENT_SYSTEM_PROMPT = `You are a legal document extraction assistant specialized in Board Consent resolutions.

Board consent documents from Clerky typically contain:
- Resolution type (e.g. stock_option_plan, financing, officer_appointment)
- Consent date
- List of approving directors
- Subject matter description

Extract the following fields as a JSON object:
{
  "resolutionType": string (snake_case, e.g. "stock_option_plan", "financing_round"),
  "consentDate": string (ISO date format YYYY-MM-DD),
  "approvingDirectors": [string],
  "subjectMatter": string (brief description of what was resolved)
}

Return ONLY valid JSON. No markdown fences, no commentary.`;

const GENERIC_SYSTEM_PROMPT = `You are a legal document extraction assistant for cap table management.
Extract any structured data you can identify from this document.
Return a JSON object with the extracted fields. Return ONLY valid JSON.`;

// ── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parse a YC SAFE document
 * @param {string} documentText - Full text of the SAFE document
 * @param {string} sourceDocumentName - Source document filename
 * @returns {Promise<Object>} Extracted SAFE fields
 */
async function parseYCSAFE(documentText, sourceDocumentName) {
  const { parsed } = await ainativeChatWithRetry(
    [{ role: 'user', content: `Extract structured data from this YC SAFE document (source: "${sourceDocumentName}"):\n\n${documentText}` }],
    { system: SAFE_SYSTEM_PROMPT, temperature: 0.1 }
  );
  return parsed;
}

/**
 * Parse a stock option grant document
 * @param {string} documentText - Full text of the option grant document
 * @param {string} sourceDocumentName - Source document filename
 * @returns {Promise<Object>} Extracted option grant fields
 */
async function parseOptionGrant(documentText, sourceDocumentName) {
  const { parsed } = await ainativeChatWithRetry(
    [{ role: 'user', content: `Extract structured data from this stock option grant agreement (source: "${sourceDocumentName}"):\n\n${documentText}` }],
    { system: OPTION_GRANT_SYSTEM_PROMPT, temperature: 0.1 }
  );
  return parsed;
}

/**
 * Parse a certificate of incorporation document
 * @param {string} documentText - Full text of the COI document
 * @param {string} sourceDocumentName - Source document filename
 * @returns {Promise<Object>} Extracted COI fields
 */
async function parseCertificateOfIncorporation(documentText, sourceDocumentName) {
  const { parsed } = await ainativeChatWithRetry(
    [{ role: 'user', content: `Extract structured data from this Certificate of Incorporation (source: "${sourceDocumentName}"):\n\n${documentText}` }],
    { system: COI_SYSTEM_PROMPT, temperature: 0.1 }
  );
  return parsed;
}

/**
 * Parse a board consent document
 * @param {string} documentText - Full text of the board consent document
 * @param {string} sourceDocumentName - Source document filename
 * @returns {Promise<Object>} Extracted board consent fields
 */
async function parseBoardConsent(documentText, sourceDocumentName) {
  const { parsed } = await ainativeChatWithRetry(
    [{ role: 'user', content: `Extract structured data from this Board Consent document (source: "${sourceDocumentName}"):\n\n${documentText}` }],
    { system: BOARD_CONSENT_SYSTEM_PROMPT, temperature: 0.1 }
  );
  return parsed;
}

/**
 * Parse a document using a generic extraction prompt
 * @param {string} documentText - Full text of the document
 * @param {string} sourceDocumentName - Source document filename
 * @returns {Promise<Object>} Extracted data
 */
async function parseGeneric(documentText, sourceDocumentName) {
  const { parsed } = await ainativeChatWithRetry(
    [{ role: 'user', content: `Extract any structured cap table data from this document (source: "${sourceDocumentName}"):\n\n${documentText}` }],
    { system: GENERIC_SYSTEM_PROMPT, temperature: 0.2 }
  );
  return parsed;
}

// ── Main routing function ────────────────────────────────────────────────────

/**
 * Parse a document by its detected or specified type
 * @param {string} documentText - Full text of the document
 * @param {string} documentType - 'yc_safe' | 'option_grant' | 'certificate_of_incorporation' | 'board_consent' | 'generic'
 * @param {string} sourceDocumentName - Source document filename
 * @returns {Promise<Object>} { recordType, extractedData, confidence, sourceDocument }
 */
async function parseDocumentByType(documentText, documentType, sourceDocumentName) {
  let extractedData;
  const isKnownType = documentType !== 'generic';

  switch (documentType) {
    case 'yc_safe':
      extractedData = await parseYCSAFE(documentText, sourceDocumentName);
      break;
    case 'option_grant':
      extractedData = await parseOptionGrant(documentText, sourceDocumentName);
      break;
    case 'certificate_of_incorporation':
      extractedData = await parseCertificateOfIncorporation(documentText, sourceDocumentName);
      break;
    case 'board_consent':
      extractedData = await parseBoardConsent(documentText, sourceDocumentName);
      break;
    default:
      extractedData = await parseGeneric(documentText, sourceDocumentName);
      break;
  }

  const recordType = DOC_TYPE_TO_RECORD_TYPE[documentType] || 'generic';
  const confidence = isKnownType ? KNOWN_TYPE_CONFIDENCE : GENERIC_CONFIDENCE;

  return {
    recordType,
    extractedData,
    confidence,
    sourceDocument: sourceDocumentName,
  };
}

// ── Document type detection ──────────────────────────────────────────────────

/**
 * Auto-detect document type using keyword matching
 * @param {string} documentText - Full text of the document
 * @returns {string} One of: 'yc_safe' | 'option_grant' | 'certificate_of_incorporation' | 'board_consent' | 'generic'
 */
function detectDocumentType(documentText) {
  const lowerText = documentText.toLowerCase();

  let bestType = 'generic';
  let bestScore = 0;

  for (const [docType, keywords] of Object.entries(TYPE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = docType;
    }
  }

  // Require at least 2 keyword matches to classify as a known type
  if (bestScore < 2) {
    return 'generic';
  }

  return bestType;
}

// ── Queue for review ─────────────────────────────────────────────────────────

/**
 * Detect document type, parse, and queue extracted records for human review
 * @param {string} documentText - Full text of the document
 * @param {string} documentName - Source document filename
 * @param {string} companyId - Company ID
 * @param {string} dataRoomId - Data room ID
 * @returns {Promise<Array>} Array of created PendingExtraction records
 */
async function parseAndQueueForReview(documentText, documentName, companyId, dataRoomId) {
  const documentType = detectDocumentType(documentText);
  const result = await parseDocumentByType(documentText, documentType, documentName);

  const pendingRecord = await PendingExtraction.create({
    dataRoomId,
    companyId,
    recordType: result.recordType,
    extractedData: result.extractedData,
    sourceDocument: result.sourceDocument,
    confidence: result.confidence,
    status: 'pending',
    metadata: {
      source: 'clerky',
      documentType,
    },
    createdAt: new Date().toISOString(),
  });

  return [pendingRecord];
}

module.exports = {
  parseYCSAFE,
  parseOptionGrant,
  parseCertificateOfIncorporation,
  parseBoardConsent,
  parseDocumentByType,
  detectDocumentType,
  parseAndQueueForReview,
};
