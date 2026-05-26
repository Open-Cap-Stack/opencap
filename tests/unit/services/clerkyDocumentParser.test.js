'use strict';

/**
 * Clerky Document Parser Tests
 * Issue #663: Template-aware parsers for Clerky legal document types
 */

jest.mock('../../../services/ainativeAgentService');
jest.mock('../../../models/PendingExtraction');

const { ainativeChatWithRetry } = require('../../../services/ainativeAgentService');
const PendingExtraction = require('../../../models/PendingExtraction');

const {
  parseYCSAFE,
  parseOptionGrant,
  parseCertificateOfIncorporation,
  parseBoardConsent,
  parseDocumentByType,
  detectDocumentType,
  parseAndQueueForReview,
} = require('../../../services/clerkyDocumentParser');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAFE_TEXT = `
SAFE (Simple Agreement for Future Equity)
This SAFE is entered into by and between Acme Corp and Jane Investor.
Investment Amount: $125,000
Valuation Cap: $10,000,000
Discount Rate: 20%
MFN Clause: Yes
Pro Rata Rights: Yes
Date: January 15, 2026
`;

const OPTION_GRANT_TEXT = `
Stock Option Agreement
Grantee: John Smith
Email: john@example.com
Number of Shares: 50,000
Exercise Price: $0.25 per share
Grant Date: March 1, 2026
Vesting: 4-year vesting with 1-year cliff
Expiration: 10 years from grant date
`;

const COI_TEXT = `
Certificate of Incorporation
of
NewCo Inc.
State of Incorporation: Delaware
Date of Incorporation: February 1, 2026
The total number of shares which the corporation is authorized to issue is:
Common Stock: 10,000,000 shares, par value $0.0001
Preferred Stock: 5,000,000 shares, par value $0.0001
`;

const BOARD_CONSENT_TEXT = `
Action by Unanimous Written Consent of the Board of Directors
Date: April 10, 2026
The undersigned directors hereby approve the following resolution:
RESOLVED, that the Company is authorized to grant stock options under the 2026 Equity Incentive Plan.
Approving Directors: Alice Johnson, Bob Williams, Carol Davis
`;

const UNKNOWN_TEXT = `
This is a general business document with no specific template markers.
It contains some financial information but does not match any known Clerky template.
`;

// ── Mock Responses ───────────────────────────────────────────────────────────

const SAFE_PARSED = {
  investorName: 'Jane Investor',
  investmentAmount: 125000,
  valuationCap: 10000000,
  discountRate: 20,
  mfnClause: true,
  proRataRights: true,
  signedDate: '2026-01-15',
};

const OPTION_PARSED = {
  granteeName: 'John Smith',
  granteeEmail: 'john@example.com',
  sharesGranted: 50000,
  exercisePrice: 0.25,
  grantDate: '2026-03-01',
  vestingCliffMonths: 12,
  vestingTotalMonths: 48,
  expirationYears: 10,
};

const COI_PARSED = {
  companyName: 'NewCo Inc.',
  stateOfIncorporation: 'Delaware',
  incorporationDate: '2026-02-01',
  shareClasses: [
    { name: 'Common Stock', authorizedShares: 10000000, parValue: 0.0001 },
    { name: 'Preferred Stock', authorizedShares: 5000000, parValue: 0.0001 },
  ],
};

