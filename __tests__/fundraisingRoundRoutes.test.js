// test/fundraisingRoutes.test.js
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const FundraisingRound = require('../models/FundraisingRoundModel');
const { connectDB, disconnectDB } = require('../db');

const app = express();
app.use(express.json());
app.use('/api/fundraisingRoutes', require('../routes/fundraisingRoundRoutes'));

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Fundraising API', () => {
    it('should create a new fundraising round', async () => {
        const response = await request(app)
            .post('/api/fundraisingRoutes/fundraising-rounds')
            .send({
                roundId: 'round-001',
                roundName: 'Series A',
                amountRaised: 1000000,
                date: '2024-07-01',
                investors: ['Investor A', 'Investor B'],
                equityGiven: 20,
                RoundType: 'Series A'
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.roundName).toBe('Series A');
    });

    it('should get all fundraising rounds', async () => {
        const response = await request(app).get('/api/fundraisingRoutes/fundraising-rounds');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should get a fundraising round by ID', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-002',
            roundName: 'Series B',
            amountRaised: 2000000,
            date: '2024-08-01',
            investors: ['Investor C'],
            equityGiven: 25,
            RoundType: 'Series B'
        });
        const savedRound = await newRound.save();

        const response = await request(app).get(`/api/fundraisingRoutes/fundraising-rounds/${savedRound._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.roundName).toBe('Series B');
    });

    it('should update a fundraising round by ID', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-003',
            roundName: 'Series C',
            amountRaised: 3000000,
            date: '2024-09-01',
            investors: ['Investor D'],
            equityGiven: 30,
            RoundType: 'Series C'
        });
        const savedRound = await newRound.save();

        const response = await request(app)
            .put(`/api/fundraisingRoutes/fundraising-rounds/${savedRound._id}`)
            .send({ amountRaised: 3500000 });

        expect(response.statusCode).toBe(200);
        expect(response.body.amountRaised).toBe(3500000);
    });

    it('should delete a fundraising round by ID', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-004',
            roundName: 'Series D',
            amountRaised: 4000000,
            date: '2024-10-01',
            investors: ['Investor E'],
            equityGiven: 35,
            RoundType: 'Series D'
        });
        const savedRound = await newRound.save();

        const response = await request(app).delete(`/api/fundraisingRoutes/fundraising-rounds/${savedRound._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Fundraising round deleted');
    });
});
