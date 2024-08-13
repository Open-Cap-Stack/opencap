const mongoose = require('mongoose');
const investmentTracker = require('../models/investmentTrackerModel');

describe('Investment Tracker Model', () => {
  beforeAll(async () => {
    const mongoUri = 'mongodb://127.0.0.1/investmentTrackerTestDB';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should create and save an investment tracker successfully', async () => {
    const validTracker = new investmentTracker({
      TrackID: '123',
      Company: 'Test Company',
      EquityPercentage: 10,
      CurrentValue: 1000,
    });

    const savedTracker = await validTracker.save();

    expect(savedTracker._id).toBeDefined();
    expect(savedTracker.TrackID).toBe('123');
    expect(savedTracker.Company).toBe('Test Company');
    expect(savedTracker.EquityPercentage).toBe(10);
    expect(savedTracker.CurrentValue).toBe(1000);
  });

  it('should fail to create an investment tracker without required fields', async () => {
    const invalidTracker = new investmentTracker({});

    let err;
    try {
      await invalidTracker.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.TrackID).toBeDefined();
  });

  // it('should fail to create an investment tracker with duplicate TrackID', async () => {
  //   const tracker1 = new investmentTracker({
  //     TrackID: '123',
  //     Company: 'Company One',
  //     EquityPercentage: 20,
  //     CurrentValue: 2000,
  //   });
  
  //   // Save the first tracker successfully
  //   await tracker1.save();
  
  //   const tracker2 = new investmentTracker({
  //     TrackID: '123', // Duplicate TrackID
  //     Company: 'Company Two',
  //     EquityPercentage: 30,
  //     CurrentValue: 3000,
  //   });

  //   await tracker2.save();
  
  //   let err;
  //   try {
  //     await tracker2.save();
  //   } catch (error) {
  //     err = error;
  //   }
  
  //   // Ensure that err is defined and contains the expected MongoDB duplicate key 