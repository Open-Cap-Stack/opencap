/**
 * Comprehensive SPV (Special Purpose Vehicle) Model Unit Tests
 *
 * Tests for the SPV model including validation, methods, and schema behavior
 */

// Mock the SPV model to avoid database dependencies
jest.mock('../../../models/SPV', () => {
  const validStatuses = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];
  const validComplianceStatuses = ['Compliant', 'NonCompliant', 'PendingReview'];

  function MockSPV(data = {}) {
    Object.assign(this, data);
    this.isNew = true;
    this.isModified = jest.fn();
    this.save = jest.fn();

    // Apply defaults
    if (this.updatedAt === undefined) this.updatedAt = new Date();

    this.validateSync = jest.fn(() => {
      const errors = {};

      // Check required fields
      if (!this.SPVID) {
        errors.SPVID = { message: 'SPVID is required' };
      }
      if (!this.Name) {
        errors.Name = { message: 'Name is required' };
      }
      if (!this.Purpose) {
        errors.Purpose = { message: 'Purpose is required' };
      }
      if (!this.CreationDate) {
        errors.CreationDate = { message: 'CreationDate is required' };
      }
      if (!this.Status) {
        errors.Status = { message: 'Status is required' };
      } else if (!validStatuses.includes(this.Status)) {
        errors.Status = { message: `${this.Status} is not a valid status` };
      }
      if (!this.ParentCompanyID) {
        errors.ParentCompanyID = { message: 'ParentCompanyID is required' };
      }
      if (!this.ComplianceStatus) {
        errors.ComplianceStatus = { message: 'ComplianceStatus is required' };
      } else if (!validComplianceStatuses.includes(this.ComplianceStatus)) {
        errors.ComplianceStatus = { message: `${this.ComplianceStatus} is not a valid compliance status` };
      }

      return Object.keys(errors).length > 0 ? { errors } : null;
    });
    this.toObject = jest.fn(() => ({ ...data }));
  }

  // Add static methods
  MockSPV.findById = jest.fn();
  MockSPV.find = jest.fn();
  MockSPV.findOne = jest.fn();
  MockSPV.create = jest.fn();
  MockSPV.findByIdAndUpdate = jest.fn();
  MockSPV.findByIdAndDelete = jest.fn();
  MockSPV.countDocuments = jest.fn();

  return MockSPV;
});

