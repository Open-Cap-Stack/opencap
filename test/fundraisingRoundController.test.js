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

describe('Fundraising Round API', () => {
    it('should create a new fundraising round', async () => {
        const response = await request(app)
            .post('/api/fundraisingRoutes/fundraising-rounds')
            .send({
                roundId: 'round-002',
                roundName: 'Series B',
                amountRaised: 2000000,
                date: '2024-08-01',
                investors: ['Investor C'],
                equityGiven: 25,
                RoundType: 'Series A',
                TermsOfInvestment: 'Preferred terms',
                ShareClassesInvolved: ['Preferred'],
                LegalDocuments: ['doc3.pdf']
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.roundName).toBe('Series B');
    });

    it('should get all fundraising rounds', async () => {
        const response = await request(app).get('/api/fundraisingRoutes/fundraising-rounds');
        expect(response.statusCode).toBe(200);
        expect(response.body).toBeInstanceOf(Array);
    });

    it('should get a fundraising round by ID', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-003',
            roundName: 'Series C',
            amountRaised: 3000000,
            date: '2024-09-01',
            investors: ['Investor D'],
            equityGiven: 30,
            RoundType: 'Series B',
            TermsOfInvestment: 'Convertible notes',
            ShareClassesInvolved: ['Common'],
            LegalDocuments: ['doc4.pdf']
        });
        const savedRound = await newRound.save();

        const response = await request(app).get(`/api/fundraisingRoutes/fundraising-rounds/${savedRound._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.roundName).toBe('Series C');
    });

    it('should update a fundraising round by ID', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-004',
            roundName: 'Series D',
            amountRaised: 4000000,
            date: '2024-10-01',
            investors: ['Investor E'],
            equityGiven: 35,
            RoundType: 'Series C',
            TermsOfInvestment: 'Equity',
            ShareClassesInvolved: ['Preferred'],
            LegalDocuments: ['doc5.pdf']
        });
        const savedRound = await newRound.save();

        const response = await request(app)
            .put(`/api/fundraisingRoutes/fundraising-rounds/${savedRound._id}`)
            .send({ amountRaised: 4500000 });

        expect(response.statusCode).toBe(200);
        expect(response.body.amountRaised).toBe(4500000);
    });

    it('should delete a fundraising round by ID', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-005',
            roundName: 'Series E',
            amountRaised: 5000000,
            date: '2024-11-01',
            investors: ['Investor F'],
            equityGiven: 40,
            RoundType: 'Series D',
            TermsOfInvestment: 'Standard',
            ShareClassesInvolved: ['Common'],
            LegalDocuments: ['doc6.pdf']
        });
        const savedRound = await newRound.save();

        const response = await request(app).delete(`/api/fundraisingRoutes/fundraising-rounds/${savedRound._id}`);
        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Fundraising round deleted');
    });
});
