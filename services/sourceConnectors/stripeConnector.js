/**
 * Stripe Source Connector
 * Issue #628: OAuth connector stub for Stripe — returns mock documents in MVP
 *
 * In production this would use a Stripe API key or Connect OAuth token to
 * pull real MRR / expense reports. In MVP it returns curated mock data.
 */

const { v4: uuidv4 } = require('uuid');

const MOCK_DOCUMENTS = [
  {
    originalName: 'Stripe MRR Report.json',
    mimeType: 'application/json',
    textContent: 'Monthly Recurring Revenue: $250,000. Annual Run Rate: $3,000,000. Month-over-month growth: 8%. Churn rate: 2%. Active subscribers: 47.',
    metadata: {
      fileSize: 14600,
      pageCount: null,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-03-31',
      driveUrl: null
    }
  },
  {
    originalName: 'Ramp Expense Report Q1.csv',
    mimeType: 'text/csv',
    textContent: 'Q1 2024 expenses: Total burn $126,000 ($42k/month). Top vendors: AWS $18k, Salaries $65k, Marketing $12k, Office $8k, Other $23k.',
    metadata: {
      fileSize: 38200,
      pageCount: null,
      sheetNames: null,
      subject: null,
      sender: null,
      date: '2024-04-01',
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
  return { connected: true, source: 'stripe' };
}

/**
 * Fetch Stripe documents for the given company.
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
    source: 'stripe',
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    textContent: doc.textContent,
    metadata: { ...doc.metadata }
  }));

  return {
    source: 'stripe',
    status: 'success',
    error: null,
    documents
  };
}

module.exports = { connect, fetchDocuments };
