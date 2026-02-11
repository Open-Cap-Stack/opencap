/**
 * Comprehensive Stakeholder Model Unit Tests
 * Tests for the ZeroDB-migrated Stakeholder model
 */
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id'
}));

const zerodbService = require('../../../services/zerodbService');
const Stakeholder = require('../../../models/Stakeholder');

describe('Stakeholder Model (ZeroDB)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('Model Structure', () => {
    it('should have correct table name', () => { expect(Stakeholder.tableName).toBe('stakeholders'); });
    it('should have schema defined with required fields', () => {
      expect(Stakeholder.schema).toBeDefined();
      expect(Stakeholder.schema._id).toBeDefined();
      expect(Stakeholder.schema.stakeholderId).toBeDefined();
      expect(Stakeholder.schema.name).toBeDefined();
      expect(Stakeholder.schema.email).toBeDefined();
      expect(Stakeholder.schema.role).toBeDefined();
    });
    it('should have required fields marked as required', () => {
      expect(Stakeholder.schema._id.required).toBe(true);
      expect(Stakeholder.schema.stakeholderId.required).toBe(true);
      expect(Stakeholder.schema.name.required).toBe(true);
      expect(Stakeholder.schema.email.required).toBe(true);
      expect(Stakeholder.schema.role.required).toBe(true);
    });
    it('should have optional fields defined', () => {
      expect(Stakeholder.schema.phone).toBeDefined();
      expect(Stakeholder.schema.equity).toBeDefined();
      expect(Stakeholder.schema.shares).toBeDefined();
      expect(Stakeholder.schema.type).toBeDefined();
      expect(Stakeholder.schema.status).toBeDefined();
      expect(Stakeholder.schema.location).toBeDefined();
      expect(Stakeholder.schema.department).toBeDefined();
      expect(Stakeholder.schema.vestingSchedule).toBeDefined();
      expect(Stakeholder.schema.companyId).toBeDefined();
      expect(Stakeholder.schema.projectId).toBeDefined();
      expect(Stakeholder.schema.userId).toBeDefined();
    });
  });

  describe('CRUD Methods', () => {
    describe('create', () => {
      it('should create a stakeholder with provided data', async () => {
        const stakeholderData = { stakeholderId: 'stake-123', name: 'John Doe', email: 'john@example.com', role: 'investor', companyId: '507f1f77bcf86cd799439011', projectId: 'proj-456' };
        zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { _id: 'uuid-123', ...stakeholderData } }] });
        const result = await Stakeholder.create(stakeholderData);
        expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ stakeholderId: 'stake-123', name: 'John Doe' }));
        expect(result).toBeDefined();
      });
      it('should generate stakeholderId if not provided', async () => {
        const stakeholderData = { name: 'John Doe', email: 'john@example.com', role: 'investor', companyId: '507f1f77bcf86cd799439011' };
        zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { ...stakeholderData, stakeholderId: 'stakeholder_uuid-gen' } }] });
        await Stakeholder.create(stakeholderData);
        expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ stakeholderId: expect.stringMatching(/^stakeholder_/) }));
      });
    });

    describe('find', () => {
      it('should find stakeholders matching query', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: { stakeholderId: 'stake-1', role: 'Investor' } }, { row_data: { stakeholderId: 'stake-2', role: 'Investor' } }] });
        const result = await Stakeholder.find({ role: 'Investor' });
        expect(result.length).toBe(2);
      });
      it('should return empty array when no stakeholders match', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        const result = await Stakeholder.find({ role: 'NonExistentRole' });
        expect(result).toEqual([]);
      });
    });

    describe('findOne', () => {
      it('should find a single stakeholder', async () => {
        const mockStakeholder = { stakeholderId: 'stake-123', name: 'Found Stakeholder', role: 'Investor' };
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: mockStakeholder }] });
        const result = await Stakeholder.findOne({ stakeholderId: 'stake-123' });
        expect(result).toEqual(mockStakeholder);
      });
      it('should return null when stakeholder not found', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        const result = await Stakeholder.findOne({ stakeholderId: 'non-existent' });
        expect(result).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find stakeholder by _id', async () => {
        const mockStakeholder = { _id: 'uuid-123', stakeholderId: 'stake-123', name: 'Found Stakeholder' };
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: mockStakeholder }] });
        const result = await Stakeholder.findById('uuid-123');
        expect(result).toEqual(mockStakeholder);
      });
    });

    describe('updateOne', () => {
      it('should update a stakeholder', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: { _id: 'uuid-123', stakeholderId: 'stake-123' } }] });
        zerodbService.updateRows.mockResolvedValue({ modified_count: 1, matched_count: 1 });
        const result = await Stakeholder.updateOne({ stakeholderId: 'stake-123' }, { $set: { name: 'Updated Name' } });
        expect(result.modifiedCount).toBe(1);
      });
    });

    describe('findOneAndUpdate', () => {
      it('should find and update a stakeholder', async () => {
        const original = { _id: 'uuid-123', stakeholderId: 'stake-123', name: 'Original Name' };
        const updated = { ...original, name: 'Updated Name' };
        zerodbService.queryTable
          .mockResolvedValueOnce({ data: [{ row_data: original }] })
          .mockResolvedValueOnce({ data: [{ row_data: updated }] });
        zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
        const result = await Stakeholder.findOneAndUpdate({ stakeholderId: 'stake-123' }, { $set: { name: 'Updated Name' } }, { new: true });
        expect(result).toBeDefined();
      });
      it('should return null when stakeholder not found', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        const result = await Stakeholder.findOneAndUpdate({ stakeholderId: 'non-existent' }, { $set: { name: 'Updated Name' } });
        expect(result).toBeNull();
      });
    });

    describe('findByIdAndUpdate', () => {
      it('should find by ID and update', async () => {
        const mockStakeholder = { _id: 'uuid-123', stakeholderId: 'stake-123', name: 'Original Name' };
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: mockStakeholder }] });
        zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
        const result = await Stakeholder.findByIdAndUpdate('uuid-123', { $set: { name: 'Updated Name' } });
        expect(result).toEqual(mockStakeholder);
      });
    });

    describe('deleteOne', () => {
      it('should delete a stakeholder', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: { stakeholderId: 'stake-123' } }] });
        zerodbService.deleteRows.mockResolvedValue({ deleted_count: 1 });
        const result = await Stakeholder.deleteOne({ stakeholderId: 'stake-123' });
        expect(result.deletedCount).toBe(1);
      });
    });

    describe('findOneAndDelete', () => {
      it('should find and delete a stakeholder', async () => {
        const mockStakeholder = { _id: 'uuid-123', stakeholderId: 'stake-123', name: 'To Delete' };
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: mockStakeholder }] });
        zerodbService.deleteRows.mockResolvedValue({ deleted_count: 1 });
        const result = await Stakeholder.findOneAndDelete({ stakeholderId: 'stake-123' });
        expect(result).toEqual(mockStakeholder);
      });
      it('should return null when stakeholder not found', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        const result = await Stakeholder.findOneAndDelete({ stakeholderId: 'non-existent' });
        expect(result).toBeNull();
      });
    });

    describe('findByIdAndDelete', () => {
      it('should find by ID and delete', async () => {
        const mockStakeholder = { _id: 'uuid-123', stakeholderId: 'stake-123', name: 'To Delete' };
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: mockStakeholder }] });
        zerodbService.deleteRows.mockResolvedValue({ deleted_count: 1 });
        const result = await Stakeholder.findByIdAndDelete('uuid-123');
        expect(result).toEqual(mockStakeholder);
      });
    });

    describe('countDocuments', () => {
      it('should count documents matching query', async () => {
        zerodbService.queryTable.mockResolvedValue({ total: 5, data: [] });
        const count = await Stakeholder.countDocuments({ projectId: 'proj-123' });
        expect(count).toBe(5);
      });
    });

    describe('exists', () => {
      it('should return true if documents exist', async () => {
        zerodbService.queryTable.mockResolvedValue({ total: 1, data: [] });
        const exists = await Stakeholder.exists({ stakeholderId: 'stake-123' });
        expect(exists).toBe(true);
      });
      it('should return false if no documents exist', async () => {
        zerodbService.queryTable.mockResolvedValue({ total: 0, data: [] });
        const exists = await Stakeholder.exists({ stakeholderId: 'non-existent' });
        expect(exists).toBe(false);
      });
    });

    describe('distinct', () => {
      it('should return distinct values for a field', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: { role: 'Investor' } }, { row_data: { role: 'Founder' } }, { row_data: { role: 'Investor' } }, { row_data: { role: 'Employee' } }] });
        const result = await Stakeholder.distinct('role');
        expect(result).toContain('Investor');
        expect(result).toContain('Founder');
        expect(result).toContain('Employee');
        expect(result.length).toBe(3);
      });
    });
  });

  describe('Custom Methods', () => {
    describe('findByStakeholderId', () => {
      it('should find stakeholder by stakeholderId', async () => {
        const mockStakeholder = { stakeholderId: 'stake-123', name: 'Test Stakeholder' };
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: mockStakeholder }] });
        const result = await Stakeholder.findByStakeholderId('stake-123');
        expect(result).toEqual(mockStakeholder);
      });
    });
    describe('findByProject', () => {
      it('should find stakeholders by projectId', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: { stakeholderId: 'stake-1', projectId: 'proj-123' } }, { row_data: { stakeholderId: 'stake-2', projectId: 'proj-123' } }] });
        const result = await Stakeholder.findByProject('proj-123');
        expect(result.length).toBe(2);
      });
    });
    describe('findByRole', () => {
      it('should find stakeholders by role', async () => {
        zerodbService.queryTable.mockResolvedValue({ data: [{ row_data: { stakeholderId: 'stake-1', role: 'Investor' } }, { row_data: { stakeholderId: 'stake-2', role: 'Investor' } }] });
        const result = await Stakeholder.findByRole('Investor');
        expect(result.length).toBe(2);
      });
    });
  });

  describe('Stakeholder Roles', () => {
    it('should handle investor role', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { role: 'investor' } }] });
      await Stakeholder.create({ stakeholderId: 'stake-inv-123', name: 'Investor Name', email: 'investor@example.com', role: 'investor', companyId: '507f1f77bcf86cd799439011' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ role: 'investor' }));
    });
    it('should handle founder role', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { role: 'founder' } }] });
      await Stakeholder.create({ stakeholderId: 'stake-founder-123', name: 'Founder Name', email: 'founder@example.com', role: 'founder', companyId: '507f1f77bcf86cd799439011' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ role: 'founder' }));
    });
    it('should handle employee role', async () => {
      zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { role: 'employee' } }] });
      await Stakeholder.create({ stakeholderId: 'stake-emp-123', name: 'Employee Name', email: 'employee@example.com', role: 'employee', companyId: '507f1f77bcf86cd799439011' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ role: 'employee' }));
    });
  });

  describe('Data Handling', () => {
    it('should handle full name with multiple words', async () => {
      const fullName = 'Dr. John Michael Doe Jr.';
      zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { name: fullName } }] });
      await Stakeholder.create({ stakeholderId: 'stake-123', name: fullName, email: 'dr.john@example.com', role: 'advisor', companyId: '507f1f77bcf86cd799439011' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ name: fullName }));
    });
    it('should handle names with special characters', async () => {
      const specialName = "Mary O'Brien-Smith";
      zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { name: specialName } }] });
      await Stakeholder.create({ stakeholderId: 'stake-special-123', name: specialName, email: 'mary@example.com', role: 'investor', companyId: '507f1f77bcf86cd799439011' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ name: specialName }));
    });
    it('should handle UUID-style stakeholderId', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'uuid-123', row_data: { stakeholderId: uuidId } }] });
      await Stakeholder.create({ stakeholderId: uuidId, name: 'UUID Stakeholder', email: 'uuid@example.com', role: 'investor', companyId: '507f1f77bcf86cd799439011' });
      expect(zerodbService.insertRow).toHaveBeenCalledWith('stakeholders', expect.objectContaining({ stakeholderId: uuidId }));
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple stakeholders for same project', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [
        { row_data: { stakeholderId: 'stake-1', name: 'CEO', role: 'Founder', projectId: 'proj-123' } },
        { row_data: { stakeholderId: 'stake-2', name: 'CTO', role: 'Founder', projectId: 'proj-123' } },
        { row_data: { stakeholderId: 'stake-3', name: 'Investor A', role: 'Investor', projectId: 'proj-123' } }
      ] });
      const result = await Stakeholder.find({ projectId: 'proj-123' });
      expect(result.length).toBe(3);
      expect(result.filter(s => s.role === 'Founder').length).toBe(2);
      expect(result.filter(s => s.role === 'Investor').length).toBe(1);
    });
    it('should handle aggregate operations', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [
        { row_data: { stakeholderId: 'stake-1', role: 'Investor', shares: '1000' } },
        { row_data: { stakeholderId: 'stake-2', role: 'Founder', shares: '5000' } }
      ] });
      const result = await Stakeholder.aggregate([{ $match: { role: 'Investor' } }]);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});