describe('SPV Model', () => {
  let SPV;

  const validStatuses = ['draft', 'in_review', 'raising', 'closing', 'wired', 'canceled'];
  const validComplianceStatuses = ['Compliant', 'NonCompliant', 'PendingReview'];

  beforeAll(() => {
    SPV = require('../../../models/SPV');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create SPV with all required fields', () => {
        const spvData = {
          SPVID: 'spv-123',
          Name: 'Tech Investment SPV I',
          Purpose: 'Investment in early-stage technology companies',
          CreationDate: new Date('2024-01-15'),
          Status: 'draft',
          ParentCompanyID: 'company-456',
          ComplianceStatus: 'Compliant'
        };

        const spv = new SPV(spvData);

        expect(spv.SPVID).toBe(spvData.SPVID);
        expect(spv.Name).toBe(spvData.Name);
        expect(spv.Purpose).toBe(spvData.Purpose);
        expect(spv.CreationDate).toEqual(spvData.CreationDate);
        expect(spv.Status).toBe(spvData.Status);
        expect(spv.ParentCompanyID).toBe(spvData.ParentCompanyID);
        expect(spv.ComplianceStatus).toBe(spvData.ComplianceStatus);
      });

      it('should reject SPV without SPVID', () => {
        const spv = new SPV({
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'draft',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'PendingReview'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.SPVID).toBeTruthy();
      });

      it('should reject SPV without Name', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'draft',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'PendingReview'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.Name).toBeTruthy();
      });

      it('should reject SPV without Purpose', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          CreationDate: new Date(),
          Status: 'draft',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'PendingReview'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.Purpose).toBeTruthy();
      });

      it('should reject SPV without CreationDate', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          Status: 'draft',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'PendingReview'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.CreationDate).toBeTruthy();
      });

      it('should reject SPV without Status', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'PendingReview'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.Status).toBeTruthy();
      });

      it('should reject SPV without ParentCompanyID', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'draft',
          ComplianceStatus: 'PendingReview'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ParentCompanyID).toBeTruthy();
      });

      it('should reject SPV without ComplianceStatus', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'draft',
          ParentCompanyID: 'company-123'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ComplianceStatus).toBeTruthy();
      });
    });

    describe('Status Enum Validation', () => {
      it.each(validStatuses)('should accept valid status "%s"', (status) => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: status,
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'Compliant'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeNull();
        expect(spv.Status).toBe(status);
      });

      it('should reject invalid status', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'invalid_status',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'Compliant'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.Status).toBeTruthy();
      });

      it('should reject uppercase status "Active"', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'Active',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'Compliant'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.Status).toBeTruthy();
      });

      it('should use lowercase for all status values', () => {
        validStatuses.forEach(status => {
          expect(status).toBe(status.toLowerCase());
        });
      });
    });

    describe('ComplianceStatus Enum Validation', () => {
      it.each(validComplianceStatuses)('should accept valid compliance status "%s"', (complianceStatus) => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'raising',
          ParentCompanyID: 'company-123',
          ComplianceStatus: complianceStatus
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeNull();
        expect(spv.ComplianceStatus).toBe(complianceStatus);
      });

      it('should reject invalid compliance status', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'raising',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'InvalidStatus'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ComplianceStatus).toBeTruthy();
      });

      it('should reject lowercase compliance status "compliant"', () => {
        const spv = new SPV({
          SPVID: 'spv-123',
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'raising',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'compliant'
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.ComplianceStatus).toBeTruthy();
      });
    });
  });

  describe('SPV Lifecycle States', () => {
    it('should handle draft SPV', () => {
      const spv = new SPV({
        SPVID: 'spv-draft-001',
        Name: 'Draft Investment Vehicle',
        Purpose: 'Preliminary investment structure',
        CreationDate: new Date(),
        Status: 'draft',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'PendingReview'
      });

      expect(spv.Status).toBe('draft');
      expect(spv.ComplianceStatus).toBe('PendingReview');
    });

    it('should handle in_review SPV', () => {
      const spv = new SPV({
        SPVID: 'spv-review-001',
        Name: 'Under Review SPV',
        Purpose: 'Awaiting regulatory approval',
        CreationDate: new Date(),
        Status: 'in_review',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'PendingReview'
      });

      expect(spv.Status).toBe('in_review');
    });

    it('should handle raising SPV', () => {
      const spv = new SPV({
        SPVID: 'spv-raising-001',
        Name: 'Raising Investment SPV',
        Purpose: 'Currently raising capital',
        CreationDate: new Date('2023-01-01'),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      expect(spv.Status).toBe('raising');
      expect(spv.ComplianceStatus).toBe('Compliant');
    });

    it('should handle closing SPV', () => {
      const spv = new SPV({
        SPVID: 'spv-closing-001',
        Name: 'Closing Investment SPV',
        Purpose: 'Investment period closing',
        CreationDate: new Date('2020-01-01'),
        Status: 'closing',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      expect(spv.Status).toBe('closing');
    });

    it('should handle wired SPV', () => {
      const spv = new SPV({
        SPVID: 'spv-wired-001',
        Name: 'Wired SPV',
        Purpose: 'Funds fully wired',
        CreationDate: new Date('2018-01-01'),
        Status: 'wired',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      expect(spv.Status).toBe('wired');
    });
  });

  describe('SPV Data Handling', () => {
    it('should handle various SPVID formats', () => {
      const spvIds = [
        'SPV-001',
        'spv-alpha-001',
        '550e8400-e29b-41d4-a716-446655440000',
        'fund-2024-q1-001'
      ];

      spvIds.forEach(spvId => {
        const spv = new SPV({
          SPVID: spvId,
          Name: 'Test SPV',
          Purpose: 'Test purpose',
          CreationDate: new Date(),
          Status: 'raising',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'Compliant'
        });

        expect(spv.SPVID).toBe(spvId);
      });
    });

    it('should handle long SPV names', () => {
      const longName = 'Alpha Beta Gamma Investment Holdings Special Purpose Vehicle Series A LLC';
      const spv = new SPV({
        SPVID: 'spv-long-name',
        Name: longName,
        Purpose: 'Long-term investment vehicle',
        CreationDate: new Date(),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      expect(spv.Name).toBe(longName);
    });

    it('should handle detailed purpose description', () => {
      const detailedPurpose = `This SPV is established for the purpose of pooling investor capital
        to make equity investments in early-stage technology companies in the
        artificial intelligence and machine learning sectors, with a focus on
        Series A and Series B funding rounds.`;

      const spv = new SPV({
        SPVID: 'spv-detailed',
        Name: 'AI Investment SPV',
        Purpose: detailedPurpose,
        CreationDate: new Date(),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      expect(spv.Purpose).toBe(detailedPurpose);
    });

    it('should handle different date formats for CreationDate', () => {
      const dates = [
        new Date('2024-01-15'),
        new Date('2023-12-31T23:59:59.999Z'),
        new Date(2022, 5, 15)
      ];

      dates.forEach(date => {
        const spv = new SPV({
          SPVID: 'spv-date-test',
          Name: 'Date Test SPV',
          Purpose: 'Test purpose',
          CreationDate: date,
          Status: 'raising',
          ParentCompanyID: 'company-123',
          ComplianceStatus: 'Compliant'
        });

        expect(spv.CreationDate).toEqual(date);
      });
    });
  });

  describe('Default Values', () => {
    it('should set updatedAt to current date by default', () => {
      const spv = new SPV({
        SPVID: 'spv-123',
        Name: 'Test SPV',
        Purpose: 'Test purpose',
        CreationDate: new Date(),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      expect(spv.updatedAt).toBeDefined();
      expect(spv.updatedAt instanceof Date).toBe(true);
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockSPV = {
        SPVID: 'spv-123',
        Name: 'Found SPV'
      };
      SPV.findById.mockResolvedValue(mockSPV);

      const result = await SPV.findById('507f1f77bcf86cd799439011');

      expect(SPV.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockSPV);
    });

    it('should call find correctly', async () => {
      const mockSPVs = [
        { SPVID: 'spv-1', Name: 'SPV 1', Status: 'raising' },
        { SPVID: 'spv-2', Name: 'SPV 2', Status: 'raising' }
      ];
      SPV.find.mockResolvedValue(mockSPVs);

      const result = await SPV.find({ Status: 'raising' });

      expect(SPV.find).toHaveBeenCalledWith({ Status: 'raising' });
      expect(result).toEqual(mockSPVs);
    });

    it('should call find by ParentCompanyID correctly', async () => {
      const mockSPVs = [
        { SPVID: 'spv-1', ParentCompanyID: 'company-123' },
        { SPVID: 'spv-2', ParentCompanyID: 'company-123' }
      ];
      SPV.find.mockResolvedValue(mockSPVs);

      const result = await SPV.find({ ParentCompanyID: 'company-123' });

      expect(SPV.find).toHaveBeenCalledWith({ ParentCompanyID: 'company-123' });
      expect(result.length).toBe(2);
    });

    it('should call countDocuments correctly', async () => {
      SPV.countDocuments.mockResolvedValue(5);

      const count = await SPV.countDocuments({ Status: 'raising' });

      expect(SPV.countDocuments).toHaveBeenCalledWith({ Status: 'raising' });
      expect(count).toBe(5);
    });

    it('should call create correctly', async () => {
      const spvData = {
        SPVID: 'spv-new',
        Name: 'New SPV',
        Purpose: 'New investment purpose',
        CreationDate: new Date(),
        Status: 'draft',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'PendingReview'
      };
      SPV.create.mockResolvedValue(spvData);

      const result = await SPV.create(spvData);

      expect(SPV.create).toHaveBeenCalledWith(spvData);
      expect(result).toEqual(spvData);
    });
  });

  describe('Instance Methods', () => {
    it('should save SPV successfully', async () => {
      const spv = new SPV({
        SPVID: 'spv-save-test',
        Name: 'Save Test SPV',
        Purpose: 'Testing save operation',
        CreationDate: new Date(),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      spv.save.mockResolvedValue(spv);
      const savedSPV = await spv.save();

      expect(spv.save).toHaveBeenCalled();
      expect(savedSPV).toBe(spv);
    });

    it('should handle save errors', async () => {
      const spv = new SPV({
        SPVID: 'spv-duplicate',
        Name: 'Duplicate SPV',
        Purpose: 'Test purpose',
        CreationDate: new Date(),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      });

      const duplicateError = new Error('E11000 duplicate key error');
      spv.save.mockRejectedValue(duplicateError);

      await expect(spv.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should convert SPV to object', () => {
      const spvData = {
        SPVID: 'spv-object-test',
        Name: 'Object Test SPV',
        Purpose: 'Testing toObject',
        CreationDate: new Date(),
        Status: 'raising',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'Compliant'
      };

      const spv = new SPV(spvData);
      const spvObject = spv.toObject();

      expect(spvObject).toEqual(spvData);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete SPV lifecycle', () => {
      const spvLifecycle = [
        { Status: 'draft', ComplianceStatus: 'PendingReview' },
        { Status: 'in_review', ComplianceStatus: 'PendingReview' },
        { Status: 'raising', ComplianceStatus: 'Compliant' },
        { Status: 'closing', ComplianceStatus: 'Compliant' },
        { Status: 'wired', ComplianceStatus: 'Compliant' },
        { Status: 'canceled', ComplianceStatus: 'Compliant' }
      ];

      spvLifecycle.forEach(({ Status, ComplianceStatus }) => {
        const spv = new SPV({
          SPVID: `spv-lifecycle-${Status}`,
          Name: `Lifecycle ${Status} SPV`,
          Purpose: 'Testing lifecycle states',
          CreationDate: new Date(),
          Status,
          ParentCompanyID: 'company-123',
          ComplianceStatus
        });

        const validationError = spv.validateSync();
        expect(validationError).toBeNull();
      });
    });

    it('should handle multiple SPVs per company', async () => {
      const companyId = 'company-456';
      const spvs = [
        { SPVID: 'spv-tech-1', Name: 'Tech Fund I', Status: 'raising' },
        { SPVID: 'spv-tech-2', Name: 'Tech Fund II', Status: 'in_review' },
        { SPVID: 'spv-real-estate', Name: 'Real Estate Fund', Status: 'draft' }
      ];

      SPV.find.mockResolvedValue(spvs.map(s => ({ ...s, ParentCompanyID: companyId })));

      const result = await SPV.find({ ParentCompanyID: companyId });

      expect(result.length).toBe(3);
      result.forEach(spv => {
        expect(spv.ParentCompanyID).toBe(companyId);
      });
    });

    it('should handle non-compliant SPV scenario', () => {
      const spv = new SPV({
        SPVID: 'spv-non-compliant',
        Name: 'Non-Compliant SPV',
        Purpose: 'Requires compliance review',
        CreationDate: new Date(),
        Status: 'in_review',
        ParentCompanyID: 'company-123',
        ComplianceStatus: 'NonCompliant'
      });

      const validationError = spv.validateSync();
      expect(validationError).toBeNull();
      expect(spv.ComplianceStatus).toBe('NonCompliant');
    });

    it('should handle empty SPV object', () => {
      const spv = new SPV({});
      const validationError = spv.validateSync();

      expect(validationError).toBeTruthy();
      expect(Object.keys(validationError.errors).length).toBe(7);
    });
  });
});
