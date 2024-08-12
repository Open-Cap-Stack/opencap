const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const app = express();

app.use(express.json());
app.use('/api/activities', require('../routes/activity')); // Ensure this route matches

beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

beforeEach(async () => {
    await Activity.deleteMany({});
});

describe('Activity API Test', () => {
    it('should create a new activity', async () => {
        const res = await request(app)
            .post('/api/activities')
            .send({
                activityId: '5',
                name: 'activity10',
                description: 'I am description!',
                date: '2024-07-20T00:00:00.000Z',
                type: 'meeting',
                participants: [new mongoose.Types.ObjectId()],
                status: 'pending',
                createdBy: new mongoose.Types.ObjectId(),
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('description');
        expect(res.body).toHaveProperty('_id');
        expect(res.body).toHaveProperty('name', 'activity10');
    });

    it('should fail to create an activity with missing fields', async () => {
        const res = await request(app).post('/api/activities').send({
            activityId: '4',
            name: 'activity10', // Include required fields to ensure failure
            description: 'Incomplete data test',
            date: '2024-07-20T00:00:00.000Z',
            type: 'meeting',
            status: 'pending', // Include required fields
            createdBy: new mongoose.Types.ObjectId(), // Include required fields
        });

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('message');
    });

    it('should get all activities', async () => {
        const res = await request(app).get('/api/activities');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
    });

    it('should get an activity by ID', async () => {
        const activity = new Activity({
            activityId: '5',
            name: 'Test Activity',
            description: 'This is a test activity',
            date: '2024-07-20T00:00:00.000Z',
            type: 'meeting',
            participants: [new mongoose.Types.ObjectId()],
            status: 'pending',
            createdBy: new mongoose.Types.ObjectId(),
        });
        await activity.save();

        const res = await request(app).get(`/api/activities/${activity._id}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('description');
        expect(res.body).toHaveProperty('_id', activity._id.toString());
    });

    it('should update an activity by ID', async () => {
        const activity = new Activity({
            activityId: '6',
            name: 'Test Activity 6',
            description: 'This is a test activity 6',
            date: '2024-07-20T00:00:00.000Z',
            type: 'meeting',
            participants: [new mongoose.Types.ObjectId()],
            status: 'pending',
            createdBy: new mongoose.Types.ObjectId(),
        });
        await activity.save();

        const res = await request(app)
            .put(`/api/activities/${activity._id}`)
            .send({
                name: 'updated 6',
                description: 'updated This is a test activity 6',
                status: 'completed' // Include required fields
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('description');
        expect(res.body).toHaveProperty('name', 'updated 6');
    });

    it('should delete an activity by ID', async () => {
        const activity = new Activity({
            activityId: '7',
            name: 'Test Activity 7',
            description: 'This is a test activity 7',
            date: '2024-07-20T00:00:00.000Z',
            type: 'meeting',
            participants: [new mongoose.Types.ObjectId()],
            status: 'pending',
            createdBy: new mongoose.Types.ObjectId(),
        });
        await activity.save();

        const res = await request(app).delete(`/api/activities/${activity._id}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('message', 'Activity deleted');
    });
});
