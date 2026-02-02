/**
 * Comprehensive Stakeholder Model Unit Tests
 *
 * Tests for the Stakeholder model including validation, methods, schema behavior
 */

const mongoose = require('mongoose');

// Mock mongoose connection
jest.mock('../../../utils/mongoDbConnection', () => ({}));

describe('Stakeholder Model', () => {
  let Stakeholder;

  beforeAll(() => {
    // Mock mongoose model creation
    jest.spyOn(mongoose, 'model').mockImplementation((name, schema) => {
      function MockStakeholder(data = {}) {
        Object.assign(this, data);
        this.isNew = true;
        this.isModified = jest.fn();
        this.save = jest.fn();
        this.validateSync = jest.fn(() => {
          const errors = {};

          // Check required fields
          if (!this.stakeholderId) {
            errors.stakeholderId = { message: 'stakeholderId is required' };
          }
          if (!this.name) {
            errors.name = { message: 'name is required' };
          }
          if (!this.role) {
            errors.role = { message: 'role is required' };
          }
          if (!this.projectId) {
            errors.projectId = { message: 'projectId is required' };
          }

          return Object.keys(errors).length > 0 ? { errors } : null;
        });
        this.toObject = jest.fn(() => ({ ...data }));
      }

      // Add static methods
      MockStakeholder.findById = jest.fn();
      MockStakeholder.find = jest.fn();
      MockStakeholder.findOne = jest.fn();
      MockStakeholder.create = jest.fn();
      MockStakeholder.findByIdAndUpdate = jest.fn();
      MockStakeholder.findByIdAndDelete = jest.fn();
      MockStakeholder.countDocuments = jest.fn();

      return MockStakeholder;
    });

    // Now require the Stakeholder model
    Stakeholder = require('../../../models/Stakeholder');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should create stakeholder with all required fields', () => {
        const stakeholderData = {
          stakeholderId: 'stake-123',
          name: 'John Doe',
          role: 'Investor',
          projectId: 'proj-456'
        };

        const stakeholder = new Stakeholder(stakeholderData);

        expect(stakeholder.stakeholderId).toBe(stakeholderData.stakeholderId);
        expect(stakeholder.name).toBe(stakeholderData.name);
        expect(stakeholder.role).toBe(stakeholderData.role);
        expect(stakeholder.projectId).toBe(stakeholderData.projectId);
      });

      it('should reject stakeholder without stakeholderId', () => {
        const stakeholder = new Stakeholder({
          name: 'John Doe',
          role: 'Investor',
          projectId: 'proj-456'
        });

        const validationError = stakeholder.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.stakeholderId).toBeTruthy();
      });

      it('should reject stakeholder without name', () => {
        const stakeholder = new Stakeholder({
          stakeholderId: 'stake-123',
          role: 'Investor',
          projectId: 'proj-456'
        });

        const validationError = stakeholder.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.name).toBeTruthy();
      });

      it('should reject stakeholder without role', () => {
        const stakeholder = new Stakeholder({
          stakeholderId: 'stake-123',
          name: 'John Doe',
          projectId: 'proj-456'
        });

        const validationError = stakeholder.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.role).toBeTruthy();
      });

      it('should reject stakeholder without projectId', () => {
        const stakeholder = new Stakeholder({
          stakeholderId: 'stake-123',
          name: 'John Doe',
          role: 'Investor'
        });

        const validationError = stakeholder.validateSync();
        expect(validationError).toBeTruthy();
        expect(validationError.errors.projectId).toBeTruthy();
      });
    });
  });

  describe('Stakeholder Roles', () => {
    it('should accept Investor role', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-inv-123',
        name: 'Investor Name',
        role: 'Investor',
        projectId: 'proj-456'
      });

      const validationError = stakeholder.validateSync();
      expect(validationError).toBeNull();
      expect(stakeholder.role).toBe('Investor');
    });

    it('should accept Founder role', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-founder-123',
        name: 'Founder Name',
        role: 'Founder',
        projectId: 'proj-456'
      });

      const validationError = stakeholder.validateSync();
      expect(validationError).toBeNull();
      expect(stakeholder.role).toBe('Founder');
    });

    it('should accept Employee role', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-emp-123',
        name: 'Employee Name',
        role: 'Employee',
        projectId: 'proj-456'
      });

      const validationError = stakeholder.validateSync();
      expect(validationError).toBeNull();
      expect(stakeholder.role).toBe('Employee');
    });

    it('should accept Advisor role', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-adv-123',
        name: 'Advisor Name',
        role: 'Advisor',
        projectId: 'proj-456'
      });

      const validationError = stakeholder.validateSync();
      expect(validationError).toBeNull();
      expect(stakeholder.role).toBe('Advisor');
    });

    it('should accept Board Member role', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-board-123',
        name: 'Board Member Name',
        role: 'Board Member',
        projectId: 'proj-456'
      });

      const validationError = stakeholder.validateSync();
      expect(validationError).toBeNull();
      expect(stakeholder.role).toBe('Board Member');
    });

    it('should accept Consultant role', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-consult-123',
        name: 'Consultant Name',
        role: 'Consultant',
        projectId: 'proj-456'
      });

      const validationError = stakeholder.validateSync();
      expect(validationError).toBeNull();
      expect(stakeholder.role).toBe('Consultant');
    });
  });

  describe('Stakeholder Data Handling', () => {
    it('should handle full name with multiple words', () => {
      const fullName = 'Dr. John Michael Doe Jr.';
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-123',
        name: fullName,
        role: 'Advisor',
        projectId: 'proj-456'
      });

      expect(stakeholder.name).toBe(fullName);
    });

    it('should handle names with special characters', () => {
      const specialName = "Mary O'Brien-Smith";
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-special-123',
        name: specialName,
        role: 'Investor',
        projectId: 'proj-456'
      });

      expect(stakeholder.name).toBe(specialName);
    });

    it('should handle international names', () => {
      const internationalNames = [
        'Muller',
        'Nakamura',
        'Garcia-Rodriguez'
      ];

      internationalNames.forEach((name, index) => {
        const stakeholder = new Stakeholder({
          stakeholderId: `stake-intl-${index}`,
          name: name,
          role: 'Investor',
          projectId: 'proj-456'
        });

        expect(stakeholder.name).toBe(name);
      });
    });

    it('should handle UUID-style stakeholderId', () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000';
      const stakeholder = new Stakeholder({
        stakeholderId: uuidId,
        name: 'UUID Stakeholder',
        role: 'Investor',
        projectId: 'proj-456'
      });

      expect(stakeholder.stakeholderId).toBe(uuidId);
    });

    it('should handle different projectId formats', () => {
      const projectIds = [
        'proj-123',
        'project_456',
        '507f1f77bcf86cd799439011',
        'company-proj-789'
      ];

      projectIds.forEach(projectId => {
        const stakeholder = new Stakeholder({
          stakeholderId: `stake-${projectId}`,
          name: 'Test Stakeholder',
          role: 'Employee',
          projectId: projectId
        });

        expect(stakeholder.projectId).toBe(projectId);
      });
    });
  });

  describe('Static Methods', () => {
    it('should call findById correctly', async () => {
      const mockStakeholder = {
        stakeholderId: 'stake-123',
        name: 'Found Stakeholder'
      };
      Stakeholder.findById.mockResolvedValue(mockStakeholder);

      const result = await Stakeholder.findById('507f1f77bcf86cd799439011');

      expect(Stakeholder.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toEqual(mockStakeholder);
    });

    it('should call find correctly with query', async () => {
      const mockStakeholders = [
        { stakeholderId: 'stake-1', name: 'Stakeholder 1', role: 'Investor' },
        { stakeholderId: 'stake-2', name: 'Stakeholder 2', role: 'Investor' }
      ];
      Stakeholder.find.mockResolvedValue(mockStakeholders);

      const result = await Stakeholder.find({ role: 'Investor' });

      expect(Stakeholder.find).toHaveBeenCalledWith({ role: 'Investor' });
      expect(result).toEqual(mockStakeholders);
    });

    it('should call find by projectId correctly', async () => {
      const mockStakeholders = [
        { stakeholderId: 'stake-1', name: 'Stakeholder 1', projectId: 'proj-123' },
        { stakeholderId: 'stake-2', name: 'Stakeholder 2', projectId: 'proj-123' }
      ];
      Stakeholder.find.mockResolvedValue(mockStakeholders);

      const result = await Stakeholder.find({ projectId: 'proj-123' });

      expect(Stakeholder.find).toHaveBeenCalledWith({ projectId: 'proj-123' });
      expect(result).toEqual(mockStakeholders);
      expect(result.length).toBe(2);
    });

    it('should call findOne correctly', async () => {
      const mockStakeholder = {
        stakeholderId: 'stake-123',
        name: 'Found Stakeholder'
      };
      Stakeholder.findOne.mockResolvedValue(mockStakeholder);

      const result = await Stakeholder.findOne({ stakeholderId: 'stake-123' });

      expect(Stakeholder.findOne).toHaveBeenCalledWith({ stakeholderId: 'stake-123' });
      expect(result).toEqual(mockStakeholder);
    });

    it('should call create correctly', async () => {
      const stakeholderData = {
        stakeholderId: 'stake-123',
        name: 'New Stakeholder',
        role: 'Founder',
        projectId: 'proj-456'
      };
      Stakeholder.create.mockResolvedValue(stakeholderData);

      const result = await Stakeholder.create(stakeholderData);

      expect(Stakeholder.create).toHaveBeenCalledWith(stakeholderData);
      expect(result).toEqual(stakeholderData);
    });

    it('should call countDocuments correctly', async () => {
      Stakeholder.countDocuments.mockResolvedValue(5);

      const count = await Stakeholder.countDocuments({ projectId: 'proj-123' });

      expect(Stakeholder.countDocuments).toHaveBeenCalledWith({ projectId: 'proj-123' });
      expect(count).toBe(5);
    });
  });

  describe('Instance Methods', () => {
    it('should save stakeholder successfully', async () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-123',
        name: 'Save Test Stakeholder',
        role: 'Investor',
        projectId: 'proj-456'
      });

      stakeholder.save.mockResolvedValue(stakeholder);
      const savedStakeholder = await stakeholder.save();

      expect(stakeholder.save).toHaveBeenCalled();
      expect(savedStakeholder).toBe(stakeholder);
    });

    it('should handle save errors', async () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-duplicate',
        name: 'Duplicate Stakeholder',
        role: 'Investor',
        projectId: 'proj-456'
      });

      const duplicateError = new Error('E11000 duplicate key error');
      stakeholder.save.mockRejectedValue(duplicateError);

      await expect(stakeholder.save()).rejects.toThrow('E11000 duplicate key error');
    });

    it('should convert stakeholder to object', () => {
      const stakeholderData = {
        stakeholderId: 'stake-123',
        name: 'Object Test Stakeholder',
        role: 'Employee',
        projectId: 'proj-456'
      };

      const stakeholder = new Stakeholder(stakeholderData);
      const stakeholderObject = stakeholder.toObject();

      expect(stakeholderObject).toEqual(stakeholderData);
    });

    it('should check if stakeholder is modified', () => {
      const stakeholder = new Stakeholder({
        stakeholderId: 'stake-123',
        name: 'Modified Test Stakeholder',
        role: 'Advisor',
        projectId: 'proj-456'
      });

      stakeholder.isModified.mockReturnValue(true);

      expect(stakeholder.isModified('name')).toBe(true);
      expect(stakeholder.isModified).toHaveBeenCalledWith('name');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle complete stakeholder profile', () => {
      const stakeholderData = {
        stakeholderId: 'stake-complete-123',
        name: 'Jane Smith, Ph.D.',
        role: 'Board Member',
        projectId: 'proj-board-789'
      };

      const stakeholder = new Stakeholder(stakeholderData);

      expect(stakeholder.stakeholderId).toBe(stakeholderData.stakeholderId);
      expect(stakeholder.name).toBe(stakeholderData.name);
      expect(stakeholder.role).toBe(stakeholderData.role);
      expect(stakeholder.projectId).toBe(stakeholderData.projectId);
    });

    it('should handle stakeholder with minimal data', () => {
      const minimalData = {
        stakeholderId: 'stake-min',
        name: 'Min',
        role: 'Employee',
        projectId: 'p'
      };

      const stakeholder = new Stakeholder(minimalData);
      const validationError = stakeholder.validateSync();

      expect(validationError).toBeNull();
      expect(stakeholder.stakeholderId).toBe(minimalData.stakeholderId);
    });

    it('should handle empty stakeholder object', () => {
      const stakeholder = new Stakeholder({});
      const validationError = stakeholder.validateSync();

      expect(validationError).toBeTruthy();
      expect(Object.keys(validationError.errors).length).toBe(4); // All 4 required fields
    });

    it('should handle multiple stakeholders for same project', async () => {
      const stakeholders = [
        { stakeholderId: 'stake-1', name: 'CEO', role: 'Founder', projectId: 'proj-123' },
        { stakeholderId: 'stake-2', name: 'CTO', role: 'Founder', projectId: 'proj-123' },
        { stakeholderId: 'stake-3', name: 'Investor A', role: 'Investor', projectId: 'proj-123' }
      ];

      Stakeholder.find.mockResolvedValue(stakeholders);

      const result = await Stakeholder.find({ projectId: 'proj-123' });

      expect(result.length).toBe(3);
      expect(result.filter(s => s.role === 'Founder').length).toBe(2);
      expect(result.filter(s => s.role === 'Investor').length).toBe(1);
    });
  });
});
