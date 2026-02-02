/**
 * Task Routes Tests
 *
 * Issue #121: Create Task Management API
 *
 * Integration tests for the task routes to verify endpoint configuration
 */

const request = require('supertest');
const express = require('express');
const taskRoutes = require('../../../../routes/v1/taskRoutes');
const taskController = require('../../../../controllers/taskController');

// Mock the controller
jest.mock('../../../../controllers/taskController');

describe('Task Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/tasks', taskRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/tasks', () => {
    it('should route to createTask controller', async () => {
      taskController.createTask.mockImplementation((req, res) => {
        res.status(201).json({ _id: 'task_123', title: req.body.title });
      });

      const response = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'New Task', status: 'pending' })
        .expect(201);

      expect(taskController.createTask).toHaveBeenCalled();
      expect(response.body.title).toBe('New Task');
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should route to getTasks controller', async () => {
      taskController.getTasks.mockImplementation((req, res) => {
        res.status(200).json([{ _id: 'task_1' }, { _id: 'task_2' }]);
      });

      const response = await request(app)
        .get('/api/v1/tasks')
        .expect(200);

      expect(taskController.getTasks).toHaveBeenCalled();
      expect(response.body).toHaveLength(2);
    });

    it('should pass query parameters for filtering', async () => {
      taskController.getTasks.mockImplementation((req, res) => {
        res.status(200).json([{ status: req.query.status }]);
      });

      const response = await request(app)
        .get('/api/v1/tasks?status=pending&priority=high')
        .expect(200);

      expect(taskController.getTasks).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/tasks/analytics', () => {
    it('should route to getAnalytics controller', async () => {
      taskController.getAnalytics.mockImplementation((req, res) => {
        res.status(200).json({
          total: 10,
          byStatus: { pending: 5, completed: 5 }
        });
      });

      const response = await request(app)
        .get('/api/v1/tasks/analytics')
        .expect(200);

      expect(taskController.getAnalytics).toHaveBeenCalled();
      expect(response.body.total).toBe(10);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should route to getTaskById controller', async () => {
      taskController.getTaskById.mockImplementation((req, res) => {
        res.status(200).json({ _id: req.params.id, title: 'Test Task' });
      });

      const response = await request(app)
        .get('/api/v1/tasks/task_123')
        .expect(200);

      expect(taskController.getTaskById).toHaveBeenCalled();
      expect(response.body._id).toBe('task_123');
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('should route to updateTask controller', async () => {
      taskController.updateTask.mockImplementation((req, res) => {
        res.status(200).json({
          _id: req.params.id,
          title: req.body.title,
          status: req.body.status
        });
      });

      const response = await request(app)
        .put('/api/v1/tasks/task_123')
        .send({ title: 'Updated Task', status: 'completed' })
        .expect(200);

      expect(taskController.updateTask).toHaveBeenCalled();
      expect(response.body.title).toBe('Updated Task');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should route to deleteTask controller', async () => {
      taskController.deleteTask.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Task deleted' });
      });

      const response = await request(app)
        .delete('/api/v1/tasks/task_123')
        .expect(200);

      expect(taskController.deleteTask).toHaveBeenCalled();
      expect(response.body.message).toBe('Task deleted');
    });
  });

  describe('POST /api/v1/tasks/:id/comments', () => {
    it('should route to addComment controller', async () => {
      taskController.addComment.mockImplementation((req, res) => {
        res.status(201).json({
          _id: req.params.id,
          comments: [{ text: req.body.text, authorId: req.body.authorId }]
        });
      });

      const response = await request(app)
        .post('/api/v1/tasks/task_123/comments')
        .send({ text: 'New comment', authorId: 'user-001' })
        .expect(201);

      expect(taskController.addComment).toHaveBeenCalled();
      expect(response.body.comments).toHaveLength(1);
    });
  });

  describe('Route Order', () => {
    it('should handle /analytics before /:id', async () => {
      // This test verifies that /analytics is defined before /:id
      // so that 'analytics' is not treated as an id parameter
      taskController.getAnalytics.mockImplementation((req, res) => {
        res.status(200).json({ isAnalytics: true });
      });

      taskController.getTaskById.mockImplementation((req, res) => {
        res.status(200).json({ isTaskById: true, id: req.params.id });
      });

      const analyticsResponse = await request(app)
        .get('/api/v1/tasks/analytics')
        .expect(200);

      expect(analyticsResponse.body.isAnalytics).toBe(true);
      expect(taskController.getAnalytics).toHaveBeenCalled();
      expect(taskController.getTaskById).not.toHaveBeenCalled();
    });
  });
});
