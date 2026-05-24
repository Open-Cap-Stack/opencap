/**
 * Carta Source Connector
 * Issue #628: OAuth connector stub for Carta — returns mock documents in MVP
 *
 * In production this would exchange an OAuth code for tokens and
 * pull real cap table / 409A data via Carta's API. In MVP it returns curated mock data.
 */

const { v4: uuidv4 } = require('uuid');

const MOCK_DOCUMENTS = [
  {
    originalName: 'Cap Table - Carta Export.json',
    mimeType: 'application/json',
    textContent: 'Shareholders: Founders 50% (2,500,000 shares common), Sequoia Capital 30% (1,500,000 Series A preferred), Kleiner Perkins 15% (750,000 Series A preferred), Angel investors 5% (250,000 common). Last 409A valuation: $25,000,000 post-money Series A, dated 6 months ago.',
    metadata: {
      fileSize: 87400,
      pageCount: null,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-03-01',
      driveUrl: null
    }
  },
  {
    originalName: 'Stock Option Grants - Active.csv',
    mimeType: 'text/csv',
    textContent: 'Active option grants: 847,000 options granted, 423,000 vested, 424,000 unvested. Exercise price: $2.50 (last 409A FMV). 4-year vesting, 1-year cliff.',
    metadata: {
      fileSize: 24100,
      pageCount: null,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-03-01',
      driveUrl: null
    }
  },
  {
    originalName: 'Valuations History.json',
    mimeType: 'application/json',
    textContent: 'Valuation history: Seed $3M (2022), Series A $25M (2024). Current 409A FMV per share: $2.50. Preferred liquidation preference: 1x non-participating.',
    metadata: {
      fileSize: 18900,
      pageCount: null,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-03-01',
      driveUrl: null
    }
  }
];

/**
 * Stub connect — exchanges OAuth code for tokens.
 *
 * @param {string} oauthCode
 * @returns {{ connected: boolean, source: string }}
 */
function connect(oauthCode) {
  return { connected: true, source: 'carta' };
}

/**
 * Fetch Carta documents for the given company.
 * MVP: always returns mock data regardless of token.
 *
 * @param {string|null} token
 * @param {string} companyName
 * @param {string} founderEmail
 * @returns {Promise<ConnectorResult>}
 */
async function fetchDocuments(token, companyName, founderEmail) {
  const documents = MOCK_DOCUMENTS.map(doc => ({
    id: uuidv4(),
    source: 'carta',
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    textContent: doc.textContent,
    metadata: { ...doc.metadata }
  }));

  return {
    source: 'carta',
    status: 'success',
    error: null,
    documents
  };
}

module.exports = { connect, fetchDocuments };
