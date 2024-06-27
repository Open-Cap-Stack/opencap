const mongoose = require('mongoose');
const Stakeholder = require('../models/Stakeholder');
const connectDB = require('../db');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Stakeholder.deleteMany({});
});

describe('Stakeholder Model Test', () => {
  it('create & save stakeholder successfully', async () => {
    const stakeholderData = { stakeholderId: 'unique_id_1', name: 'Allen Smith', ownershipPercentage: 27, sharesOwned: 2000000 };
    const validStakeholder = new Stakeholder(stakeholderData);
    const savedStakeholder = await validStakeholder.save();

    expect(savedStakeholder._id).toBeDefined();
    expect(savedStakeholder.stakeholderId).toBe(stakeholderData.stakeholderId);
    expect(savedStakeholder.name).toBe(stakeholderData.name);
    expect(savedStakeholder.ownershipPercentage).toBe(stakeholderData.ownershipPercentage);
    expect(savedStakeholder.sharesOwned).toBe(stakeholderData.sharesOwned);
  });

  it('should not save stakeholder with undefined fields', async () => {
    const stakeholderWithoutRequiredField = new Stakeholder({ stakeholderId: 'unique_id_2' });
    let err;
    try {
      const savedStakeholderWithoutRequiredField = await stakeholderWithoutRequiredField.save();
      error = savedStakeholderWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.ownershipPercentage).toBeDefined();
    expect(err.errors.sharesOwned).toBeDefined();
  });
});
