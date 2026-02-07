/**
 * Task Model Tests
 *
 * Issue #121: Create Task Management API
 *
 * Tests for the Task ZeroDB model including schema structure,
 * field definitions, constants, and CRUD method existence.
 */

const Task = require('../../../models/Task');

describe('Task Model', () => {
  describe('Schema Structure', () => {
    it('should have a schema defined', () => {
      expect(Task.schema).toBeDefined();
      expect(typeof Task.schema).toBe('object');
    });

    it('should have title field marked as required', () => {
      expect(Task.schema.title).toBeDefined();
      expect(Task.schema.title.required).toBe(true);
      expect(Task.schema.title.type).toBe('string');
    });

    it('should have description field', () => {
      expect(Task.schema.description).toBeDefined();
      expect(Task.schema.description.type).toBe('string');
    });

    it('should have status field with enum and default', () => {
      expect(Task.schema.status).toBeDefined();
      expect(Task.schema.status.type).toBe('string');
      expect(Task.schema.status.enum).toEqual(['pending', 'in_progress', 'completed', 'cancelled']);
      expect(Task.schema.status.default).toBe('pending');
    });

    it('should have priority field with enum and default', () => {
      expect(Task.schema.priority).toBeDefined();
      expect(Task.schema.priority.type).toBe('string');
      expect(Task.schema.priority.enum).toEqual(['low', 'medium', 'high', 'urgent']);
      expect(Task.schema.priority.default).toBe('medium');
    });

    it('should have assigneeId field', () => {
      expect(Task.schema.assigneeId).toBeDefined();
      expect(Task.schema.assigneeId.type).toBe('string');
    });

    it('should have companyId field', () => {
      expect(Task.schema.companyId).toBeDefined();
      expect(Task.schema.companyId.type).toBe('string');
    });

    it('should have dueDate field', () => {
      expect(Task.schema.dueDate).toBeDefined();
      expect(Task.schema.dueDate.type).toBe('date');
    });

    it('should have tags field as array', () => {
      expect(Task.schema.tags).toBeDefined();
      expect(Task.schema.tags.type).toBe('array');
    });

    it('should have comments field as array', () => {
      expect(Task.schema.comments).toBeDefined();
      expect(Task.schema.comments.type).toBe('array');
    });
  });

  describe('Constants', () => {
    it('should export STATUSES array', () => {
      expect(Task.STATUSES).toBeDefined();
      expect(Task.STATUSES).toEqual(['pending', 'in_progress', 'completed', 'cancelled']);
    });

    it('should export PRIORITIES array', () => {
      expect(Task.PRIORITIES).toBeDefined();
      expect(Task.PRIORITIES).toEqual(['low', 'medium', 'high', 'urgent']);
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof Task.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof Task.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof Task.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof Task.findById).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof Task.countDocuments).toBe('function');
    });

    it('should have findByIdAndUpdate method', () => {
      expect(typeof Task.findByIdAndUpdate).toBe('function');
    });

    it('should have findByIdAndDelete method', () => {
      expect(typeof Task.findByIdAndDelete).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findByCompany method', () => {
      expect(typeof Task.findByCompany).toBe('function');
    });

    it('should have findByAssignee method', () => {
      expect(typeof Task.findByAssignee).toBe('function');
    });

    it('should have findByStatus method', () => {
      expect(typeof Task.findByStatus).toBe('function');
    });

    it('should have findByPriority method', () => {
      expect(typeof Task.findByPriority).toBe('function');
    });

    it('should have findByTag method', () => {
      expect(typeof Task.findByTag).toBe('function');
    });

    it('should have findOverdue method', () => {
      expect(typeof Task.findOverdue).toBe('function');
    });

    it('should have updateStatus method', () => {
      expect(typeof Task.updateStatus).toBe('function');
    });

    it('should have updatePriority method', () => {
      expect(typeof Task.updatePriority).toBe('function');
    });

    it('should have assign method', () => {
      expect(typeof Task.assign).toBe('function');
    });

    it('should have addComment method', () => {
      expect(typeof Task.addComment).toBe('function');
    });

    it('should have addTag method', () => {
      expect(typeof Task.addTag).toBe('function');
    });

    it('should have removeTag method', () => {
      expect(typeof Task.removeTag).toBe('function');
    });
  });

  describe('Schema Field Constraints', () => {
    it('should enforce title max length of 200', () => {
      expect(Task.schema.title.maxLength).toBe(200);
    });

    it('should enforce description max length of 2000', () => {
      expect(Task.schema.description.maxLength).toBe(2000);
    });
  });
});
