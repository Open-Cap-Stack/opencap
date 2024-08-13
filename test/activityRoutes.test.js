const request = require('supertest');
const app = require('../app'); // Your Express app
const mongoose = require('mongoose');
const Activity = require('../models/Activity');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
});

beforeEach(async () => {
  await Activity.deleteMany({}); // Clear activities collection
  const activity = new Activity({
    name: 'Test Activity',
    description: 'This is a test activity',
    date: new Date(),
    type: 'meeting',
    participants: [],
    status: 'pending',
    createdBy: new mongoose.Types.ObjectId(),
  });
  await activity.save();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Activity API Test', () => {
  it('should get all activities', async () => {
    const res = await request(app).get('/api/activities');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0); // Ensure that the array is not empty
  });
});
