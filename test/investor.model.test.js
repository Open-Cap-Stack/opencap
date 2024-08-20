const mongoose = require('mongoose');
const Investor = require('../models/Investor');
const { connectDB } = require('../db');

describe('Investor Model', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new investor', async () => {
    const investorData = {
      investorId: '12345',
      investmentAmount: 10000,
      equityPercentage: 10,
      investorType: 'Angel',
      relatedFundraisingRound: mongoose.Types.ObjectId(),
    };

    const investor = new Investor(investorData);
    await investor.save();

    expect(investor._id).toBeDefined();
    expect(investor.investorId).toBe(investorData.investorId);
    expect(investor.investmentAmount).toBe(investorData.investmentAmount);
    expect(investor.equityPercentage).toBe(investorData.equityPercentage);
    expect(investor.investorType).toBe(investorData.investorType);
    expect(investor.relatedFundraisingRound).toBeDefined();
  });

  it('should throw an error if investorId is not provided', async () => {
    const investorData = {
      investmentAmount: 10000,
      equityPercentage: 10,
      investorType: 'Angel',
      relatedFundraisingRound: mongoose.Types.ObjectId(),
    };

    try {
      const investor = new Investor(investorData);
      await investor.save();
    } catch (error) {
      expect(error.message).toContain(
        'Investor validation failed: investorId: Path `investorId` is required.'
      );
    }
  });

  it('should throw an error if investmentAmount is not provided', async () => {
    const investorData = {
      investorId: '12345',
      equityPercentage: 10,
      investorType: 'Angel',
      relatedFundraisingRound: mongoose.Types.ObjectId(),
    };

    try {
      const investor = new Investor(investorData);
      await investor.save();
    } catch (error) {
      expect(error.message).toContain(
        'Investor validation failed: investmentAmount: Path `investmentAmount` is required.'
      );
    }
  });

  it('should throw an error if equityPercentage is not provided', async () => {
    const investorData = {
      investorId: '12345',
      investmentAmount: 10000,
      investorType: 'Angel',
      relatedFundraisingRound: mongoose.Types.ObjectId(),
    };

    try {
      const investor = new Investor(investorData);
      await investor.save();
    } catch (error) {
      expect(error.message).toContain(
        'Investor validation failed: equityPercentage: Path `equityPercentage` is required.'
      );
    }
  });

  it('should throw an error if investorType is not provided', async () => {
    const investorData = {
      investorId: '12345',
      investmentAmount: 10000,
      equityPercentage: 10,
      relatedFundraisingRound: mongoose.Types.ObjectId(),
    };

    try {
      const investor = new Investor(investorData);
      await investor.save();
    } catch (error) {
      expect(error.message).toContain(
        'Investor validation failed: investorType: Path `investorType` is required.'
      );
    }
  });

  it('should throw an error if relatedFundraisingRound is not provided', async () => {
    const investorData = {
      investorId: '12345',
      investmentAmount: 10000,
      equityPercentage: 10,
      investorType: 'Angel',
    };

    try {
      const investor = new Investor(investorData);
      await investor.save();
    } catch (error) {
      expect(error.message).toContain(
        'Investor validation failed: relatedFundraisingRound: Path `relatedFundraisingRound` is required.'
      );
    }
  });

  it('should throw validation error if required fields are missing', async () => {
    const investor = new Investor({});
    let err;

    try {
      await investor.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.investorId).toBeDefined();
    expect(err.errors.investmentAmount).toBeDefined();
    expect(err.errors.equityPercentage).toBeDefined();
    expect(err.errors.investorType).toBeDefined();
    expect(err.errors.relatedFundraisingRound).toBeDefined();
  });
});
