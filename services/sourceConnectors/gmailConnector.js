/**
 * Gmail Source Connector
 * Issue #628: OAuth connector stub for Gmail — returns mock documents in MVP
 *
 * In production this would exchange an OAuth code for tokens and
 * fetch real email attachments. In MVP it always returns curated mock data.
 */

const { v4: uuidv4 } = require('uuid');

const MOCK_DOCUMENTS = [
  {
    originalName: 'Brex Invoice - March 2024.pdf',
    mimeType: 'application/pdf',
    textContent: 'Brex invoice for $45,000 monthly spend. Account: AINative Studio. Payment due March 15, 2024.',
    metadata: {
      subject: 'Brex Invoice - March 2024',
      sender: 'invoices@brex.com',
      date: '2024-03-01',
      fileSize: 48200,
      pageCount: 1,
      sheetNames: null,
      driveUrl: null
    }
  },
  {
    originalName: 'Stripe Revenue Summary Q1 2024.pdf',
    mimeType: 'application/pdf',
    textContent: 'Stripe processing volume: $250,000/month. Total Q1 revenue: $750,000. Active subscriptions: 47.',
    metadata: {
      subject: 'Stripe Revenue Summary Q1 2024',
      sender: 'reports@stripe.com',
      date: '2024-04-01',
      fileSize: 62100,
      pageCount: 2,
      sheetNames: null,
      driveUrl: null
    }
  },
  {
    originalName: 'Tax Documents 2023 - Annual Revenue.pdf',
    mimeType: 'application/pdf',
    textContent: 'Annual revenue for tax year 2023: $2,800,000. Federal tax filing reference number: 2023-ANS-8847.',
    metadata: {
      subject: 'Tax Documents 2023 - Annual Revenue',
      sender: 'tax@accountingfirm.com',
      date: '2024-02-15',
      fileSize: 114300,
      pageCount: 8,
      sheetNames: null,
      driveUrl: null
    }
  },
  {
    originalName: 'Seed Round LOI - March 2024.pdf',
    mimeType: 'application/pdf',
    textContent: 'Letter of Intent for $500,000 seed investment at $3M pre-money valuation. Investor: AngelList Syndicate.',
    metadata: {
      subject: 'Seed Round LOI - March 2024',
      sender: 'deals@angellist.com',
      date: '2024-03-20',
      fileSize: 38900,
      pageCount: 3,
      sheetNames: null,
      driveUrl: null
    }
  }
];

/**
 * Stub connect — exchanges OAuth code for tokens.
 * In MVP this is a no-op that returns a connected flag.
 *
 * @param {string} oauthCode
 * @returns {{ connected: boolean, source: string }}
 */
function connect(oauthCode) {
  return { connected: true, source: 'gmail' };
}

/**
 * Fetch Gmail documents for the given company.
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
    source: 'gmail',
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    textContent: doc.textContent,
    metadata: { ...doc.metadata }
  }));

  return {
    source: 'gmail',
    status: 'success',
    error: null,
    documents
  };
}

module.exports = { connect, fetchDocuments };
