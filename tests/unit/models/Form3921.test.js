/**
 * Form3921 Model Tests
 * Feature: Issue #71 - IRS Form 3921 Generation
 * Tests creation, calculations, approval workflow, filing, corrections, and queries.
 */

// Mock zerodbService before any require
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');

describe('Form3921 Model', () => {
  let Form3921;

  beforeAll(() => {
    Form3921 = require('../../../models/Form3921');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset clears mockResolvedValueOnce queues; then set safe default
    zerodbService.queryTable.mockReset();
    zerodbService.insertRow.mockReset();
    zerodbService.client.put.mockReset();
    zerodbService.client.put.mockResolvedValue({});
    zerodbService.queryTable.mockResolvedValue({ data: [] });
  });

  // Helpers
  const buildExerciseDetails = (overrides = {}) => ({
    grantDate: '2023-01-15',
    exerciseDate: '2025-06-15',
    exercisePrice: 1.00,
    fmvOnExercise: 5.00,
    sharesTransferred: 1000,
    ...overrides
  });

  const buildFormData = (overrides = {}) => ({
    taxYear: 2025,
    companyId: 'company_123',
    employeeId: 'emp_456',
    transferor: {
      name: 'Acme Corp',
      ein: '12-3456789',
      address: { street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94105', country: 'US' }
    },
    transferee: {
      name: 'Jane Doe',
      ssn: '123-45-6789',
      address: { street: '456 Oak Ave', city: 'SF', state: 'CA', zipCode: '94107', country: 'US' }
    },
    exerciseDetails: buildExerciseDetails(),
    createdBy: 'user_789',
    ...overrides
  });

  const mockInsert = (returnData = {}) => {
    const data = { _id: 'mock-id', ...returnData };
    zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'row_1', row_data: data }] });
    return data;
  };

  const mockFind = (docs = []) => {
    zerodbService.queryTable.mockResolvedValue({
      data: docs.map((d, i) => ({ row_id: `row_${i}`, row_data: d }))
    });
  };

  const mockFindOne = (doc) => {
    if (doc) {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    } else {
      // default already returns { data: [] }, so findOne returns null
      zerodbService.queryTable.mockResolvedValue({ data: [] });
    }
  };

  // -------------------------------------------------------------------
  // Constants
  // -------------------------------------------------------------------
  describe('Exported Constants', () => {
    it('should export FORM_STATUSES', () => {
      expect(Form3921.FORM_STATUSES).toEqual(
        ['draft', 'pending_review', 'approved', 'filed', 'corrected', 'voided']
      );
    });

    it('should export FILING_METHODS', () => {
      expect(Form3921.FILING_METHODS).toEqual(['electronic', 'paper']);
    });
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('should create a form with auto-generated formId', async () => {
      const data = buildFormData();
      mockInsert({ ...data, formId: 'f3921_auto' });

      const result = await Form3921.create(data);

      expect(zerodbService.insertRow).toHaveBeenCalledTimes(1);
      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.formId).toMatch(/^f3921_/);
    });

    it('should keep caller-provided formId', async () => {
      const data = buildFormData({ formId: 'custom_id' });
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.formId).toBe('custom_id');
    });

    it('should calculate totalExerciseCost correctly', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      // exercisePrice=1, shares=1000 => totalExerciseCost=1000
      expect(insertArg.calculations.totalExerciseCost).toBe(1000);
    });

    it('should calculate totalFMVAtExercise correctly', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      // fmvOnExercise=5, shares=1000 => totalFMVAtExercise=5000
      expect(insertArg.calculations.totalFMVAtExercise).toBe(5000);
    });

    it('should calculate bargainElement correctly', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      // (5 - 1) * 1000 = 4000
      expect(insertArg.calculations.bargainElement).toBe(4000);
    });

    it('should calculate amtPreference as max(0, bargainElement)', async () => {
      const data = buildFormData({
        exerciseDetails: buildExerciseDetails({ exercisePrice: 5.00, fmvOnExercise: 3.00 })
      });
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      // (3 - 5) * 1000 = -2000 => max(0, -2000) = 0
      expect(insertArg.calculations.amtPreference).toBe(0);
    });

    it('should default status to draft', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.status).toBe('draft');
    });

    it('should default isCorrection to false', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.isCorrection).toBe(false);
    });

    it('should default copies to all false', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.copies).toEqual({
        copyAFiled: false,
        copyBProvided: false,
        copy1Filed: false,
        copyCSent: false
      });
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const data = buildFormData();
      mockInsert({ ...data });

      await Form3921.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.createdAt).toBeDefined();
      expect(insertArg.updatedAt).toBeDefined();
    });
  });

  // -------------------------------------------------------------------
  // findOneAndUpdate
  // -------------------------------------------------------------------
  describe('findOneAndUpdate', () => {
    it('should recalculate when exerciseDetails changes', async () => {
      const existingDoc = {
        _id: 'doc_1',
        row_id: 'row_1',
        exerciseDetails: buildExerciseDetails(),
        calculations: { totalExerciseCost: 1000, totalFMVAtExercise: 5000, bargainElement: 4000, amtPreference: 4000 }
      };

      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: existingDoc }]
      });

      await Form3921.findOneAndUpdate(
        { _id: 'doc_1' },
        { $set: { exerciseDetails: { fmvOnExercise: 10.00 } } }
      );

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should set updatedAt on update', async () => {
      const existingDoc = { _id: 'doc_1', row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: existingDoc }]
      });

      await Form3921.findOneAndUpdate(
        { _id: 'doc_1' },
        { $set: { notes: 'updated' } }
      );

      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // approve
  // -------------------------------------------------------------------
  describe('approve', () => {
    it('should approve a form in pending_review status', async () => {
      const doc = { _id: 'doc_1', row_id: 'row_1', formId: 'f_1', status: 'pending_review' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });

      const result = await Form3921.approve('f_1', 'admin_user');

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('admin_user');
      expect(result.approvedAt).toBeDefined();
    });

    it('should throw when form not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(Form3921.approve('nonexistent', 'user_1'))
        .rejects.toThrow('Form not found');
    });

    it('should throw when form is not in pending_review status', async () => {
      const doc = { _id: 'doc_1', row_id: 'row_1', status: 'draft' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });

      await expect(Form3921.approve('doc_1', 'user_1'))
        .rejects.toThrow('Form must be in pending_review status to approve');
    });
  });

  // -------------------------------------------------------------------
  // markFiled
  // -------------------------------------------------------------------
  describe('markFiled', () => {
    it('should mark an approved form as filed', async () => {
      const doc = { _id: 'doc_1', row_id: 'row_1', formId: 'f_1', status: 'approved' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });

      const result = await Form3921.markFiled('f_1', 'admin_user', {
        confirmationNumber: 'CONF-123',
        method: 'electronic'
      });

      expect(result.status).toBe('filed');
      expect(result.filing.filedBy).toBe('admin_user');
      expect(result.filing.confirmationNumber).toBe('CONF-123');
      expect(result.filing.method).toBe('electronic');
    });

    it('should throw when form not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(Form3921.markFiled('nonexistent', 'user_1'))
        .rejects.toThrow('Form not found');
    });

    it('should throw when form is not approved', async () => {
      const doc = { _id: 'doc_1', row_id: 'row_1', status: 'draft' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });

      await expect(Form3921.markFiled('doc_1', 'user_1'))
        .rejects.toThrow('Form must be approved before filing');
    });
  });

  // -------------------------------------------------------------------
  // createCorrection
  // -------------------------------------------------------------------
  describe('createCorrection', () => {
    it('should create a correction for an existing form', async () => {
      const originalDoc = {
        _id: 'orig_1',
        row_id: 'row_1',
        formId: 'f_orig',
        status: 'filed',
        taxYear: 2025,
        companyId: 'company_1',
        exerciseDetails: buildExerciseDetails(),
        copies: { copyAFiled: true, copyBProvided: true, copy1Filed: false, copyCSent: false }
      };

      // All findOne calls return the original doc
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: originalDoc }]
      });

      const correctionData = { _id: 'corr_1', formId: 'f_corr', isCorrection: true };
      zerodbService.insertRow.mockResolvedValue({
        data: [{ row_id: 'row_2', row_data: correctionData }]
      });

      const result = await Form3921.createCorrection('f_orig', 'user_1', 'Wrong SSN');

      expect(zerodbService.insertRow).toHaveBeenCalled();
      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.isCorrection).toBe(true);
      expect(insertArg.correctedFormId).toBe('orig_1');
      expect(insertArg.correctionReason).toBe('Wrong SSN');
      expect(insertArg.status).toBe('draft');
      expect(insertArg.copies).toEqual({
        copyAFiled: false,
        copyBProvided: false,
        copy1Filed: false,
        copyCSent: false
      });
    });

    it('should throw when original form not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(Form3921.createCorrection('nonexistent', 'user_1', 'reason'))
        .rejects.toThrow('Original form not found');
    });
  });

  // -------------------------------------------------------------------
  // findByCompanyAndYear
  // -------------------------------------------------------------------
  describe('findByCompanyAndYear', () => {
    it('should return forms sorted by transferee name', async () => {
      const forms = [
        { companyId: 'c1', taxYear: 2025, transferee: { name: 'Zara' } },
        { companyId: 'c1', taxYear: 2025, transferee: { name: 'Alice' } },
        { companyId: 'c1', taxYear: 2025, transferee: { name: 'Mike' } }
      ];
      mockFind(forms);

      const result = await Form3921.findByCompanyAndYear('c1', 2025);

      expect(result[0].transferee.name).toBe('Alice');
      expect(result[1].transferee.name).toBe('Mike');
      expect(result[2].transferee.name).toBe('Zara');
    });

    it('should handle forms with missing transferee name', async () => {
      const forms = [
        { companyId: 'c1', taxYear: 2025, transferee: { name: 'Bob' } },
        { companyId: 'c1', taxYear: 2025, transferee: {} },
        { companyId: 'c1', taxYear: 2025 }
      ];
      mockFind(forms);

      const result = await Form3921.findByCompanyAndYear('c1', 2025);

      expect(result).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------
  // findByEmployeeAndYear
  // -------------------------------------------------------------------
  describe('findByEmployeeAndYear', () => {
    it('should return forms sorted by exercise date ascending', async () => {
      const forms = [
        { employeeId: 'e1', taxYear: 2025, exerciseDetails: { exerciseDate: '2025-09-01T00:00:00Z' } },
        { employeeId: 'e1', taxYear: 2025, exerciseDetails: { exerciseDate: '2025-03-15T00:00:00Z' } },
        { employeeId: 'e1', taxYear: 2025, exerciseDetails: { exerciseDate: '2025-06-20T00:00:00Z' } }
      ];
      mockFind(forms);

      const result = await Form3921.findByEmployeeAndYear('e1', 2025);

      // Should be sorted: March < June < September
      expect(result[0].exerciseDetails.exerciseDate).toBe('2025-03-15T00:00:00Z');
      expect(result[1].exerciseDetails.exerciseDate).toBe('2025-06-20T00:00:00Z');
      expect(result[2].exerciseDetails.exerciseDate).toBe('2025-09-01T00:00:00Z');
    });
  });

  // -------------------------------------------------------------------
  // getPendingFiling
  // -------------------------------------------------------------------
  describe('getPendingFiling', () => {
    it('should query for approved forms', async () => {
      mockFind([{ status: 'approved' }]);

      const result = await Form3921.getPendingFiling('c1', 2025);

      expect(zerodbService.queryTable).toHaveBeenCalled();
      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter).toEqual({ companyId: 'c1', taxYear: 2025, status: 'approved' });
      expect(result).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------
  // getFilingSummary
  // -------------------------------------------------------------------
  describe('getFilingSummary', () => {
    it('should produce correct summary statistics', async () => {
      const forms = [
        {
          status: 'draft',
          employeeId: 'e1',
          calculations: { bargainElement: 1000 },
          exerciseDetails: { sharesTransferred: 100 }
        },
        {
          status: 'filed',
          employeeId: 'e2',
          calculations: { bargainElement: 2000 },
          exerciseDetails: { sharesTransferred: 200 }
        },
        {
          status: 'filed',
          employeeId: 'e1',
          calculations: { bargainElement: 3000 },
          exerciseDetails: { sharesTransferred: 300 }
        }
      ];
      mockFind(forms);

      const summary = await Form3921.getFilingSummary('c1', 2025);

      expect(summary.total).toBe(3);
      expect(summary.byStatus.draft).toBe(1);
      expect(summary.byStatus.filed).toBe(2);
      expect(summary.totalBargainElement).toBe(6000);
      expect(summary.totalShares).toBe(600);
      expect(summary.employeeCount).toBe(2);
    });

    it('should handle empty result', async () => {
      mockFind([]);

      const summary = await Form3921.getFilingSummary('c1', 2025);

      expect(summary.total).toBe(0);
      expect(summary.totalBargainElement).toBe(0);
      expect(summary.totalShares).toBe(0);
      expect(summary.employeeCount).toBe(0);
    });

    it('should handle forms with missing calculations', async () => {
      const forms = [
        { status: 'draft', employeeId: 'e1' }
      ];
      mockFind(forms);

      const summary = await Form3921.getFilingSummary('c1', 2025);

      expect(summary.totalBargainElement).toBe(0);
      expect(summary.totalShares).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // getSpreadPerShare
  // -------------------------------------------------------------------
  describe('getSpreadPerShare', () => {
    it('should return fmvOnExercise minus exercisePrice', () => {
      const doc = { exerciseDetails: { fmvOnExercise: 10, exercisePrice: 2 } };
      expect(Form3921.getSpreadPerShare(doc)).toBe(8);
    });

    it('should return 0 when exerciseDetails is missing', () => {
      expect(Form3921.getSpreadPerShare({})).toBe(0);
    });

    it('should return negative when underwater', () => {
      const doc = { exerciseDetails: { fmvOnExercise: 2, exercisePrice: 10 } };
      expect(Form3921.getSpreadPerShare(doc)).toBe(-8);
    });
  });

  // -------------------------------------------------------------------
  // toJSON
  // -------------------------------------------------------------------
  describe('toJSON', () => {
    it('should add spreadPerShare virtual', () => {
      const doc = { exerciseDetails: { fmvOnExercise: 10, exercisePrice: 3 } };
      const json = Form3921.toJSON(doc);

      expect(json.spreadPerShare).toBe(7);
    });

    it('should set isQualifyingDisposition to null', () => {
      const doc = { exerciseDetails: { fmvOnExercise: 10, exercisePrice: 3 } };
      const json = Form3921.toJSON(doc);

      expect(json.isQualifyingDisposition).toBeNull();
    });

    it('should return null for null doc', () => {
      expect(Form3921.toJSON(null)).toBeNull();
    });
  });
});
