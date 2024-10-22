const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { connectDB } = require('../db');

describe('Activity Model Test', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should throw validation error if required fields are missing', async () => {
    const activity = new Activity({});
    let err;

    try {
      await activity.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.activityId).toBeDefined();
    expect(err.errors.activityType).toBeDefined();
    expect(err.errors.timestamp).toBeDefined();
    expect(err.errors.userInvolved).toBeDefined();
  });

  it('should save a valid activity', async () => {
    const validActivity = new Activity({
      activityId: 'ACT123',
      activityType: 'DocumentUpload',
      timestamp: new Date(),
      userInvolved: new mongoose.Types.ObjectId(),
      changesMade: 'Uploaded new document',
      relatedObjects: ['DOC001'],
    });

    const savedActivity = await validActivity.save();
    expect(savedActivity._id).toBeDefined();
    expect(savedActivity.activityId).toBe('ACT123');
  });
});
