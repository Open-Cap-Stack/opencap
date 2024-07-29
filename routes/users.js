const request = require('supertest');
const { connectDB, closeDB } = require('../db');
const { startServer, stopServer } = require('../app');
const User = require('../models/User');

let server;
const testPort = 5002;

beforeAll(async () => {
  await connectDB();
  server = await startServer(testPort);
});

afterAll(async () => {
  await stopServer();
  await closeDB();
});

describe('User Routes', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('GET /api/users should return all users', async () => {
    const user = new User({
      userId: 'user1',
      name: 'Test User',
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'password',
      role: 'user',
    });
    await user.save();

    const response = await request(server).get('/api/users');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].username).toBe('testuser');
  });

  it('POST /api/users should create a new user', async () => {
    const userData = {
      userId: 'user2',
      name: 'New User',
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      role: 'user',
    };
    const response = await request(server).post('/api/users').send(userData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.username).toBe('newuser');
  });
});
