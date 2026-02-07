/**
 * Access Group Routes Tests
 *
 * Issue #274: Implement Access Groups and Policy Management endpoints
 *
 * Integration tests for the access group routes to verify endpoint configuration
 */

const request = require('supertest');
const express = require('express');

// Mock the auth middleware before requiring the routes
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      userId: 'test-user-123',
      companyId: 'test-company-456',
      role: 'admin'
    };
    next();
  }
}));

const accessGroupRoutes = require('../../../../routes/v1/accessGroupRoutes');
const accessGroupController = require('../../../../controllers/accessGroupController');

// Mock the controller
jest.mock('../../../../controllers/accessGroupController');

describe('Access Group Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/access-groups', accessGroupRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/access-groups', () => {
    it('should route to getAllAccessGroups controller', async () => {
      accessGroupController.getAllAccessGroups.mockImplementation((req, res) => {
        res.status(200).json([
          { id: 'GRP-ADMINS', name: 'Administrators' },
          { id: 'GRP-INVESTORS', name: 'Investors' }
        ]);
      });

      const response = await request(app)
        .get('/api/v1/access-groups')
        .expect(200);

      expect(accessGroupController.getAllAccessGroups).toHaveBeenCalled();
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Administrators');
    });

    it('should return default groups when no custom groups exist', async () => {
      accessGroupController.getAllAccessGroups.mockImplementation((req, res) => {
        // Simulating default groups being returned
        res.status(200).json([
          { id: 'GRP-ADMINS', name: 'Administrators', isSystem: true },
          { id: 'GRP-INVESTORS', name: 'Investors', isSystem: true },
          { id: 'GRP-EMPLOYEES', name: 'Employees', isSystem: true }
        ]);
      });

      const response = await request(app)
        .get('/api/v1/access-groups')
        .expect(200);

      expect(accessGroupController.getAllAccessGroups).toHaveBeenCalled();
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].isSystem).toBe(true);
    });
  });

  describe('GET /api/v1/access-groups/:id', () => {
    it('should route to getAccessGroupById controller', async () => {
      accessGroupController.getAccessGroupById.mockImplementation((req, res) => {
        res.status(200).json({
          id: req.params.id,
          name: 'Test Group',
          memberCount: 5
        });
      });

      const response = await request(app)
        .get('/api/v1/access-groups/GRP-123')
        .expect(200);

      expect(accessGroupController.getAccessGroupById).toHaveBeenCalled();
      expect(response.body.id).toBe('GRP-123');
    });

    it('should return 404 for non-existent group', async () => {
      accessGroupController.getAccessGroupById.mockImplementation((req, res) => {
        res.status(404).json({ error: 'Access group not found' });
      });

      const response = await request(app)
        .get('/api/v1/access-groups/non-existent')
        .expect(404);

      expect(accessGroupController.getAccessGroupById).toHaveBeenCalled();
      expect(response.body.error).toBe('Access group not found');
    });
  });

  describe('POST /api/v1/access-groups', () => {
    it('should route to createAccessGroup controller', async () => {
      accessGroupController.createAccessGroup.mockImplementation((req, res) => {
        res.status(201).json({
          id: 'GRP-NEW123',
          name: req.body.name,
          description: req.body.description,
          memberCount: 0
        });
      });

      const response = await request(app)
        .post('/api/v1/access-groups')
        .send({ name: 'New Team', description: 'A new access group' })
        .expect(201);

      expect(accessGroupController.createAccessGroup).toHaveBeenCalled();
      expect(response.body.name).toBe('New Team');
      expect(response.body.memberCount).toBe(0);
    });

    it('should return 400 for invalid data', async () => {
      accessGroupController.createAccessGroup.mockImplementation((req, res) => {
        if (!req.body.name) {
          return res.status(400).json({ error: 'Group name is required' });
        }
        res.status(201).json({ id: 'GRP-NEW' });
      });

      const response = await request(app)
        .post('/api/v1/access-groups')
        .send({})
        .expect(400);

      expect(accessGroupController.createAccessGroup).toHaveBeenCalled();
      expect(response.body.error).toBe('Group name is required');
    });
  });

  describe('PUT /api/v1/access-groups/:id', () => {
    it('should route to updateAccessGroup controller', async () => {
      accessGroupController.updateAccessGroup.mockImplementation((req, res) => {
        res.status(200).json({
          id: req.params.id,
          name: req.body.name,
          description: req.body.description
        });
      });

      const response = await request(app)
        .put('/api/v1/access-groups/GRP-123')
        .send({ name: 'Updated Team', description: 'Updated description' })
        .expect(200);

      expect(accessGroupController.updateAccessGroup).toHaveBeenCalled();
      expect(response.body.name).toBe('Updated Team');
    });

    it('should return 404 for non-existent group', async () => {
      accessGroupController.updateAccessGroup.mockImplementation((req, res) => {
        res.status(404).json({ error: 'Access group not found' });
      });

      const response = await request(app)
        .put('/api/v1/access-groups/non-existent')
        .send({ name: 'Updated' })
        .expect(404);

      expect(accessGroupController.updateAccessGroup).toHaveBeenCalled();
      expect(response.body.error).toBe('Access group not found');
    });
  });

  describe('DELETE /api/v1/access-groups/:id', () => {
    it('should route to deleteAccessGroup controller', async () => {
      accessGroupController.deleteAccessGroup.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Access group deleted successfully' });
      });

      const response = await request(app)
        .delete('/api/v1/access-groups/GRP-123')
        .expect(200);

      expect(accessGroupController.deleteAccessGroup).toHaveBeenCalled();
      expect(response.body.message).toBe('Access group deleted successfully');
    });

    it('should return 404 for non-existent group', async () => {
      accessGroupController.deleteAccessGroup.mockImplementation((req, res) => {
        res.status(404).json({ error: 'Access group not found' });
      });

      const response = await request(app)
        .delete('/api/v1/access-groups/non-existent')
        .expect(404);

      expect(accessGroupController.deleteAccessGroup).toHaveBeenCalled();
      expect(response.body.error).toBe('Access group not found');
    });
  });

  describe('Authentication', () => {
    it('should have user context from auth middleware', async () => {
      accessGroupController.getAllAccessGroups.mockImplementation((req, res) => {
        res.status(200).json({
          user: req.user,
          groups: []
        });
      });

      const response = await request(app)
        .get('/api/v1/access-groups')
        .expect(200);

      expect(response.body.user.userId).toBe('test-user-123');
      expect(response.body.user.companyId).toBe('test-company-456');
    });
  });
});
