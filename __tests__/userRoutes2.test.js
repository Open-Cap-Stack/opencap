const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const { connectDB, disconnectDB } = require('../db');

const PORT = 5005; // Ensure a unique port

describe('User Routes', () => {
  let server;

  beforeAll(async () => {
    await connectDB();
    server = app.listen(PORT);
  });

  afterAll(async () => {
    await server.close();
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('GET /api/users should return all users', async () => {
    const user = new User({
      userId: 'user1',
      name: 'User One',
      username: 'userone',
      email: 'userone@example.com',
      password: 'password123',
      role: 'user'
    });
    await user.save();

    const response = await request(server).get('/api/users');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe('User One');
  });

  it('POST /api/users should create a new user', async () => {
    const userData = {
      userId: 'user2',
      name: 'New User',
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      role: 'user'
    };

    const response = await request(server).post('/api/users').send(userData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('New User');
  });

  it('PUT /api/users/:id should update a user', async () => {
    const user = new User({
      userId: 'user3',
      name: 'Update User',
      username: 'updateuser',
      email: 'updateuser@example.com',
      password: 'password123',
      role: 'user'
    });
    await user.save();

    const updatedData = { name: 'Updated User' };
    const response = await request(server).put(`/api/users/${user._id}`).send(updatedData);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated User');
  });

  it('DELETE /api/users/:id should delete a user', async () => {
    const user = new User({
      userId: 'user4',
      name: 'Delete User',
      username: 'deleteuser',
      email: 'deleteuser@example.com',
      password: 'password123',
      role: 'user'
    });
    await user.save();

    const response = await request(server).delete(`/api/users/${user._id}`);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Delete User');
  });
});
