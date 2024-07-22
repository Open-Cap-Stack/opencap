const request = require('supertest');
const { connectDB, disconnectDB } = require('../db');
const app = require('../app');
const ShareClass = require('../models/ShareClass');

let server;

beforeAll(async () => {
  await connectDB();
  server = app.listen(5003);
});

afterAll(async () => {
  await server.close();
  await disconnectDB();
});

describe('ShareClass Routes', () => {
  beforeEach(async () => {
    await ShareClass.deleteMany({});
  });

  it('GET /api/shareClasses should return all share classes', async () => {
    const shareClass = new ShareClass({
      shareClassId: 'class1',
      name: 'Class A',
      description: 'Description of Class A',
      amountRaised: 1000000,
      ownershipPercentage: 10,
      dilutedShares: 1000,
      authorizedShares: 10000,
    });
    await shareClass.save();

    const response = await request(server).get('/api/shareClasses');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe('Class A');
  });

  it('POST /api/shareClasses should create a new share class', async () => {
    const shareClassData = {
      shareClassId: 'class2',
      name: 'Class B',
      description: 'Description of Class B',
      amountRaised: 2000000,
      ownershipPercentage: 20,
      dilutedShares: 2000,
      authorizedShares: 20000,
    };
    const response = await request(server).post('/api/shareClasses').send(shareClassData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Class B');
  });
});
