jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(), queryTable: jest.fn(), updateRows: jest.fn(),
  deleteRows: jest.fn(), initialize: jest.fn(), projectId: 'mock-project-id'
}));
describe('ReportExecution Model', () => {
  let ReportExecution;
  beforeAll(() => { ReportExecution = require('../../../models/ReportExecution'); });
  describe('Schema Definition', () => {
    it('should export a model object', () => { expect(ReportExecution).toBeDefined(); });
    it('should have required fields defined', () => {
      ['executionId', 'scheduleId', 'startedAt'].forEach(f => {
        expect(ReportExecution.schema[f]).toBeDefined();
        expect(ReportExecution.schema[f].required).toBe(true);
      });
    });
    it('should have executionId as unique field', () => { expect(ReportExecution.schema.executionId.unique).toBe(true); });
    it('should have valid status enum values', () => {
      ['pending', 'running', 'completed', 'failed'].forEach(s => expect(ReportExecution.schema.status.enum).toContain(s));
    });
    it('should have startedAt as date type', () => { expect(ReportExecution.schema.startedAt.type).toBe('date'); });
    it('should have completedAt as date type', () => { expect(ReportExecution.schema.completedAt.type).toBe('date'); });
    it('should have fileUrl as string type', () => { expect(ReportExecution.schema.fileUrl.type).toBe('string'); });
    it('should have fileSize as number type', () => { expect(ReportExecution.schema.fileSize.type).toBe('number'); });
    it('should have error field', () => { expect(ReportExecution.schema.error.type).toBe('string'); });
    it('should have deliveryStatus as array type', () => { expect(ReportExecution.schema.deliveryStatus.type).toBe('array'); });
    it('should have timestamp fields', () => { expect(ReportExecution.schema.createdAt).toBeDefined(); expect(ReportExecution.schema.updatedAt).toBeDefined(); });
  });
  describe('Delivery Status Schema', () => {
    it('should have deliveryStatus defined as array', () => { expect(ReportExecution.schema.deliveryStatus.type).toBe('array'); });
    it('should export DELIVERY_STATUSES constant', () => { ['pending', 'delivered', 'failed'].forEach(s => expect(ReportExecution.DELIVERY_STATUSES).toContain(s)); });
  });
  describe('Default Values', () => {
    it('should default status to pending', () => { expect(ReportExecution.schema.status.default).toBe('pending'); });
    it('should default deliveryStatus to empty array', () => { expect(ReportExecution.schema.deliveryStatus.default).toEqual([]); });
  });
  describe('CRUD Methods', () => {
    it('should have create method', () => { expect(typeof ReportExecution.create).toBe('function'); });
    it('should have find method', () => { expect(typeof ReportExecution.find).toBe('function'); });
    it('should have findOne method', () => { expect(typeof ReportExecution.findOne).toBe('function'); });
    it('should have findById method', () => { expect(typeof ReportExecution.findById).toBe('function'); });
    it('should have updateOne method', () => { expect(typeof ReportExecution.updateOne).toBe('function'); });
    it('should have deleteOne method', () => { expect(typeof ReportExecution.deleteOne).toBe('function'); });
    it('should have deleteMany method', () => { expect(typeof ReportExecution.deleteMany).toBe('function'); });
    it('should have countDocuments method', () => { expect(typeof ReportExecution.countDocuments).toBe('function'); });
  });
  describe('Business Logic', () => {
    it('should calculate duration correctly', () => { expect(ReportExecution.getDuration({ startedAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:05:00.000Z' })).toBe(300000); });
    it('should return null duration when no startedAt', () => { expect(ReportExecution.getDuration({})).toBeNull(); });
    it('should identify complete executions', () => { expect(ReportExecution.isComplete({ status: 'completed' })).toBe(true); expect(ReportExecution.isComplete({ status: 'running' })).toBe(false); });
    it('should calculate delivery success rate', () => { expect(ReportExecution.getDeliverySuccessRate({ deliveryStatus: [{ status: 'delivered' }, { status: 'delivered' }, { status: 'failed' }] })).toBeCloseTo(66.67, 0); });
    it('should return null success rate for empty delivery', () => { expect(ReportExecution.getDeliverySuccessRate({ deliveryStatus: [] })).toBeNull(); });
  });
  describe('Table Name', () => { it('should have correct table name', () => { expect(ReportExecution.tableName).toBe('report_executions'); }); });
});