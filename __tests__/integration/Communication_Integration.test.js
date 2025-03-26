const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const communicationRoutes = require('../../routes/Communication');
const Communication = require('../../models/Communication');
const { setupDockerTestEnv } = require('../setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Create ObjectIds for test users
const testUser1 = new mongoose.Types.ObjectId();
const testUser2 = new mongoose.Types.ObjectId();
const testUser3 = new mongoose.Types.ObjectId();

const testThread = 'THREAD-TEST-12345';

const testMessages = [
  {
    communicationId: 'COM-TEST-001',
    MessageType: 'email',
    Sender: testUser1,
    Recipient: testUser2,
    Timestamp: new Date('2025-03-22T10:00:00Z'),
    Content: 'Test message 1',
    ThreadId: testThread
  },
  {
    communicationId: 'COM-TEST-002',
    MessageType: 'SMS',
    Sender: testUser2,
    Recipient: testUser1,
    Timestamp: new Date('2025-03-22T10:15:00Z'),
    Content: 'Reply to test message 1',
    ThreadId: testThread
  },
  {
    communicationId: 'COM-TEST-003',
    MessageType: 'notification',
    Sender: testUser3,
    Recipient: testUser1,
    Timestamp: new Date('2025-03-22T11:00:00Z'),
    Content: 'Test message from user 3',
    ThreadId: 'THREAD-TEST-54321'
  }
];

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/communications', communicationRoutes);

describe('Communication API - Integration Tests', () => {
  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await Communication.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Clean up database before each test
  beforeEach(async () => {
    await Communication.deleteMany({});
  });

  test('Creating and retrieving messages in a thread should maintain order and relationships', async () => {
    // 1. Create messages in a thread
    for (const message of testMessages.slice(0, 2)) {
      const res = await request(app)
        .post('/api/communications')
        .send(message)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('ThreadId', testThread);
    }

    // 2. Retrieve all messages in the thread
    const threadRes = await request(app)
      .get(`/api/communications/thread/${testThread}`)
      .expect('Content-Type', /json/);

    expect(threadRes.statusCode).toBe(200);
    expect(threadRes.body.messages).toHaveLength(2);
    
    // 3. Verify messages are returned in chronological order
    expect(new Date(threadRes.body.messages[0].Timestamp).getTime())
      .toBeLessThan(new Date(threadRes.body.messages[1].Timestamp).getTime());
    
    // 4. Verify content of messages
    expect(threadRes.body.messages[0].Content).toBe(testMessages[0].Content);
    expect(threadRes.body.messages[1].Content).toBe(testMessages[1].Content);
  });

  test('Creating a new message in a thread should auto-generate IDs when not provided', async () => {
    // 1. Create a new message in a thread without specifying communicationId
    const newMessage = {
      MessageType: 'email',
      Sender: testUser1,
      Recipient: testUser2,
      Content: 'Auto-generated IDs test',
      ThreadId: testThread
    };

    const res = await request(app)
      .post('/api/communications/thread')
      .send(newMessage)
      .expect('Content-Type', /json/);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('communicationId');
    expect(res.body.communicationId).toMatch(/^COM-/);
    expect(res.body).toHaveProperty('ThreadId', testThread);
  });

  test('Creating a new thread without ThreadId should auto-generate Thread ID', async () => {
    // 1. Create a new message without specifying ThreadId
    const newMessage = {
      MessageType: 'email',
      Sender: testUser1,
      Recipient: testUser2,
      Content: 'Auto-generated thread test'
    };

    const res = await request(app)
      .post('/api/communications/thread')
      .send(newMessage)
      .expect('Content-Type', /json/);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('ThreadId');
    expect(res.body.ThreadId).toMatch(/^THREAD-/);
  });

  test('Retrieving messages for a user should return all sent and received messages', async () => {
    // 1. Create messages with different senders and recipients
    for (const message of testMessages) {
      await request(app)
        .post('/api/communications')
        .send(message)
        .expect(201);
    }

    // 2. Retrieve all messages for User1
    const userRes = await request(app)
      .get(`/api/communications/user/${testUser1}`)
      .expect('Content-Type', /json/);

    expect(userRes.statusCode).toBe(200);
    
    // User1 sent 1 message and received 2 messages, so should have 3 total
    expect(userRes.body.messages).toHaveLength(3);
    
    // Verify the messages include both sent and received
    const sentMessages = userRes.body.messages.filter(msg => msg.Sender.toString() === testUser1.toString());
    const receivedMessages = userRes.body.messages.filter(msg => msg.Recipient.toString() === testUser1.toString());
    
    expect(sentMessages).toHaveLength(1);
    expect(receivedMessages).toHaveLength(2);
  });

  test('Thread management and user message APIs should work together coherently', async () => {
    // 1. Create messages across multiple threads
    await request(app)
      .post('/api/communications/thread')
      .send({
        MessageType: 'email',
        Sender: testUser1,
        Recipient: testUser2,
        Content: 'Thread 1, Message 1',
        ThreadId: 'THREAD-TEST-1'
      })
      .expect(201);

    await request(app)
      .post('/api/communications/thread')
      .send({
        MessageType: 'SMS',
        Sender: testUser2,
        Recipient: testUser1,
        Content: 'Thread 1, Message 2',
        ThreadId: 'THREAD-TEST-1'
      })
      .expect(201);

    await request(app)
      .post('/api/communications/thread')
      .send({
        MessageType: 'notification',
        Sender: testUser1,
        Recipient: testUser3,
        Content: 'Thread 2, Message 1',
        ThreadId: 'THREAD-TEST-2'
      })
      .expect(201);

    // 2. Verify thread-based retrieval
    const thread1Res = await request(app)
      .get('/api/communications/thread/THREAD-TEST-1')
      .expect(200);

    expect(thread1Res.body.messages).toHaveLength(2);

    const thread2Res = await request(app)
      .get('/api/communications/thread/THREAD-TEST-2')
      .expect(200);

    expect(thread2Res.body.messages).toHaveLength(1);

    // 3. Verify user-based retrieval shows messages from multiple threads
    const user1Res = await request(app)
      .get(`/api/communications/user/${testUser1}`)
      .expect(200);

    // User1 should have 3 messages across 2 threads
    expect(user1Res.body.messages).toHaveLength(3);
    
    // Check that the messages come from different threads
    const threadsForUser1 = new Set(user1Res.body.messages.map(msg => msg.ThreadId));
    expect(threadsForUser1.size).toBe(2);
  });
});
