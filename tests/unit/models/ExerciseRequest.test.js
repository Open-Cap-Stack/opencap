jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(), queryTable: jest.fn(), updateRows: jest.fn(),
  deleteRows: jest.fn(), initialize: jest.fn(), projectId: 'mock-project-id'
}));
describe('ExerciseRequest Model', () => {
  let ExerciseRequest;
  beforeAll(() => { ExerciseRequest = require('../../../models/ExerciseRequest'); });

  describe('Schema Definition', () => {
    it('should export a model', () => { expect(ExerciseRequest).toBeDefined(); });
    it('should have required fields', () => {
      ['exerciseRequestId', 'companyId', 'stakeholderId', 'equityGrantId', 'optionType', 'requestedBy'].forEach(f => {
        expect(ExerciseRequest.schema[f]).toBeDefined();
        expect(ExerciseRequest.schema[f].required).toBe(true);
      });
    });
  });

  describe('Field Validations', () => {
    it('should define exerciseRequestId as unique', () => {
      expect(ExerciseRequest.schema.exerciseRequestId.unique).toBe(true);
    });
    it('should define companyId as required', () => {
      expect(ExerciseRequest.schema.companyId.required).toBe(true);
    });
    it('should define stakeholderId as required', () => {
      expect(ExerciseRequest.schema.stakeholderId.required).toBe(true);
    });
    it('should define equityGrantId as required', () => {
      expect(ExerciseRequest.schema.equityGrantId.required).toBe(true);
    });
    it('should have optionType enum with ISO and NSO', () => {
      expect(ExerciseRequest.schema.optionType.enum).toContain('ISO');
      expect(ExerciseRequest.schema.optionType.enum).toContain('NSO');
    });
    it('should have status enum with workflow states', () => {
      ['pending', 'approved', 'rejected', 'processed', 'completed', 'cancelled'].forEach(s => {
        expect(ExerciseRequest.schema.status.enum).toContain(s);
      });
    });
    it('should have paymentMethod enum', () => {
      ['cash', 'check', 'wire', 'cashless', 'stock_swap'].forEach(m => {
        expect(ExerciseRequest.schema.paymentMethod.enum).toContain(m);
      });
    });
    it('should define exerciseDetails nested object', () => {
      expect(ExerciseRequest.schema.exerciseDetails).toBeDefined();
      expect(ExerciseRequest.schema.exerciseDetails.type).toBe('object');
    });
    it('should define taxWithholding nested object', () => {
      expect(ExerciseRequest.schema.taxWithholding).toBeDefined();
      expect(ExerciseRequest.schema.taxWithholding.type).toBe('object');
    });
    it('should define payment nested object', () => {
      expect(ExerciseRequest.schema.payment).toBeDefined();
      expect(ExerciseRequest.schema.payment.type).toBe('object');
    });
    it('should define certificateData nested object', () => {
      expect(ExerciseRequest.schema.certificateData).toBeDefined();
      expect(ExerciseRequest.schema.certificateData.type).toBe('object');
    });
  });

  describe('Exercise Window Fields', () => {
    it('should define exerciseWindow nested object', () => {
      expect(ExerciseRequest.schema.exerciseWindow).toBeDefined();
      expect(ExerciseRequest.schema.exerciseWindow.type).toBe('object');
    });
  });

  describe('Timestamps', () => {
    it('should have timestamp fields defined', () => {
      expect(ExerciseRequest.schema.createdAt).toBeDefined();
      expect(ExerciseRequest.schema.updatedAt).toBeDefined();
    });
  });

  describe('Partial Exercise Fields', () => {
    it('should have partial exercise tracking fields in exerciseDetails', () => {
      expect(ExerciseRequest.schema.exerciseDetails).toBeDefined();
      expect(ExerciseRequest.schema.exerciseDetails.default).toBeDefined();
      expect(ExerciseRequest.schema.exerciseDetails.default.isPartialExercise).toBe(false);
    });
  });

  describe('Form 3921 Fields', () => {
    it('should have form3921Id reference field', () => {
      expect(ExerciseRequest.schema.form3921Id).toBeDefined();
    });
    it('should have form3921Generated boolean field', () => {
      expect(ExerciseRequest.schema.form3921Generated).toBeDefined();
      expect(ExerciseRequest.schema.form3921Generated.type).toBe('boolean');
    });
    it('should have form3921GeneratedAt date field', () => {
      expect(ExerciseRequest.schema.form3921GeneratedAt).toBeDefined();
      expect(ExerciseRequest.schema.form3921GeneratedAt.type).toBe('date');
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => { expect(typeof ExerciseRequest.create).toBe('function'); });
    it('should have find method', () => { expect(typeof ExerciseRequest.find).toBe('function'); });
    it('should have findOne method', () => { expect(typeof ExerciseRequest.findOne).toBe('function'); });
    it('should have updateOne method', () => { expect(typeof ExerciseRequest.updateOne).toBe('function'); });
    it('should have deleteOne method', () => { expect(typeof ExerciseRequest.deleteOne).toBe('function'); });
  });

  describe('Exported Constants', () => {
    it('should export VALID_STATUSES', () => { expect(ExerciseRequest.VALID_STATUSES).toBeDefined(); });
    it('should export OPTION_TYPES', () => { expect(ExerciseRequest.OPTION_TYPES).toEqual(['ISO', 'NSO', 'RSA', 'RSU']); });
    it('should export PAYMENT_METHODS', () => { expect(ExerciseRequest.PAYMENT_METHODS).toBeDefined(); });
  });

  describe('Table Name', () => {
    it('should have correct table name', () => { expect(ExerciseRequest.tableName).toBe('exercise_requests'); });
  });
});