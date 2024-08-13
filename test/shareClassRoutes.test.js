const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const ShareClass = require('../models/ShareClass');
const { connectDB, disconnectDB } = require('../db');

const PORT = 5006; // Ensure a unique port

describe('ShareClass Routes', () => {
  let server;

  beforeAll(async () => {
    await connectDB();
    server = app.listen(PORT);
  });

  afterAll(async () => {
    await server.close();
    await disconnectDB();
  });

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
      authorizedShares: 10000
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
      authorizedShares: 20000
    };

    const response = await request(server).post('/api/shareClasses').send(shareClassData);
    console.log('POST response:', response.body);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Class B');
  });

  it('PUT /api/shareClasses/:id should update a share class', async () => {
    const shareClass = new ShareClass({
      shareClassId: 'class3',
      name: 'Update Class',
      description: 'Description of Update Class',
      amountRaised: 3000000,
      ownershipPercentage: 30,
      dilutedShares: 3000,
      authorizedShares: 30000
    });
    await shareClass.save();

    const updatedData = { name: 'Updated Class' };
    const response = await request(server)
      .put(`/api/shareClasses/${shareClass._id}`)
      .send(updatedData);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Class');
  });

  it('DELETE /api/shareClasses/:id should delete a share class', async () => {
    const shareClass = new ShareClass({
      shareClassId: 'class4',
      name: 'Delete Class',
      description: 'Description of Delete Class',
      amountRaised: 4000000,
      ownershipPercentage: 40,
      dilutedShares: 4000,
      authorizedShares: 40000
    });
    await shareClass.save();

    const response = await request(server).delete(`/api/shareClasses/${shareClass._id}`);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Share class deleted');
  });
});
