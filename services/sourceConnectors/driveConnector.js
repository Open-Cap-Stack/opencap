/**
 * Google Drive Source Connector
 * Issue #628: OAuth connector stub for Google Drive — returns mock documents in MVP
 *
 * In production this would exchange an OAuth code for tokens and
 * list/download real Drive files. In MVP it always returns curated mock data.
 */

const { v4: uuidv4 } = require('uuid');

const MOCK_DOCUMENTS = [
  {
    originalName: 'Financial Model 2024.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    textContent: 'Financial model projections 2024-2026. Revenue: $3M ARR. Burn rate: $42,000/month. Runway: 14 months. Headcount: 8.',
    metadata: {
      fileSize: 287400,
      pageCount: null,
      sheetNames: ['Revenue', 'Expenses', 'Runway'],
      subject: null,
      sender: null,
      date: '2024-01-15',
      driveUrl: 'https://drive.google.com/file/d/mock-financial-model'
    }
  },
  {
    originalName: 'Cap Table v3.2.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    textContent: 'Cap table as of March 2024. Total authorized shares: 10,000,000. Outstanding: 5,000,000. Option pool: 1,000,000 (20%).',
    metadata: {
      fileSize: 143200,
      pageCount: null,
      sheetNames: ['Summary', 'Shareholders', 'Options'],
      subject: null,
      sender: null,
      date: '2024-03-01',
      driveUrl: 'https://drive.google.com/file/d/mock-cap-table'
    }
  },
  {
    originalName: 'Board Minutes Q1 2024.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    textContent: 'Board meeting minutes Q1 2024. Approved Series A strategy. Authorized additional option grants. Discussed expansion plans.',
    metadata: {
      fileSize: 42800,
      pageCount: 4,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-03-31',
      driveUrl: 'https://drive.google.com/file/d/mock-board-minutes'
    }
  },
  {
    originalName: 'Cash Flow Forecast 2024.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    textContent: '14-month cash flow forecast. Current burn: $42k/month. Projected runway: 14 months. Break-even: Q2 2025.',
    metadata: {
      fileSize: 198600,
      pageCount: null,
      sheetNames: ['Monthly', 'Assumptions'],
      subject: null,
      sender: null,
      date: '2024-02-01',
      driveUrl: 'https://drive.google.com/file/d/mock-cash-flow'
    }
  },
  {
    originalName: 'Enterprise Customer Contracts.pdf',
    mimeType: 'application/pdf',
    textContent: '3 enterprise customer contracts. Total ACV: $3,200,000. Customers: Acme Corp, GlobalTech, MegaCorp. All 3-year agreements.',
    metadata: {
      fileSize: 512000,
      pageCount: 47,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-01-10',
      driveUrl: 'https://drive.google.com/file/d/mock-contracts'
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
  return { connected: true, source: 'drive' };
}

/**
 * Fetch Drive documents for the given company.
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
    source: 'drive',
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    textContent: doc.textContent,
    metadata: { ...doc.metadata }
  }));

  return {
    source: 'drive',
    status: 'success',
    error: null,
    documents
  };
}

module.exports = { connect, fetchDocuments };
