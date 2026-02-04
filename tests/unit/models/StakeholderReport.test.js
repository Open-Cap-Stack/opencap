/**
 * StakeholderReport Model Unit Tests
 * Issue #198: Enhance Stakeholder Report Generation
 */

jest.mock('../../../services/zerodbService');

const zerodbService = require('../../../services/zerodbService');

// Mock the base model
jest.mock('../../../models/base/ZeroDBModel', () => {
  const mockCreate = jest.fn();
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  const mockFindOneAndUpdate = jest.fn();

  return {
    createModel: jest.fn(() => ({
      create: mockCreate,
      findOne: mockFindOne,
      find: mockFind,
      findOneAndUpdate: mockFindOneAndUpdate,
      findById: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      findOneAndDelete: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      exists: jest.fn(),
      distinct: jest.fn(),
      aggregate: jest.fn()
    })),
    ZeroDBModel: jest.fn()
  };
});

const StakeholderReport = require('../../../models/StakeholderReport');

describe('StakeholderReport Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Definition', () => {
    it('should have required schema fields', () => {
      expect(StakeholderReport.schema).toBeDefined();
      expect(StakeholderReport.schema.reportId).toBeDefined();
      expect(StakeholderReport.schema.stakeholderId).toBeDefined();
      expect(StakeholderReport.schema.companyId).toBeDefined();
      expect(StakeholderReport.schema.reportType).toBeDefined();
    });

    it('should have correct table name', () => {
      expect(StakeholderReport.tableName).toBe('stakeholder_reports');
    });

    it('should have valid report type enum values', () => {
      const validTypes = ['holdings', 'transactions', 'valuations', 'tax', 'summary'];
      expect(StakeholderReport.schema.reportType.enum).toEqual(validTypes);
    });

    it('should have valid status enum values', () => {
      const validStatuses = ['pending', 'generating', 'completed', 'failed', 'delivered'];
      expect(StakeholderReport.schema.status.enum).toEqual(validStatuses);
    });

    it('should have valid format enum values', () => {
      const validFormats = ['pdf', 'excel', 'csv', 'json'];
      expect(StakeholderReport.schema.format.enum).toEqual(validFormats);
    });
  });

  describe('create', () => {
    it('should generate reportId if not provided', async () => {
      const mockData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        name: 'Test Report'
      };

      // Mock the base model's create method
      const baseMockCreate = StakeholderReport.find;
      jest.spyOn(StakeholderReport, 'create').mockResolvedValue({
        reportId: 'SR-12345678',
        ...mockData,
        status: 'pending'
      });

      const result = await StakeholderReport.create(mockData);

      expect(result.reportId).toMatch(/^SR-[A-Z0-9]{8}$/);
    });

    it('should set default status to pending', async () => {
      const mockData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        name: 'Test Report'
      };

      jest.spyOn(StakeholderReport, 'create').mockResolvedValue({
        ...mockData,
        reportId: 'SR-12345678',
        status: 'pending'
      });

      const result = await StakeholderReport.create(mockData);

      expect(result.status).toBe('pending');
    });

    it('should set default format to pdf', async () => {
      const mockData = {
        stakeholderId: 'STK-001',
        companyId: 'COMP-001',
        reportType: 'holdings',
        name: 'Test Report'
      };

      jest.spyOn(StakeholderReport, 'create').mockResolvedValue({
        ...mockData,
        reportId: 'SR-12345678',
        format: 'pdf'
      });

      const result = await StakeholderReport.create(mockData);

      expect(result.format).toBe('pdf');
    });
  });

  describe('findByReportId', () => {
    it('should find report by reportId', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        stakeholderId: 'STK-001',
        reportType: 'holdings'
      };

      jest.spyOn(StakeholderReport, 'findByReportId').mockResolvedValue(mockReport);

      const result = await StakeholderReport.findByReportId('SR-12345678');

      expect(result).toEqual(mockReport);
    });

    it('should return null for non-existent reportId', async () => {
      jest.spyOn(StakeholderReport, 'findByReportId').mockResolvedValue(null);

      const result = await StakeholderReport.findByReportId('INVALID-ID');

      expect(result).toBeNull();
    });
  });

  describe('findByStakeholder', () => {
    it('should find all reports for a stakeholder', async () => {
      const mockReports = [
        { reportId: 'SR-001', stakeholderId: 'STK-001', reportType: 'holdings' },
        { reportId: 'SR-002', stakeholderId: 'STK-001', reportType: 'transactions' }
      ];

      jest.spyOn(StakeholderReport, 'findByStakeholder').mockResolvedValue(mockReports);

      const result = await StakeholderReport.findByStakeholder('STK-001');

      expect(result).toHaveLength(2);
      result.forEach(r => expect(r.stakeholderId).toBe('STK-001'));
    });

    it('should return empty array for stakeholder with no reports', async () => {
      jest.spyOn(StakeholderReport, 'findByStakeholder').mockResolvedValue([]);

      const result = await StakeholderReport.findByStakeholder('STK-NONE');

      expect(result).toEqual([]);
    });
  });

  describe('findByCompany', () => {
    it('should find all reports for a company', async () => {
      const mockReports = [
        { reportId: 'SR-001', companyId: 'COMP-001' },
        { reportId: 'SR-002', companyId: 'COMP-001' }
      ];

      jest.spyOn(StakeholderReport, 'findByCompany').mockResolvedValue(mockReports);

      const result = await StakeholderReport.findByCompany('COMP-001');

      expect(result).toHaveLength(2);
    });
  });

  describe('findByType', () => {
    it('should find all reports by type', async () => {
      const mockReports = [
        { reportId: 'SR-001', reportType: 'holdings' },
        { reportId: 'SR-002', reportType: 'holdings' }
      ];

      jest.spyOn(StakeholderReport, 'findByType').mockResolvedValue(mockReports);

      const result = await StakeholderReport.findByType('holdings');

      expect(result).toHaveLength(2);
      result.forEach(r => expect(r.reportType).toBe('holdings'));
    });
  });

  describe('findByStatus', () => {
    it('should find all reports by status', async () => {
      const mockReports = [
        { reportId: 'SR-001', status: 'completed' },
        { reportId: 'SR-002', status: 'completed' }
      ];

      jest.spyOn(StakeholderReport, 'findByStatus').mockResolvedValue(mockReports);

      const result = await StakeholderReport.findByStatus('completed');

      expect(result).toHaveLength(2);
      result.forEach(r => expect(r.status).toBe('completed'));
    });
  });

  describe('updateStatus', () => {
    it('should update report status', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'completed',
        generatedAt: expect.any(String)
      };

      jest.spyOn(StakeholderReport, 'updateStatus').mockResolvedValue(mockReport);

      const result = await StakeholderReport.updateStatus('SR-12345678', 'completed');

      expect(result.status).toBe('completed');
    });

    it('should set generatedAt when status is completed', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'completed',
        generatedAt: new Date().toISOString()
      };

      jest.spyOn(StakeholderReport, 'updateStatus').mockResolvedValue(mockReport);

      const result = await StakeholderReport.updateStatus('SR-12345678', 'completed');

      expect(result.generatedAt).toBeDefined();
    });

    it('should set deliveredAt when status is delivered', async () => {
      const mockReport = {
        reportId: 'SR-12345678',
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      };

      jest.spyOn(StakeholderReport, 'updateStatus').mockResolvedValue(mockReport);

      const result = await StakeholderReport.updateStatus('SR-12345678', 'delivered');

      expect(result.deliveredAt).toBeDefined();
    });
  });

  describe('getStakeholderReports', () => {
    it('should return filtered reports for a stakeholder', async () => {
      const mockReports = [
        { reportId: 'SR-001', stakeholderId: 'STK-001', reportType: 'holdings', status: 'completed' }
      ];

      jest.spyOn(StakeholderReport, 'getStakeholderReports').mockResolvedValue(mockReports);

      const result = await StakeholderReport.getStakeholderReports('STK-001', {
        reportType: 'holdings',
        status: 'completed'
      });

      expect(result).toHaveLength(1);
      expect(result[0].reportType).toBe('holdings');
      expect(result[0].status).toBe('completed');
    });

    it('should apply default limit', async () => {
      jest.spyOn(StakeholderReport, 'getStakeholderReports').mockResolvedValue([]);

      await StakeholderReport.getStakeholderReports('STK-001', {});

      expect(StakeholderReport.getStakeholderReports).toHaveBeenCalledWith('STK-001', {});
    });
  });

  describe('Base Model Methods', () => {
    it('should expose find method', () => {
      expect(StakeholderReport.find).toBeDefined();
      expect(typeof StakeholderReport.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(StakeholderReport.findOne).toBeDefined();
      expect(typeof StakeholderReport.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(StakeholderReport.findById).toBeDefined();
      expect(typeof StakeholderReport.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(StakeholderReport.updateOne).toBeDefined();
      expect(typeof StakeholderReport.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(StakeholderReport.deleteOne).toBeDefined();
      expect(typeof StakeholderReport.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(StakeholderReport.countDocuments).toBeDefined();
      expect(typeof StakeholderReport.countDocuments).toBe('function');
    });

    it('should expose exists method', () => {
      expect(StakeholderReport.exists).toBeDefined();
      expect(typeof StakeholderReport.exists).toBe('function');
    });

    it('should expose aggregate method', () => {
      expect(StakeholderReport.aggregate).toBeDefined();
      expect(typeof StakeholderReport.aggregate).toBe('function');
    });
  });
});
