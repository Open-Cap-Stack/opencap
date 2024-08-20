const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const communicationRoutes = require('../routes/Communication'); // Corrected import
const Communication = require('../models/Communication');

// Mock the Communication model
jest.mock('../models/Communication');

const app = express();
app.use(express.json());
app.use('/api/communications', communicationRoutes);

describe('Communication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/communications', () => {
    it('should create a new communication', async () => {
      const communicationData = {
        communicationId: 'new-communication-id',
        MessageType: 'system notification',
        Sender: mongoose.Types.ObjectId().toString(),
        Recipient: mongoose.Types.ObjectId().toString(),
        Timestamp: new Date().toISOString(), // Convert to string
        Content: 'This is a new communication.',
      };

      Communication.prototype.save.mockResolvedValue(communicationData);

      const response = await request(app)
        .post('/api/communications')
        .send(communicationData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(communicationData);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/communications')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid communication data' });
    });
  });

  describe('GET /api/communications', () => {
    it('should get all communications', async () => {
      const communications = [
        {
          communicationId: 'communication-id-1',
          MessageType: 'email',
          Sender: mongoose.Types.ObjectId().toString(),
          Recipient: mongoose.Types.ObjectId().toString(),
          Timestamp: new Date().toISOString(), // Convert to string
          Content: 'First communication.',
        },
        {
          communicationId: 'communication-id-2',
          MessageType: 'SMS',
          Sender: mongoose.Types.ObjectId().toString(),
          Recipient: mongoose.Types.ObjectId().toString(),
          Timestamp: new Date().toISOString(), // Convert to string
          Content: 'Second communication.',
        },
      ];

      Communication.find.mockResolvedValue(communications);

      const response = await request(app).get('/api/communications');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(communications);
    });

    it('should return 404 if no communications are found', async () => {
      Communication.find.mockResolvedValue([]);

      const response = await request(app).get('/api/communications');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'No communications found' });
    });
  });

  describe('GET /api/communications/:id', () => {
    it('should get a communication by id', async () => {
      const communication = {
        communicationId: 'communication-id-1',
        MessageType: 'email',
        Sender: mongoose.Types.ObjectId().toString(),
        Recipient: mongoose.Types.ObjectId().toString(),
        Timestamp: new Date().toISOString(), // Convert to string
        Content: 'Test communication.',
      };

      Communication.findById.mockResolvedValue(communication);

      const response = await request(app).get(`/api/communications/${communication.communicationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(communication);
    });

    it('should return 404 if communication is not found', async () => {
      Communication.findById.mockResolvedValue(null);

      const response = await request(app).get(`/api/communications/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Communication not found' });
    });
  });

  describe('PUT /api/communications/:id', () => {
    it('should update a communication by id', async () => {
      const communicationId = 'communication-id-1';
      const updatedCommunication = {
        communicationId,
        MessageType: 'email',
        Sender: mongoose.Types.ObjectId().toString(),
        Recipient: mongoose.Types.ObjectId().toString(),
        Timestamp: new Date().toISOString(), // Convert to string
        Content: 'Updated communication content.',
      };

      Communication.findByIdAndUpdate.mockResolvedValue(updatedCommunication);

      const response = await request(app)
        .put(`/api/communications/${communicationId}`)
        .send(updatedCommunication);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedCommunication);
    });

    it('should return 404 if communication to update is not found', async () => {
      Communication.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/communications/${mongoose.Types.ObjectId()}`)
        .send({ Content: 'Updated content' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Communication not found' });
    });
  });

  describe('DELETE /api/communications/:id', () => {
    it('should delete a communication by id', async () => {
      const communicationId = 'communication-id-1';
      Communication.findByIdAndDelete.mockResolvedValue({ communicationId });

      const response = await request(app).delete(`/api/communications/${communicationId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Communication deleted' });
    });

    it('should return 404 if communication to delete is not found', async () => {
      Communication.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/api/communications/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Communication not found' });
    });
  });
});
