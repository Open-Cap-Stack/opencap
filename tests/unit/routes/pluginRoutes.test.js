/**
 * Plugin Routes Test Suite
 *
 * Tests for the plugin summary endpoint
 * Issue #506: Plugin tool handlers
 *
 * Test Coverage:
 * - Summary endpoint returns structured cap table overview
 * - Handles empty data gracefully
 * - Handles ZeroDB errors gracefully
 * - Authentication required
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

// Import controller after mocking
const pluginController = require('../../../controllers/pluginController');

describe('Plugin Routes (Summary Endpoint)', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'admin'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Default: return empty arrays
    zerodbService.queryRows = jest.fn().mockResolvedValue([]);
  });

  describe('Given the getSummary function', () => {
    describe('When called with an authenticated user and data exists', () => {
      it('Then it should return a structured cap table summary', async () => {
        const mockStakeholders = [
          { row_data: { type: 'FOUNDER', name: 'Alice' } },
          { row_data: { type: 'FOUNDER', name: 'Bob' } },
          { row_data: { type: 'INVESTOR', name: 'VC Fund' } },
          { row_data: { type: 'EMPLOYEE', name: 'Charlie' } }
        ];

        const mockShareClasses = [
          { row_data: { name: 'Common', type: 'COMMON', authorized_shares: 10000000 } },
          { row_data: { name: 'Series A', type: 'PREFERRED', authorized_shares: 2000000 } }
        ];

        const mockSafes = [
          { row_data: { status: 'OPEN', investment_amount: 500000 } },
          { row_data: { status: 'OPEN', investment_amount: 250000 } },
          { row_data: { status: 'CONVERTED', investment_amount: 100000 } }
        ];

        const mockValuations = [
          { row_data: { fairMarketValue: 150, effectiveDate: '2025-06-01', status: 'active' } },
          { row_data: { fairMarketValue: 100, effectiveDate: '2024-12-01', status: 'expired' } }
        ];

        zerodbService.queryRows
          .mockResolvedValueOnce(mockStakeholders)
          .mockResolvedValueOnce(mockShareClasses)
          .mockResolvedValueOnce(mockSafes)
          .mockResolvedValueOnce(mockValuations);

        await pluginController.getSummary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const response = mockRes.json.mock.calls[0][0];

        expect(response.companyId).toBe('company-456');
        expect(response.stakeholders.total).toBe(4);
        expect(response.stakeholders.byType).toEqual({
          FOUNDER: 2,
          INVESTOR: 1,
          EMPLOYEE: 1
        });
        expect(response.shareClasses.total).toBe(2);
        expect(response.shareClasses.totalAuthorizedShares).toBe(12000000);
        expect(response.safes.total).toBe(3);
        expect(response.safes.open).toBe(2);
        expect(response.safes.totalInvestment).toBe(750000);
        expect(response.latestValuation).toEqual({
          fairMarketValue: 150,
          effectiveDate: '2025-06-01',
          status: 'active'
        });
        expect(response.generatedAt).toBeTruthy();
      });
    });

    describe('When called with no data in the database', () => {
      it('Then it should return zeros and null valuation', async () => {
        zerodbService.queryRows.mockResolvedValue([]);

        await pluginController.getSummary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const response = mockRes.json.mock.calls[0][0];

        expect(response.stakeholders.total).toBe(0);
        expect(response.shareClasses.total).toBe(0);
        expect(response.shareClasses.totalAuthorizedShares).toBe(0);
        expect(response.safes.total).toBe(0);
        expect(response.safes.open).toBe(0);
        expect(response.safes.totalInvestment).toBe(0);
        expect(response.latestValuation).toBeNull();
      });
    });

    describe('When ZeroDB queries partially fail', () => {
      it('Then it should handle errors gracefully with empty fallback', async () => {
        zerodbService.queryRows
          .mockResolvedValueOnce([{ row_data: { type: 'FOUNDER', name: 'Alice' } }])
          .mockRejectedValueOnce(new Error('ZeroDB timeout'))
          .mockRejectedValueOnce(new Error('ZeroDB timeout'))
          .mockResolvedValueOnce([]);

        await pluginController.getSummary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const response = mockRes.json.mock.calls[0][0];
        expect(response.stakeholders.total).toBe(1);
        expect(response.shareClasses.total).toBe(0);
        expect(response.safes.total).toBe(0);
      });
    });

    describe('When called without authentication', () => {
      it('Then it should return 401', async () => {
        mockReq.user = null;

        await pluginController.getSummary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      });
    });

    describe('When called without companyId', () => {
      it('Then it should return 401', async () => {
        mockReq.user = { userId: 'user-123', email: 'test@example.com' };

        await pluginController.getSummary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });

    describe('When ZeroDB completely fails', () => {
      it('Then it should return 500', async () => {
        // Make all queries throw, bypassing the .catch fallbacks by making
        // Promise.all itself fail (this tests the outer catch block)
        zerodbService.queryRows = jest.fn().mockImplementation(() => {
          throw new Error('Synchronous ZeroDB failure');
        });

        await pluginController.getSummary(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Failed to generate cap table summary'
        });
      });
    });
  });
});
