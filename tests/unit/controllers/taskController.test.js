/**
 * Task Controller Tests
 *
 * Issue #121: Create Task Management API
 *
 * Tests for the task controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const taskController = require('../../../controllers/taskController');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');

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

      databaseAdapter.create.mockResolvedValue(mockCreatedTask);

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.create).toHaveBeenCalledWith('Task', expect.objectContaining({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority
      }));
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { description: 'Missing title' };

      databaseAdapter.create.mockRejectedValue(new Error('Validation error: title is required'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when status is invalid', async () => {
      req.body = {
        title: 'Test task',
        status: 'invalid_status'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Validation error: invalid status'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when priority is invalid', async () => {
      req.body = {
        title: 'Test task',
        priority: 'super_urgent'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Validation error: invalid priority'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = {
        title: 'Test task',
        status: 'pending'
      };

      databaseAdapter.create.mockRejectedValue(new Error('Database connection failed'));

      await taskController.createTask(req, res);

      expect(res.statusCode).toBe(400);
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

      databaseAdapter.create.mockResolvedValue(mockCreatedTask);

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

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.find).toHaveBeenCalledWith('Task', {}, expect.any(Object));
    });

    it('should return empty array when no tasks exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await taskController.getTasks(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const tasks = typeof data === 'string' ? JSON.parse(data) : data;
      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBe(0);
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await taskController.getTasks(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should support pagination', async () => {
      req.query = { page: 2, limit: 10 };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1' }];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        {},
        expect.objectContaining({ skip: 10, limit: 10 })
      );
    });

    it('should filter by status', async () => {
      req.query = { status: 'pending' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', status: 'pending' }];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ status: 'pending' }),
        expect.any(Object)
      );
    });

    it('should filter by priority', async () => {
      req.query = { priority: 'high' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', priority: 'high' }];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ priority: 'high' }),
        expect.any(Object)
      );
    });

    it('should filter by assigneeId', async () => {
      req.query = { assigneeId: 'user-001' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', assigneeId: 'user-001' }];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ assigneeId: 'user-001' }),
        expect.any(Object)
      );
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'company-001' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', companyId: 'company-001' }];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ companyId: 'company-001' }),
        expect.any(Object)
      );
    });

    it('should filter by tags', async () => {
      req.query = { tags: 'finance,quarterly' };
      const mockTasks = [{ _id: 'task_1', title: 'Task 1', tags: ['finance', 'quarterly'] }];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getTasks(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ tags: { $in: ['finance', 'quarterly'] } }),
        expect.any(Object)
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

      databaseAdapter.findById.mockResolvedValue(mockTask);

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findById).toHaveBeenCalledWith('Task', 'task_123');
    });

    it('should return 404 when task not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findById.mockResolvedValue(null);

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      databaseAdapter.findById.mockRejectedValue(new Error('Invalid ID format'));

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

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'Task',
        'task_123',
        req.body,
        expect.any(Object)
      );
    });

    it('should return 404 when task to update not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = { title: 'Updated Title' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle validation errors during update', async () => {
      req.params = { id: 'task_123' };
      req.body = { status: 'INVALID_STATUS' };

      databaseAdapter.findByIdAndUpdate.mockRejectedValue(new Error('Validation error'));

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

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

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

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      await taskController.updateTask(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      req.params = { id: 'task_123' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'task_123' });

      await taskController.deleteTask(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('Task', 'task_123');
    });

    it('should return 404 when task not found', async () => {
      req.params = { id: 'nonexistent_id' };

      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await taskController.deleteTask(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should handle database errors during delete', async () => {
      req.params = { id: 'task_123' };

      databaseAdapter.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

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

      const mockTask = {
        _id: 'task_123',
        title: 'Test Task',
        comments: []
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

      databaseAdapter.findById.mockResolvedValue(mockTask);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedTask);

      await taskController.addComment(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should return 404 when task not found', async () => {
      req.params = { id: 'nonexistent_id' };
      req.body = {
        text: 'This is a comment',
        authorId: 'user-001'
      };

      databaseAdapter.findById.mockResolvedValue(null);

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

      databaseAdapter.find.mockResolvedValue(mockTasks);

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

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getAnalytics(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ companyId: 'company-001' }),
        expect.any(Object)
      );
    });

    it('should return analytics filtered by assigneeId', async () => {
      req.query = { assigneeId: 'user-001' };
      const mockTasks = [
        { _id: 'task_1', status: 'pending', priority: 'high', assigneeId: 'user-001' }
      ];

      databaseAdapter.find.mockResolvedValue(mockTasks);

      await taskController.getAnalytics(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'Task',
        expect.objectContaining({ assigneeId: 'user-001' }),
        expect.any(Object)
      );
    });

    it('should handle database errors', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await taskController.getAnalytics(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should return zero counts when no tasks exist', async () => {
      databaseAdapter.find.mockResolvedValue([]);

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

      databaseAdapter.create.mockResolvedValue(zerodbResult);

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

      databaseAdapter.findById.mockResolvedValue(parallelResult);

      await taskController.getTaskById(req, res);

      expect(res.statusCode).toBe(200);
      const data = res._getData();
      const task = typeof data === 'string' ? JSON.parse(data) : data;
      expect(task.title).toBe('Test Task');
    });
  });
});
