const mongoose = require('mongoose');
const ShareClass = require('../models/ShareClass');
const connectDB = require('../db');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await ShareClass.deleteMany({});
});

describe('ShareClass Model Test', () => {
  it('create & save share class successfully', async () => {
    const shareClassData = { shareClassId: 'unique_id_1', name: 'Common Shares', authorizedShares: 7000000, dilutedShares: 4500000, ownershipPercentage: 53, amountRaised: 10000000 };
    const validShareClass = new ShareClass(shareClassData);
    const savedShareClass = await validShareClass.save();

    expect(savedShareClass._id).toBeDefined();
    expect(savedShareClass.shareClassId).toBe(shareClassData.shareClassId);
    expect(savedShareClass.name).toBe(shareClassData.name);
    expect(savedShareClass.authorizedShares).toBe(shareClassData.authorizedShares);
    expect(savedShareClass.dilutedShares).toBe(shareClassData.dilutedShares);
    expect(savedShareClass.ownershipPercentage).toBe(shareClassData.ownershipPercentage);
    expect(savedShareClass.amountRaised).toBe(shareClassData.amountRaised);
  });

  it('should not save share class with undefined fields', async () => {
    const shareClassWithoutRequiredField = new ShareClass({ shareClassId: 'unique_id_2' });
    let err;
    try {
      const savedShareClassWithoutRequiredField = await shareClassWithoutRequiredField.save();
      error = savedShareClassWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.authorizedShares).toBeDefined();
    expect(err.errors.dilutedShares).toBeDefined();
    expect(err.errors.ownershipPercentage).toBeDefined();
    expect(err.errors.amountRaised).toBeDefined();
  });
});
