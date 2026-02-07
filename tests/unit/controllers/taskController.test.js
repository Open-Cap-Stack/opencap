/**
 * Task Controller Tests
 *
 * Issue #121: Create Task Management API
 *
 * Tests for the task controller using Task model (ZeroDB-backed)
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const taskController = require('../../../controllers/taskController');
const Task = require('../../../models/Task');

// Mock the Task model
jest.mock('../../../models/Task', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  addComment: jest.fn(),
  countDocuments: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn()
}));

describe('TaskController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        title: 'Complete quarterly report',
        description: 'Prepare and submit Q4 financial report',
        status: 'pending',
        priority: 'high',
        assigneeId: 'user-001',
        companyId: 'company-001',
        dueDate: '2026-03-01T00:00:00.000Z',
        tags: ['finance', 'quarterly']
      };

      req.body = taskData;

      const mockCreatedTask = {
        _id: 'task_123',
        ...taskData,
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      Task.create.mockResolvedValue(mockCreatedTask);

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
      expect(Task.create).toHaveBeenCalledWith(taskData);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { description: 'Missing title' };

      Task.create.mockRejectedValue(new Error('Validation failed: Task title is required'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when status is invalid', async () => {
      req.body = {
        title: 'Test task',
        status: 'invalid_status'
      };

      Task.create.mockRejectedValue(new Error('Validation failed: invalid_status is not a valid status'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when priority is invalid', async () => {
      req.body = {
        title: 'Test task',
        priority: 'super_urgent'
      };

      Task.create.mockRejectedValue(new Error('Validation failed: super_urgent is not a valid priority'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        title: 'Test task',
        status: 'pending'
      };

      Task.create.mockRejectedValue(new Error('Database connection failed'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should set default status to pending if not provided', async () => {
      req.body = {
        title: 'Test task',
        companyId: 'company-001'
      };

      const mockCreatedTask = {
        _id: 'task_123',
        title: 'Test task',
        status: 'pending',
        companyId: 'company-001',
        comments: []
      };

      Task.create.mockResolvedValue(mockCreatedTask);

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  describe('getTasks', () => {
    it('should return all tasks', async () => {
      const mockTasks = [
        { _id: 'task_1', title: 'Task 1', status: 'pending' },
        { _id: 'task_2', title: 'Task 2', status: 'completed' }
      ];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(Task.find).toHaveBeenCalledWith({});
    });

    it('should return empty array when no tasks exist', async () => {
      Task.find.mockResolvedValue([]);

      await taskController.getTasks(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      expect(parsed.tasks).toEqual([]);
    });

    it('should handle database errors', async () => {
      Task.find.mockRejectedValue(new Error('Database error'));

      await taskController.getTasks(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should filter by status', async () => {
      req.query = { status: 'pending' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', status: 'pending' }];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' })
      );
    });

    it('should filter by priority', async () => {
      req.query = { priority: 'high' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', priority: 'high' }];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' })
      );
    });

    it('should filter by assigneeId', async () => {
      req.query = { assigneeId: 'user-001' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', assigneeId: 'user-001' }];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'user-001' })
      );
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'company-001' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', companyId: 'company-001' }];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-001' })
      );
    });
  });

  describe('getTaskById', () => {
    it('should return task by ID', async () => {
      req.params = { id: 'task_123' };
      const mockTask = {
        _id: 'task_123',
        title: 'Test Task',
        status: 'pending',
        comments: []
      };

      Task.findById.mockResolvedValue(mockTask);

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(200);
      expect(Task.findById).toHaveBeenCalledWith('task_123');
    });

    it('should return 404 when task not found', async () => {
      req.params = { id: 'nonexistent_id' };

      Task.findById.mockResolvedValue(null);

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      Task.findById.mockRejectedValue(new Error('Invalid ID format'));

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      req.params = { id: 'task_123' };
      req.body = {
        title: 'Updated Title',
        status: 'in_progress'
      };

      const mockUpdatedTask = {
        _id: 'task_123',
        title: 'Updated Title',
        status: 'in_progress'
      };

      Task.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
        'task_123',
        req.body,
        expect.objectContaining({ new: true })
      );
    });

    it('should return 404 when task to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { title: 'Updated Title' };

      Task.findByIdAndUpdate.mockResolvedValue(null);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle validation errors during update', async () => {
      req.params = { id: 'task_123' };
      req.body = { status: 'INVALID_STATUS' };

      Task.findByIdAndUpdate.mockRejectedValue(new Error('Invalid status: INVALID_STATUS'));

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should update task status', async () => {
      req.params = { id: 'task_123' };
      req.body = { status: 'completed' };

      const mockUpdatedTask = {
        _id: 'task_123',
        title: 'Test Task',
        status: 'completed'
      };

      Task.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const task = typeof data === 'string' ? JSON.parse(data) : data;
      expect(task.status).toBe('completed');
    });

    it('should update task priority', async () => {
      req.params = { id: 'task_123' };
      req.body = { priority: 'urgent' };

      const mockUpdatedTask = {
        _id: 'task_123',
        title: 'Test Task',
        priority: 'urgent'
      };

      Task.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      req.params = { id: 'task_123' };

      Task.findByIdAndDelete.mockResolvedValue({ _id: 'task_123' });

      await taskController.deleteTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(Task.findByIdAndDelete).toHaveBeenCalledWith('task_123');
    });

    it('should return 404 when task not found', async () => {
      req.params = { id: 'nonexistent_id' };

      Task.findByIdAndDelete.mockResolvedValue(null);

      await taskController.deleteTask(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle database errors during delete', async () => {
      req.params = { id: 'task_123' };

      Task.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await taskController.deleteTask(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('addComment', () => {
    it('should add a comment to a task', async () => {
      req.params = { id: 'task_123' };
      req.body = {
        text: 'This is a comment',
        authorId: 'user-001'
      };

      const mockUpdatedTask = {
        _id: 'task_123',
        title: 'Test Task',
        comments: [{
          _id: 'comment_1',
          text: 'This is a comment',
          authorId: 'user-001',
          createdAt: expect.any(String)
        }]
      };

      Task.addComment.mockResolvedValue(mockUpdatedTask);

      await taskController.addComment(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 404 when task not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = {
        text: 'This is a comment',
        authorId: 'user-001'
      };

      Task.addComment.mockRejectedValue(new Error('Task not found: nonexistent_id'));

      await taskController.addComment(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when comment text is missing', async () => {
      req.params = { id: 'task_123' };
      req.body = { authorId: 'user-001' };

      await taskController.addComment(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when authorId is missing', async () => {
      req.params = { id: 'task_123' };
      req.body = { text: 'This is a comment' };

      await taskController.addComment(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getAnalytics', () => {
    it('should return task analytics', async () => {
      const mockTasks = [
        { _id: 'task_1', status: 'pending', priority: 'high' },
        { _id: 'task_2', status: 'completed', priority: 'medium' },
        { _id: 'task_3', status: 'in_progress', priority: 'high' },
        { _id: 'task_4', status: 'pending', priority: 'low' },
        { _id: 'task_5', status: 'cancelled', priority: 'urgent' }
      ];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getAnalytics(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const analytics = typeof data === 'string' ? JSON.parse(data) : data;

      expect(analytics).toHaveProperty('total');
      expect(analytics).toHaveProperty('byStatus');
      expect(analytics).toHaveProperty('byPriority');
      expect(analytics.total).toBe(5);
      expect(analytics.byStatus.pending).toBe(2);
      expect(analytics.byStatus.completed).toBe(1);
      expect(analytics.byStatus.in_progress).toBe(1);
      expect(analytics.byStatus.cancelled).toBe(1);
      expect(analytics.byPriority.high).toBe(2);
      expect(analytics.byPriority.medium).toBe(1);
      expect(analytics.byPriority.low).toBe(1);
      expect(analytics.byPriority.urgent).toBe(1);
    });

    it('should return analytics filtered by companyId', async () => {
      req.query = { companyId: 'company-001' };
      const mockTasks = [
        { _id: 'task_1', status: 'pending', priority: 'high', companyId: 'company-001' }
      ];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getAnalytics(req, res);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-001' })
      );
    });

    it('should return analytics filtered by assigneeId', async () => {
      req.query = { assigneeId: 'user-001' };
      const mockTasks = [
        { _id: 'task_1', status: 'pending', priority: 'high', assigneeId: 'user-001' }
      ];

      Task.find.mockResolvedValue(mockTasks);

      await taskController.getAnalytics(req, res);

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'user-001' })
      );
    });

    it('should handle database errors', async () => {
      Task.find.mockRejectedValue(new Error('Database error'));

      await taskController.getAnalytics(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should return zero counts when no tasks exist', async () => {
      Task.find.mockResolvedValue([]);

      await taskController.getAnalytics(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const analytics = typeof data === 'string' ? JSON.parse(data) : data;

      expect(analytics.total).toBe(0);
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode', async () => {
      req.body = {
        title: 'ZeroDB Task',
        status: 'pending',
        companyId: 'company-001'
      };

      const zerodbResult = {
        id: 'zero_123',
        title: 'ZeroDB Task',
        status: 'pending'
      };

      Task.create.mockResolvedValue(zerodbResult);

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode consistency', async () => {
      req.params = { id: 'task_123' };

      const parallelResult = {
        _id: 'task_123',
        title: 'Test Task',
        status: 'pending'
      };

      Task.findById.mockResolvedValue(parallelResult);

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const task = typeof data === 'string' ? JSON.parse(data) : data;
      expect(task.title).toBe('Test Task');
    });
  });
});
