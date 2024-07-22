const mongoose = require('mongoose');
const { connectDB } = require('../db');
const ShareClass = require('../models/ShareClass');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('ShareClass Model Test', () => {
  it('create & save share class successfully', async () => {
    const shareClassData = {
      shareClassId: 'class1',
      name: 'Class A',
      description: 'Description of Class A',
      amountRaised: 1000000,
      ownershipPercentage: 10,
      dilutedShares: 1000,
      authorizedShares: 10000,
    };
    const validShareClass = new ShareClass(shareClassData);
    const savedShareClass = await validShareClass.save();
    expect(savedShareClass._id).toBeDefined();
    expect(savedShareClass.shareClassId).toBe(shareClassData.shareClassId);
    expect(savedShareClass.name).toBe(shareClassData.name);
    expect(savedShareClass.description).toBe(shareClassData.description);
    expect(savedShareClass.amountRaised).toBe(shareClassData.amountRaised);
    expect(savedShareClass.ownershipPercentage).toBe(shareClassData.ownershipPercentage);
    expect(savedShareClass.dilutedShares).toBe(shareClassData.dilutedShares);
    expect(savedShareClass.authorizedShares).toBe(shareClassData.authorizedShares);
  });
});
