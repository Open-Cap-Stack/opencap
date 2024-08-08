const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const EquityPlan = require('../models/EquityPlanModel');

const app = express();
app.use(express.json());
app.use('/api/equityPlanRoutes', require('../routes/equityPlanRoutes'));

beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/testDB', { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Equity Plan API', () => {
    it('should create a new equity plan', async () => {
        const response = await request(app)
            .post('/api/equityPlanRoutes/equity-plans')
            .send({
                planName: 'Employee Stock Option Plan',
                description: 'An equity plan for employees',
                startDate: '2024-07-01',
                allocation: 100000,
                participants: ['Participant A', 'Participant B']
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.planName).toBe('Employee Stock Option Plan');
    });

    it('should get all equity plans', async () => {
        const response = await request(app).get('/api/equityPlanRoutes/equity-plans');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should get an equity plan by ID', async () => {
        const newPlan = new EquityPlan({
            planName: 'Executive Stock Option Plan',
            description: 'An equity plan for executives',
            startDate: '2024-08-01',
            allocation: 50000,
            participants: ['Participant C']
        });
        const savedPlan = await newPlan.save();

        const response = await request(app).get(`/api/equityPlanRoutes/equity-plans/${savedPlan._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.planName).toBe('Executive Stock Option Plan');
    });

    it('should update an equity plan by ID', async () => {
        const newPlan = new EquityPlan({
            planName: 'Manager Stock Option Plan',
            description: 'An equity plan for managers',
            startDate: '2024-09-01',
            allocation: 75000,
            participants: ['Participant D']
        });
        const savedPlan = await newPlan.save();

        const response = await request(app)
            .put(`/api/equityPlanRoutes/equity-plans/${savedPlan._id}`)
            .send({ allocation: 80000 });

        expect(response.statusCode).toBe(200);
        expect(response.body.allocation).toBe(80000);
    });

    it('should delete an equity plan by ID', async () => {
        const newPlan = new EquityPlan({
            planName: 'Leadership Stock Option Plan',
            description: 'An equity plan for leadership team',
            startDate: '2024-10-01',
            allocation: 120000,
            participants: ['Participant E']
        });
        const savedPlan = await newPlan.save();

        const response = await request(app).delete(`/api/equityPlanRoutes/equity-plans/${savedPlan._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Equity plan deleted');
    });
});
