const mongoose = require('mongoose');
const FundraisingRound = require('../models/FundraisingRoundModel');
const { connectDB, disconnectDB } = require('../db');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Fundraising Round Model', () => {
    it('should create and save a fundraising round successfully', async () => {
        const newRound = new FundraisingRound({
            roundId: 'round-001',
            roundName: 'Series A',
            amountRaised: 1000000,
            date: new Date('2024-07-01'),
            investors: ['Investor A', 'Investor B'],
            equityGiven: 20,
            RoundType: 'Seed',
            TermsOfInvestment: 'Standard terms',
            ShareClassesInvolved: ['Common', 'Preferred'],
            LegalDocuments: ['doc1.pdf', 'doc2.pdf']
        });

        const savedRound = await newRound.save();
        expect(savedRound._id).toBeDefined();
        expect(savedRound.roundName).toBe('Series A');
    });

    it('should fail to create a fundraising round without required fields', async () => {
        const newRound = new FundraisingRound({
            roundName: 'Series B',
            amountRaised: 2000000,
            // Missing required fields
        });

        let error;
        try {
            await newRound.save();
        } catch (e) {
            error = e;
        }
        expect(error).toBeDefined();
    });
});
