const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const activityRouter = require('../routes/activityRoutes');
const Activity = require('../models/Activity');
const { connectDB } = require('../db');

const app = express();
app.use(express.json());
app.use('/activities', activityRouter);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Activity Routes Test', () => {
  let activityId;s

  it('POST /activities - should create a new activity', async () => {
    const response = await request(app)
      .post('/activities')
      .send({
        activityId: 'ACT123',
        activityType: 'DocumentUpload',
        timestamp: new Date(),
        userInvolved: new mongoose.Types.ObjectId(),
        changesMade: 'Uploaded new document',
        relatedObjects: ['DOC001'],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body._id).toBeDefined();
    activityId = response.body._id;
  });

  it('GET /activities/:id - should fetch an activity by ID', async () => {
    const response = await request(app).get(`/activities/${activityId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('activityId', 'ACT123');
  });

  it('GET /activities - should fetch all activities', async () => {
    const response = await request(app).get('/activities');
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it('PUT /activities/:id - should update an activity', async () => {
    const response = await request(app)
      .put(`/activities/${activityId}`)
      .send({
        activityId: 'ACT123',
        activityType: 'StakeholderUpdate',
        timestamp: new Date(),
        userInvolved: new mongoose.Types.ObjectId(),
        changesMade: 'Updated stakeholder details',
        relatedObjects: ['STA001'],
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.activityType).toBe('StakeholderUpdate');
  });

  it('DELETE /activities/:id - should delete an activity', async () => {
    const response = await request(app).delete(`/activities/${activityId}`);
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Activity deleted');
  });
});
