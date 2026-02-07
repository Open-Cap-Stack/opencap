/**
 * Valuation409A Export Controller Tests
 * Feature: Issue #269 - Create 409A data export API for third-party valuation providers
 */

// Mock the models before requiring controller
jest.mock('../../../models/Company');
jest.mock('../../../models/ShareClass');
jest.mock('../../../models/EquityGrant');
jest.mock('../../../models/FundraisingRoundModel', () => ({
  findByCompany: jest.fn(),
  find: jest.fn()
}));
jest.mock('../../../models/MaterialEvent', () => ({
  findByCompany: jest.fn(),
  find: jest.fn()
}));
jest.mock('../../../models/Valuation409A');

const Company = require('../../../models/Company');
const ShareClass = require('../../../models/ShareClass');
const EquityGrant = require('../../../models/EquityGrant');
const FundraisingRound = require('../../../models/FundraisingRoundModel');
const MaterialEvent = require('../../../models/MaterialEvent');
const Valuation409A = require('../../../models/Valuation409A');
const valuation409AExportController = require('../../../controllers/valuation409AExportController');

describe('Valuation409A Export Controller', () => {
  let mockReq;
  let mockRes;

  const mockCompany = {
    companyId: 'company_123',
    CompanyName: 'Test Corp',
    legal_name: 'Test Corporation Inc.',
    entity_type: 'C_CORP',
    jurisdiction_country: 'US',
    jurisdiction_state: 'DE',
    TaxID: '12-3456789',
    corporationDate: '2020-01-15',
    fiscal_year_end_month: 12,
    reporting_currency: 'USD',
    qualified_small_business: true,
    section_1202_eligible: true
  };

  const mockShareClasses = [
    {
      shareClassId: 'sc_001',
      name: 'Common Stock',
      description: 'Common voting shares',
      authorizedShares: 10000000,
      dilutedShares: 5000000,
      ownershipPercentage: 60,
      amountRaised: 0
    },
    {
      shareClassId: 'sc_002',
      name: 'Series A Preferred',
      description: 'Series A preferred shares',
      authorizedShares: 3000000,
      dilutedShares: 2000000,
      ownershipPercentage: 30,
      amountRaised: 5000000
    }
  ];

  const mockEquityGrants = [
    {
      grantId: 'grant_001',
      employeeId: 'emp_001',
      companyId: 'company_123',
      grantType: 'ISO',
      numberOfShares: 10000,
      strikePrice: 0.10,
      grantDate: '2023-01-15',
      expirationDate: '2033-01-15',
      status: 'active',
      exercisedShares: 2000,
      exerciseHistory: [
        {
          exerciseDate: '2024-01-15',
          sharesExercised: 2000,
          exercisePrice: 0.10,
          totalCost: 200,
          paymentMethod: 'cash'
        }
      ],
      fmvAtGrant: 0.10,
      fmvSource: 'VALUATION_409A',
      vestingSchedule: {
        vestingStartDate: '2023-01-15',
        vestingPeriodMonths: 48,
        cliffMonths: 12,
        vestingFrequency: 'monthly'
      }
    },
    {
      grantId: 'grant_002',
      employeeId: 'emp_002',
      companyId: 'company_123',
      grantType: 'NSO',
      numberOfShares: 5000,
      strikePrice: 0.25,
      grantDate: '2024-01-15',
      expirationDate: '2034-01-15',
      status: 'approved',
      exercisedShares: 0,
      exerciseHistory: [],
      fmvAtGrant: null,
      vestingSchedule: {
        vestingStartDate: '2024-01-15',
        vestingPeriodMonths: 48,
        cliffMonths: 12,
        vestingFrequency: 'monthly'
      }
    }
  ];

  const mockFundraisingRounds = [
    {
      roundId: 'round_001',
      roundName: 'Series A',
      RoundType: 'SERIES_A',
      amountRaised: 5000000,
      date: '2023-06-15',
      closingDate: '2023-06-30',
      boardApprovalDate: '2023-06-01',
      preMoneyValuation: 15000000,
      postMoneyValuation: 20000000,
      pricePerShare: 1.50,
      fullyDilutedSharesPre: 10000000,
      fullyDilutedSharesPost: 13333333,
      equityGiven: 25,
      isArmsLength: true,
      isInsiderRound: false,
      isDownRound: false,
      investors: ['inv_001', 'inv_002']
    },
    {
      roundId: 'round_002',
      roundName: 'Seed',
      RoundType: 'SEED',
      amountRaised: 500000,
      date: '2022-01-15',
      closingDate: '2022-01-31',
      boardApprovalDate: '2022-01-10',
      preMoneyValuation: 2000000,
      postMoneyValuation: 2500000,
      pricePerShare: 0.25,
      fullyDilutedSharesPre: 8000000,
      fullyDilutedSharesPost: 10000000,
      equityGiven: 20,
      isArmsLength: true,
      isInsiderRound: false,
      isDownRound: false,
      investors: ['inv_003']
    }
  ];

  const mockMaterialEvents = [
    {
      eventId: 'evt_001',
      companyId: 'company_123',
      eventType: 'FINANCING_ROUND',
      eventDate: '2023-06-30',
      description: 'Series A financing closed',
      severity: 'HIGH',
      requires409AUpdate: true,
      triggersValuation: true,
      status: 'resolved',
      resolution: {
        resolvedAt: '2023-07-15',
        resolvedBy: 'user_001',
        resolutionNotes: 'New 409A obtained post-round'
      }
    },
    {
      eventId: 'evt_002',
      companyId: 'company_123',
      eventType: 'KEY_EMPLOYEE_HIRE',
      eventDate: '2024-01-10',
      description: 'New CTO hired',
      severity: 'MEDIUM',
      requires409AUpdate: false,
      triggersValuation: false,
      status: 'acknowledged'
    }
  ];

  const mockValuations = [
    {
      valuationId: 'val_001',
      companyId: 'company_123',
      status: 'approved',
      fairMarketValue: 0.50,
      valuationMethod: 'income',
      effectiveDate: '2024-01-01',
      expirationDate: '2025-01-01',
      valuationFirm: {
        name: 'ABC Valuation Partners',
        contactName: 'John Smith'
      }
    }
  ];

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { _id: 'user_123' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('exportCapTable', () => {
    it('should export cap table summary for a company', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      ShareClass.find.mockResolvedValue(mockShareClasses);
      EquityGrant.findByCompany.mockResolvedValue(mockEquityGrants);

      await valuation409AExportController.exportCapTable(mockReq, mockRes);

      expect(Company.findByCompanyId).toHaveBeenCalledWith('company_123');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            exportId: expect.stringMatching(/^exp_/),
            company: expect.objectContaining({
              companyId: 'company_123',
              name: 'Test Corp'
            }),
            shareClasses: expect.any(Array),
            optionPool: expect.objectContaining({
              totalGranted: expect.any(Number),
              exercised: expect.any(Number),
              outstanding: expect.any(Number)
            }),
            dataHash: expect.any(String)
          })
        })
      );
    });

    it('should return 404 when company not found', async () => {
      mockReq.params = { companyId: 'nonexistent' };

      Company.findByCompanyId.mockResolvedValue(null);

      await valuation409AExportController.exportCapTable(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Company not found'
        })
      );
    });

    it('should calculate option pool statistics correctly', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      ShareClass.find.mockResolvedValue(mockShareClasses);
      EquityGrant.findByCompany.mockResolvedValue(mockEquityGrants);

      await valuation409AExportController.exportCapTable(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.optionPool.totalGranted).toBe(15000); // 10000 + 5000
      expect(response.data.optionPool.exercised).toBe(2000);
      expect(response.data.optionPool.outstanding).toBe(13000); // 15000 - 2000
    });
  });

  describe('exportFinancials', () => {
    it('should export financial highlights for a company', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      FundraisingRound.findByCompany.mockResolvedValue(mockFundraisingRounds);

      await valuation409AExportController.exportFinancials(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            exportId: expect.stringMatching(/^exp_/),
            company: expect.objectContaining({
              companyId: 'company_123',
              fiscalYearEndMonth: 12,
              reportingCurrency: 'USD'
            }),
            financingHighlights: expect.objectContaining({
              totalRoundsCompleted: 2,
              totalCapitalRaised: 5500000
            }),
            latestFinancingDetails: expect.objectContaining({
              roundName: 'Series A',
              amountRaised: 5000000
            })
          })
        })
      );
    });

    it('should return null for latest financing when no rounds exist', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      FundraisingRound.findByCompany.mockResolvedValue([]);

      await valuation409AExportController.exportFinancials(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.latestFinancingDetails).toBeNull();
      expect(response.data.financingHighlights.totalRoundsCompleted).toBe(0);
    });
  });

  describe('exportTransactions', () => {
    it('should export transaction history', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      EquityGrant.findByCompany.mockResolvedValue(mockEquityGrants);
      MaterialEvent.findByCompany.mockResolvedValue(mockMaterialEvents);

      await valuation409AExportController.exportTransactions(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            exportId: expect.stringMatching(/^exp_/),
            exerciseTransactions: expect.any(Array),
            materialEvents: expect.any(Array),
            summary: expect.objectContaining({
              totalExercises: 1,
              totalSharesExercised: 2000,
              totalMaterialEvents: 2
            })
          })
        })
      );
    });

    it('should filter by date range when provided', async () => {
      mockReq.params = { companyId: 'company_123' };
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      EquityGrant.findByCompany.mockResolvedValue(mockEquityGrants);
      MaterialEvent.findByCompany.mockResolvedValue(mockMaterialEvents);

      await valuation409AExportController.exportTransactions(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            dateRange: {
              start: '2024-01-01',
              end: '2024-12-31'
            }
          })
        })
      );
    });
  });

  describe('exportFullPackage', () => {
    it('should generate full 409A export package', async () => {
      mockReq.body = {
        company_id: 'company_123',
        effective_date: '2024-02-01',
        export_format: 'JSON',
        include_sections: ['all'],
        recipient: {
          firm_name: 'ABC Valuation Partners',
          contact_email: 'analyst@abcvaluation.com'
        },
        password_protect: false
      };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      ShareClass.find.mockResolvedValue(mockShareClasses);
      EquityGrant.findByCompany.mockResolvedValue(mockEquityGrants);
      FundraisingRound.findByCompany.mockResolvedValue(mockFundraisingRounds);
      MaterialEvent.findByCompany.mockResolvedValue(mockMaterialEvents);
      Valuation409A.find.mockResolvedValue(mockValuations);

      await valuation409AExportController.exportFullPackage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              exportId: expect.stringMatching(/^exp_/),
              effectiveDate: '2024-02-01',
              recipient: expect.objectContaining({
                firmName: 'ABC Valuation Partners'
              })
            }),
            company: expect.objectContaining({
              legalStructure: expect.any(Object)
            }),
            capTable: expect.objectContaining({
              shareClasses: expect.any(Array)
            }),
            optionGrants: expect.any(Array),
            financingHistory: expect.any(Array),
            materialEvents: expect.any(Array),
            priorValuations: expect.any(Array),
            validation: expect.objectContaining({
              readyForExport: expect.any(Boolean),
              completenessScore: expect.any(Number)
            })
          })
        })
      );
    });

    it('should return 400 when company_id is missing', async () => {
      mockReq.body = {
        effective_date: '2024-02-01'
      };

      await valuation409AExportController.exportFullPackage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'company_id is required'
        })
      );
    });

    it('should return 404 when company not found', async () => {
      mockReq.body = {
        company_id: 'nonexistent'
      };

      Company.findByCompanyId.mockResolvedValue(null);

      await valuation409AExportController.exportFullPackage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Company not found'
        })
      );
    });

    it('should include validation warnings for incomplete data', async () => {
      const incompleteCompany = { ...mockCompany, entity_type: null };
      mockReq.body = { company_id: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(incompleteCompany);
      ShareClass.find.mockResolvedValue([]);
      EquityGrant.findByCompany.mockResolvedValue([]);
      FundraisingRound.findByCompany.mockResolvedValue([]);
      MaterialEvent.findByCompany.mockResolvedValue([]);
      Valuation409A.find.mockResolvedValue([]);

      await valuation409AExportController.exportFullPackage(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.validation.readyForExport).toBe(false);
      expect(response.data.validation.missingRequired.length).toBeGreaterThan(0);
    });
  });

  describe('validateExportData', () => {
    it('should validate export data completeness', async () => {
      mockReq.body = { company_id: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      ShareClass.find.mockResolvedValue(mockShareClasses);
      EquityGrant.findByCompany.mockResolvedValue(mockEquityGrants);
      FundraisingRound.findByCompany.mockResolvedValue(mockFundraisingRounds);
      MaterialEvent.findByCompany.mockResolvedValue(mockMaterialEvents);
      Valuation409A.find.mockResolvedValue(mockValuations);

      await valuation409AExportController.validateExportData(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            readyForExport: expect.any(Boolean),
            completenessScore: expect.any(Number),
            sectionsPresent: expect.any(Array),
            missingRequired: expect.any(Array),
            warnings: expect.any(Array)
          })
        })
      );
    });

    it('should return 400 when company_id is missing', async () => {
      mockReq.body = {};

      await valuation409AExportController.validateExportData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'company_id is required'
        })
      );
    });

    it('should flag unresolved material events as critical', async () => {
      const unresolvedEvents = [
        {
          eventId: 'evt_003',
          eventType: 'FINANCING_ROUND',
          status: 'detected',
          requires409AUpdate: true
        }
      ];

      mockReq.body = { company_id: 'company_123' };

      Company.findByCompanyId.mockResolvedValue(mockCompany);
      ShareClass.find.mockResolvedValue(mockShareClasses);
      EquityGrant.findByCompany.mockResolvedValue([]);
      FundraisingRound.findByCompany.mockResolvedValue([]);
      MaterialEvent.findByCompany.mockResolvedValue(unresolvedEvents);
      Valuation409A.find.mockResolvedValue([]);

      await valuation409AExportController.validateExportData(mockReq, mockRes);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.data.readyForExport).toBe(false);
      expect(response.data.missingRequired).toContainEqual(
        expect.objectContaining({
          section: 'material_events',
          severity: 'CRITICAL'
        })
      );
    });
  });

  describe('getExportRequirements', () => {
    it('should return export requirements checklist', async () => {
      await valuation409AExportController.getExportRequirements(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({
                name: 'company',
                displayName: 'Company Legal Structure',
                required: true,
                fields: expect.any(Array)
              })
            ]),
            validationRules: expect.arrayContaining([
              expect.objectContaining({
                rule: expect.any(String),
                description: expect.any(String)
              })
            ])
          })
        })
      );
    });
  });

  describe('getExport', () => {
    it('should return 404 when export not found', async () => {
      mockReq.params = { exportId: 'exp_nonexistent' };

      await valuation409AExportController.getExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Export not found'
        })
      );
    });
  });

  describe('downloadExport', () => {
    it('should return 404 when export not found', async () => {
      mockReq.params = { exportId: 'exp_nonexistent' };

      await valuation409AExportController.downloadExport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Export not found'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors in exportCapTable', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockRejectedValue(new Error('Database error'));

      await valuation409AExportController.exportCapTable(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Database error'
        })
      );
    });

    it('should handle database errors in exportFinancials', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockRejectedValue(new Error('Database error'));

      await valuation409AExportController.exportFinancials(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle database errors in exportTransactions', async () => {
      mockReq.params = { companyId: 'company_123' };

      Company.findByCompanyId.mockRejectedValue(new Error('Database error'));

      await valuation409AExportController.exportTransactions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle database errors in exportFullPackage', async () => {
      mockReq.body = { company_id: 'company_123' };

      Company.findByCompanyId.mockRejectedValue(new Error('Database error'));

      await valuation409AExportController.exportFullPackage(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle database errors in validateExportData', async () => {
      mockReq.body = { company_id: 'company_123' };

      Company.findByCompanyId.mockRejectedValue(new Error('Database error'));

      await valuation409AExportController.validateExportData(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
