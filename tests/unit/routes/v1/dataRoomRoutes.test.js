/**
 * DataRoom Routes Tests - Issue #194
 */
const request = require('supertest');
const express = require('express');

// Mock the controller
jest.mock('../../../../controllers/dataRoomController', () => ({
  createDataRoom: jest.fn((req, res) => res.status(201).json({ dataRoomId: 'dr-1' })),
  getDataRooms: jest.fn((req, res) => res.status(200).json({ dataRooms: [] })),
  getDataRoomStats: jest.fn((req, res) => res.status(200).json({ stats: {} })),
  getDataRoomById: jest.fn((req, res) => res.status(200).json({ dataRoomId: req.params.id })),
  updateDataRoom: jest.fn((req, res) => res.status(200).json({ dataRoomId: req.params.id })),
  deleteDataRoom: jest.fn((req, res) => res.status(200).json({ message: 'Deleted' })),
  addDocument: jest.fn((req, res) => res.status(201).json({ message: 'Added' })),
  removeDocument: jest.fn((req, res) => res.status(200).json({ message: 'Removed' })),
  managePermissions: jest.fn((req, res) => res.status(200).json({ message: 'Updated' })),
  getActivityLog: jest.fn((req, res) => res.status(200).json({ activities: [] })),
  exportAsZip: jest.fn((req, res) => res.status(200).json({ message: 'Exporting' })),
  generateExternalLink: jest.fn((req, res) => res.status(200).json({ accessToken: 'token' })),
  validateExternalAccess: jest.fn((req, res) => res.status(200).json({ valid: true }))
}));

const dataRoomRoutes = require('../../../../routes/v1/dataRoomRoutes');

describe('DataRoom Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/data-rooms', dataRoomRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/data-rooms', () => {
    it('should route to createDataRoom controller', async () => {
      const response = await request(app)
        .post('/api/v1/data-rooms')
        .send({ name: 'Test Room' });
      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/v1/data-rooms', () => {
    it('should route to getDataRooms controller', async () => {
      const response = await request(app).get('/api/v1/data-rooms');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/data-rooms/:id', () => {
    it('should route to getDataRoomById controller', async () => {
      const response = await request(app).get('/api/v1/data-rooms/dr-123');
      expect(response.status).toBe(200);
      expect(response.body.dataRoomId).toBe('dr-123');
    });
  });

  describe('PUT /api/v1/data-rooms/:id', () => {
    it('should route to updateDataRoom controller', async () => {
      const response = await request(app)
        .put('/api/v1/data-rooms/dr-123')
        .send({ name: 'Updated' });
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/v1/data-rooms/:id', () => {
    it('should route to deleteDataRoom controller', async () => {
      const response = await request(app).delete('/api/v1/data-rooms/dr-123');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/data-rooms/:id/documents', () => {
    it('should route to addDocument controller', async () => {
      const response = await request(app)
        .post('/api/v1/data-rooms/dr-123/documents')
        .send({ documentId: 'doc-456' });
      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/v1/data-rooms/:id/documents/:docId', () => {
    it('should route to removeDocument controller', async () => {
      const response = await request(app)
        .delete('/api/v1/data-rooms/dr-123/documents/doc-456');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/data-rooms/:id/permissions', () => {
    it('should route to managePermissions controller', async () => {
      const response = await request(app)
        .post('/api/v1/data-rooms/dr-123/permissions')
        .send({ action: 'add', userId: 'user-1', level: 'view' });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/data-rooms/:id/activity', () => {
    it('should route to getActivityLog controller', async () => {
      const response = await request(app).get('/api/v1/data-rooms/dr-123/activity');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/data-rooms/:id/export', () => {
    it('should route to exportAsZip controller', async () => {
      const response = await request(app).post('/api/v1/data-rooms/dr-123/export');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/v1/data-rooms/:id/external-link', () => {
    it('should route to generateExternalLink controller', async () => {
      const response = await request(app)
        .post('/api/v1/data-rooms/dr-123/external-link')
        .send({ expiresInHours: 24 });
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/v1/data-rooms/:id/external', () => {
    it('should route to validateExternalAccess controller', async () => {
      const response = await request(app)
        .get('/api/v1/data-rooms/dr-123/external')
        .query({ token: 'valid-token' });
      expect(response.status).toBe(200);
    });
  });
});
