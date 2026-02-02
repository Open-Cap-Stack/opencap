/**
 * Task Model Tests
 *
 * Issue #121: Create Task Management API
 *
 * Tests for the Task Mongoose model including validation,
 * schema structure, and virtual properties.
 */

const mongoose = require('mongoose');
const Task = require('../../../models/Task');

describe('Task Model', () => {
  beforeAll(async () => {
    // Connect to a test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });

  afterAll(async () => {
    // Cleanup - drop the test collection if it exists
    try {
      await mongoose.connection.collection('tasks').drop();
    } catch (e) {
      // Collection might not exist, that's okay
    }
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await Task.deleteMany({});
  });

  describe('Schema Validation', () => {
    it('should create a valid task with required fields', async () => {
      const taskData = {
        title: 'Test Task',
        companyId: 'company-001'
      };

      const task = new Task(taskData);
      const savedTask = await task.save();

      expect(savedTask._id).toBeDefined();
      expect(savedTask.title).toBe('Test Task');
      expect(savedTask.status).toBe('pending'); // default
      expect(savedTask.priority).toBe('medium'); // default
    });

    it('should fail validation when title is missing', async () => {
      const task = new Task({
        description: 'Task without title'
      });

      await expect(task.save()).rejects.toThrow(/title is required/i);
    });

    it('should fail validation for invalid status', async () => {
      const task = new Task({
        title: 'Test Task',
        status: 'invalid_status'
      });

      await expect(task.save()).rejects.toThrow(/not a valid status/i);
    });

    it('should fail validation for invalid priority', async () => {
      const task = new Task({
        title: 'Test Task',
        priority: 'super_critical'
      });

      await expect(task.save()).rejects.toThrow(/not a valid priority/i);
    });

    it('should accept valid status values', async () => {
      const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];

      for (const status of statuses) {
        const task = new Task({
          title: `Task with ${status}`,
          status
        });
        const savedTask = await task.save();
        expect(savedTask.status).toBe(status);
      }
    });

    it('should accept valid priority values', async () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of priorities) {
        const task = new Task({
          title: `Task with ${priority}`,
          priority
        });
        const savedTask = await task.save();
        expect(savedTask.priority).toBe(priority);
      }
    });

    it('should enforce title max length', async () => {
      const longTitle = 'a'.repeat(201);
      const task = new Task({
        title: longTitle
      });

      await expect(task.save()).rejects.toThrow(/cannot exceed 200 characters/i);
    });

    it('should enforce description max length', async () => {
      const longDescription = 'a'.repeat(2001);
      const task = new Task({
        title: 'Test Task',
        description: longDescription
      });

      await expect(task.save()).rejects.toThrow(/cannot exceed 2000 characters/i);
    });
  });

  describe('Comments', () => {
    it('should add comments to a task', async () => {
      const task = new Task({
        title: 'Task with comments',
        comments: [{
          text: 'First comment',
          authorId: 'user-001'
        }]
      });

      const savedTask = await task.save();
      expect(savedTask.comments).toHaveLength(1);
      expect(savedTask.comments[0].text).toBe('First comment');
      expect(savedTask.comments[0].authorId).toBe('user-001');
      expect(savedTask.comments[0].createdAt).toBeDefined();
    });

    it('should fail when comment text is missing', async () => {
      const task = new Task({
        title: 'Task with invalid comment',
        comments: [{
          authorId: 'user-001'
        }]
      });

      await expect(task.save()).rejects.toThrow();
    });

    it('should fail when comment authorId is missing', async () => {
      const task = new Task({
        title: 'Task with invalid comment',
        comments: [{
          text: 'Comment without author'
        }]
      });

      await expect(task.save()).rejects.toThrow();
    });
  });

  describe('Tags', () => {
    it('should save task with tags', async () => {
      const task = new Task({
        title: 'Task with tags',
        tags: ['finance', 'quarterly', 'review']
      });

      const savedTask = await task.save();
      expect(savedTask.tags).toHaveLength(3);
      expect(savedTask.tags).toContain('finance');
    });

    it('should trim tag values', async () => {
      const task = new Task({
        title: 'Task with padded tags',
        tags: ['  finance  ', '  quarterly  ']
      });

      const savedTask = await task.save();
      expect(savedTask.tags[0]).toBe('finance');
      expect(savedTask.tags[1]).toBe('quarterly');
    });
  });

  describe('Virtual Properties', () => {
    it('should calculate isOverdue as false when no due date', async () => {
      const task = new Task({
        title: 'Task without due date'
      });

      const savedTask = await task.save();
      expect(savedTask.isOverdue).toBe(false);
    });

    it('should calculate isOverdue as false for future due date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const task = new Task({
        title: 'Task with future due date',
        dueDate: futureDate,
        status: 'pending'
      });

      const savedTask = await task.save();
      expect(savedTask.isOverdue).toBe(false);
    });

    it('should calculate isOverdue as true for past due date on pending task', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const task = new Task({
        title: 'Overdue task',
        dueDate: pastDate,
        status: 'pending'
      });

      const savedTask = await task.save();
      expect(savedTask.isOverdue).toBe(true);
    });

    it('should calculate isOverdue as false for completed task', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const task = new Task({
        title: 'Completed task',
        dueDate: pastDate,
        status: 'completed'
      });

      const savedTask = await task.save();
      expect(savedTask.isOverdue).toBe(false);
    });

    it('should calculate isOverdue as false for cancelled task', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const task = new Task({
        title: 'Cancelled task',
        dueDate: pastDate,
        status: 'cancelled'
      });

      const savedTask = await task.save();
      expect(savedTask.isOverdue).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const task = new Task({
        title: 'Task with timestamps'
      });

      const savedTask = await task.save();
      expect(savedTask.createdAt).toBeDefined();
      expect(savedTask.updatedAt).toBeDefined();
    });

    it('should update updatedAt on modification', async () => {
      const task = new Task({
        title: 'Task to update'
      });

      const savedTask = await task.save();
      const originalUpdatedAt = savedTask.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      savedTask.title = 'Updated Task Title';
      const updatedTask = await savedTask.save();

      expect(updatedTask.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Indexes', () => {
    it('should have indexes defined for common query fields', async () => {
      const indexes = Task.schema.indexes();
      const indexedFields = indexes.map(idx => Object.keys(idx[0]));

      // Check for compound indexes
      expect(indexedFields.some(fields => fields.includes('companyId'))).toBe(true);
      expect(indexedFields.some(fields => fields.includes('assigneeId'))).toBe(true);
      expect(indexedFields.some(fields => fields.includes('tags'))).toBe(true);
      expect(indexedFields.some(fields => fields.includes('dueDate'))).toBe(true);
    });
  });
});
