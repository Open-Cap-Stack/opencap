const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../db');

const app = express();
app.use(express.json());
app.use('/api/users', require('../routes/users'));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('User API Test', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        userId: '3',
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'hashed_password',
        role: 'user'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('_id');
    expect(res.body.user).toHaveProperty('name', 'Jane Doe');
  });

  it('should fail to create a user with missing fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        userId: '4'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  });
});
