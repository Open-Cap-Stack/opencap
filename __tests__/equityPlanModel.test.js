const mongoose = require('mongoose');
const EquityPlan = require('../models/EquityPlanModel');
const { connectDB, disconnectDB } = require('../db');

beforeAll(async () => {
    await connectDB();
  });
  
  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

describe('EquityPlan Model', () => {
    it('should create a new equity plan', async () => {
        const plan = new EquityPlan({
            planId: '9999',
            planName: 'Test Equity Plan',
            startDate: new Date(),
            allocation: 50000,
            PlanType: 'Restricted Stock Plan'
        });
        const savedPlan = await plan.save();
        expect(savedPlan.planName).toBe('Test Equity Plan');
        expect(savedPlan.planId).toBe('9999');
    });

    it('should not create a plan without required fields', async () => {
        const plan = new EquityPlan({
            planName: 'Invalid Plan',
            allocation: 20000
        });

        await expect(plan.save()).rejects.toThrow();
    });
});