const BOARD_PARSED = {
  resolutionType: 'stock_option_plan',
  consentDate: '2026-04-10',
  approvingDirectors: ['Alice Johnson', 'Bob Williams', 'Carol Davis'],
  subjectMatter: 'Authorization to grant stock options under the 2026 Equity Incentive Plan',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('clerkyDocumentParser', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // ── detectDocumentType ───────────────────────────────────────────────────

  describe('detectDocumentType()', () => {
    it('detects YC SAFE documents', () => {
      expect(detectDocumentType(SAFE_TEXT)).toBe('yc_safe');
    });

    it('detects option grant documents', () => {
      expect(detectDocumentType(OPTION_GRANT_TEXT)).toBe('option_grant');
    });

    it('detects certificate of incorporation documents', () => {
      expect(detectDocumentType(COI_TEXT)).toBe('certificate_of_incorporation');
    });

    it('detects board consent documents', () => {
      expect(detectDocumentType(BOARD_CONSENT_TEXT)).toBe('board_consent');
    });

    it('returns generic for unknown document types', () => {
      expect(detectDocumentType(UNKNOWN_TEXT)).toBe('generic');
    });
  });

  // ── parseYCSAFE ──────────────────────────────────────────────────────────

  describe('parseYCSAFE()', () => {
    it('returns correct shape with all expected fields', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(SAFE_PARSED),
        parsed: SAFE_PARSED,
      });

      const result = await parseYCSAFE(SAFE_TEXT, 'safe.pdf');
      expect(result).toEqual(SAFE_PARSED);
      expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);

      // Verify system prompt references YC SAFE template
      const callArgs = ainativeChatWithRetry.mock.calls[0];
      expect(callArgs[1].system).toMatch(/SAFE/i);
    });
  });

  // ── parseOptionGrant ─────────────────────────────────────────────────────

  describe('parseOptionGrant()', () => {
    it('returns correct shape with all expected fields', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(OPTION_PARSED),
        parsed: OPTION_PARSED,
      });

      const result = await parseOptionGrant(OPTION_GRANT_TEXT, 'option.pdf');
      expect(result).toEqual(OPTION_PARSED);
      expect(ainativeChatWithRetry).toHaveBeenCalledTimes(1);
    });
  });

  // ── parseCertificateOfIncorporation ──────────────────────────────────────

  describe('parseCertificateOfIncorporation()', () => {
    it('returns correct shape with share classes array', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(COI_PARSED),
        parsed: COI_PARSED,
      });

      const result = await parseCertificateOfIncorporation(COI_TEXT, 'coi.pdf');
      expect(result).toEqual(COI_PARSED);
      expect(result.shareClasses).toBeInstanceOf(Array);
      expect(result.shareClasses.length).toBe(2);
    });
  });

  // ── parseBoardConsent ────────────────────────────────────────────────────

  describe('parseBoardConsent()', () => {
    it('returns correct shape with directors array', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(BOARD_PARSED),
        parsed: BOARD_PARSED,
      });

      const result = await parseBoardConsent(BOARD_CONSENT_TEXT, 'consent.pdf');
      expect(result).toEqual(BOARD_PARSED);
      expect(result.approvingDirectors).toBeInstanceOf(Array);
    });
  });

  // ── parseDocumentByType ──────────────────────────────────────────────────

  describe('parseDocumentByType()', () => {
    it('routes yc_safe to parseYCSAFE and returns correct envelope', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(SAFE_PARSED),
        parsed: SAFE_PARSED,
      });

      const result = await parseDocumentByType(SAFE_TEXT, 'yc_safe', 'safe.pdf');
      expect(result.recordType).toBe('safe');
      expect(result.extractedData).toEqual(SAFE_PARSED);
      expect(result.confidence).toBe(0.85);
      expect(result.sourceDocument).toBe('safe.pdf');
    });

    it('routes option_grant to parseOptionGrant', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(OPTION_PARSED),
        parsed: OPTION_PARSED,
      });

      const result = await parseDocumentByType(OPTION_GRANT_TEXT, 'option_grant', 'option.pdf');
      expect(result.recordType).toBe('equityGrant');
      expect(result.confidence).toBe(0.85);
    });

    it('falls back to generic with lower confidence for unknown types', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify({ data: 'some data' }),
        parsed: { data: 'some data' },
      });

      const result = await parseDocumentByType(UNKNOWN_TEXT, 'generic', 'doc.pdf');
      expect(result.recordType).toBe('generic');
      expect(result.confidence).toBe(0.6);
      expect(result.sourceDocument).toBe('doc.pdf');
    });
  });

  // ── parseAndQueueForReview ───────────────────────────────────────────────

  describe('parseAndQueueForReview()', () => {
    it('detects type, parses, and creates PendingExtraction records', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(SAFE_PARSED),
        parsed: SAFE_PARSED,
      });

      const mockRecord = {
        extractionId: 'ext_123',
        dataRoomId: 'dr_1',
        companyId: 'co_1',
        recordType: 'safe',
        extractedData: SAFE_PARSED,
        sourceDocument: 'safe.pdf',
        confidence: 0.85,
        status: 'pending',
      };
      PendingExtraction.create.mockResolvedValueOnce(mockRecord);

      const results = await parseAndQueueForReview(SAFE_TEXT, 'safe.pdf', 'co_1', 'dr_1');

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(1);
      expect(results[0]).toEqual(mockRecord);

      expect(PendingExtraction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dataRoomId: 'dr_1',
          companyId: 'co_1',
          recordType: 'safe',
          extractedData: SAFE_PARSED,
          sourceDocument: 'safe.pdf',
          confidence: 0.85,
          status: 'pending',
        })
      );

      // Verify clerky source metadata
      const createArg = PendingExtraction.create.mock.calls[0][0];
      expect(createArg.metadata).toBeDefined();
      expect(createArg.metadata.source).toBe('clerky');
    });

    it('handles board consent with correct record type mapping', async () => {
      ainativeChatWithRetry.mockResolvedValueOnce({
        content: JSON.stringify(BOARD_PARSED),
        parsed: BOARD_PARSED,
      });

      const mockRecord = {
        extractionId: 'ext_456',
        dataRoomId: 'dr_2',
        companyId: 'co_2',
        recordType: 'boardConsent',
        extractedData: BOARD_PARSED,
        status: 'pending',
      };
      PendingExtraction.create.mockResolvedValueOnce(mockRecord);

      const results = await parseAndQueueForReview(BOARD_CONSENT_TEXT, 'consent.pdf', 'co_2', 'dr_2');

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBe(1);
    });
  });
});
