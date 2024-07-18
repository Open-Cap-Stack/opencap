const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const connectDB = require('../db');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Activity.deleteMany({});
});

describe('Activity Model Test', () => {
  it('should create & save an activity successfully', async () => {
    const validActivity = new Activity({
      name: 'Test Activity',
      description: 'This is a test activity',
      date: '2024-07-20T00:00:00.000Z',
      type: 'meeting',
      participants: [],
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId(),
      participants: [new mongoose.Types.ObjectId()],
    });
    const savedActivity = await validActivity.save();
    expect(savedActivity._id).toBeDefined();
    expect(savedActivity.name).toBe(validActivity.name);
    expect(savedActivity.description).toBe(validActivity.description);
    expect(savedActivity.date).toBe(validActivity.date);
    expect(savedActivity.type).toBe(validActivity.type);
    expect(savedActivity.status).toBe(validActivity.status);
    expect(savedActivity.createdBy).toBe(validActivity.createdBy);
    expect(savedActivity.participants).toEqual(
      expect.arrayContaining(savedActivity.participants)
    );
  });

  it('should fail to create an activity without required fields', async () => {
    const activityWithoutRequiredField = new Activity({
      name: 'Test Activity',
    });
    let err;
    try {
      const savedActivityWithoutRequiredField =
        await activityWithoutRequiredField.save();
      err = savedActivityWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.description).toBeDefined();
    expect(err.errors.date).toBeDefined();
    expect(err.errors.type).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });

  test('should have default createdAt and updatedAt fields', async () => {
    const activityData = {
      name: 'Running',
      description: 'Morning run in the park',
      date: new Date('2024-07-18'),
      type: 'Exercise',
      status: 'Planned',
      createdBy: new mongoose.Types.ObjectId(),
      participants: [new mongoose.Types.ObjectId()],
    };

    const activity = new Activity(activityData);
    const savedActivity = await activity.save();

    expect(savedActivity.createdAt).toBeDefined();
    expect(savedActivity.updatedAt).toBeDefined();
  });

  it('should ignore fields not defined in the schema when saving', async () => {
    const activityWithInvalidField = new Activity({
      name: 'Test Activity',
      description: 'This is a test activity',
      date: '2024-07-20T00:00:00.000Z',
      type: 'meeting',
      participants: [],
      status: 'pending',
      createdBy: new mongoose.Types.ObjectId(),
      invalidField: 'should not be saved',
    });
    const savedActivityWithInvalidField = await activityWithInvalidField.save();
    expect(savedActivityWithInvalidField._id).toBeDefined();

    // Check that the invalidField was not saved in the document
    expect(savedActivityWithInvalidField.invalidField).toBeUndefined();
  });
});
