const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const communicationRoutes = require('../routes/Communication');
const Communication = require('../models/Communication');
const { setupDockerTestEnv } = require('./setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Mock data
const user1Id = new mongoose.Types.ObjectId();
const user2Id = new mongoose.Types.ObjectId();
const user3Id = new mongoose.Types.ObjectId();

const testCommunications = [
  {
    communicationId: 'COM-12345',
    MessageType: 'email',
    Sender: user1Id,
    Recipient: user2Id,
    Timestamp: new Date('2025-03-10T10:00:00'),
    Content: 'Hello, this is a test message 1',
    ThreadId: 'THREAD-ABC-123'
  },
  {
    communicationId: 'COM-12346',
    MessageType: 'email',
    Sender: user2Id,
    Recipient: user1Id,
    Timestamp: new Date('2025-03-10T10:15:00'),
    Content: 'Hi, this is a reply to message 1',
    ThreadId: 'THREAD-ABC-123'
  },
  {
    communicationId: 'COM-12347',
    MessageType: 'SMS',
    Sender: user1Id,
    Recipient: user3Id,
    Timestamp: new Date('2025-03-11T09:00:00'),
    Content: 'Hello user3, this is a different thread',
    ThreadId: 'THREAD-DEF-456'
  }
];

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/communications', communicationRoutes);

describe('Communication API - Thread Management Functionality', () => {
  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await Communication.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Create test communications before each test
  beforeEach(async () => {
    await Communication.deleteMany({});
    for (const commData of testCommunications) {
      const communication = new Communication(commData);
      await communication.save();
    }
  });

  describe('GET /api/communications/thread/:threadId', () => {
    test('should get all messages in a thread', async () => {
      const res = await request(app)
        .get('/api/communications/thread/THREAD-ABC-123')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0]).toHaveProperty('ThreadId', 'THREAD-ABC-123');
      expect(res.body.messages[1]).toHaveProperty('ThreadId', 'THREAD-ABC-123');
    });

    test('should return 404 when thread does not exist', async () => {
      const res = await request(app)
        .get('/api/communications/thread/NONEXISTENT-THREAD')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No messages found in this thread');
    });
  });

  describe('GET /api/communications/user/:userId', () => {
    test('should get all messages where user is sender or recipient', async () => {
      const res = await request(app)
        .get(`/api/communications/user/${user1Id}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages).toHaveLength(3);
    });

    test('should return 404 when no messages found for user', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/communications/user/${nonExistentUserId}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No messages found for this user');
    });
  });

  describe('POST /api/communications/thread', () => {
    test('should create a new message in a thread', async () => {
      const newMessage = {
        MessageType: 'email',
        Sender: user1Id,
        Recipient: user2Id,
        Content: 'Another message in the existing thread',
        ThreadId: 'THREAD-ABC-123'
      };

      const res = await request(app)
        .post('/api/communications/thread')
        .send(newMessage)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('communicationId');
      expect(res.body).toHaveProperty('ThreadId', 'THREAD-ABC-123');
      expect(res.body).toHaveProperty('Sender', user1Id.toString());
      expect(res.body).toHaveProperty('Recipient', user2Id.toString());
      expect(res.body).toHaveProperty('Content', newMessage.Content);
    });

    test('should create a new thread if ThreadId is not provided', async () => {
      const newMessage = {
        MessageType: 'SMS',
        Sender: user2Id,
        Recipient: user3Id,
        Content: 'Starting a new thread without explicit ThreadId'
      };

      const res = await request(app)
        .post('/api/communications/thread')
        .send(newMessage)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('communicationId');
      expect(res.body).toHaveProperty('ThreadId');
      expect(res.body.ThreadId).toBeTruthy();
      expect(res.body).toHaveProperty('Sender', user2Id.toString());
      expect(res.body).toHaveProperty('Recipient', user3Id.toString());
    });
  });
});
