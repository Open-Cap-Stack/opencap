const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const ShareClass = require('../models/ShareClass'); // Ensure this import
const connectDB = require('../db');

const app = express();
app.use(express.json());
app.use('/api/shareclasses', require('../routes/shareClasses'));

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

describe('ShareClass API Test', () => {
  it('should create a new share class', async () => {
    const res = await request(app)
      .post('/api/shareclasses')
      .send({
        shareClassId: '3',
        name: 'Series A',
        authorizedShares: 5000000,
        dilutedShares: 3000000,
        ownershipPercentage: 20,
        amountRaised: 5000000
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('shareClass');
    expect(res.body.shareClass).toHaveProperty('_id');
    expect(res.body.shareClass).toHaveProperty('name', 'Series A');
  }, 10000);

  it('should fail to create a share class with missing fields', async () => {
    const res = await request(app)
      .post('/api/shareclasses')
      .send({
        shareClassId: '4'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  }, 10000);

  it('should get all share classes', async () => {
    const res = await request(app).get('/api/shareclasses');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('shareClasses');
    expect(res.body.shareClasses).toBeInstanceOf(Array);
  }, 10000);

  it('should get a share class by ID', async () => {
    const shareClass = new ShareClass({
      shareClassId: '5',
      name: 'Series B',
      authorizedShares: 4000000,
      dilutedShares: 2500000,
      ownershipPercentage: 25,
      amountRaised: 4000000
    });
    await shareClass.save();

    const res = await request(app).get(`/api/shareclasses/${shareClass._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('shareClass');
    expect(res.body.shareClass).toHaveProperty('_id', shareClass._id.toString());
  }, 10000);

  it('should update a share class by ID', async () => {
    const shareClass = new ShareClass({
      shareClassId: '6',
      name: 'Series C',
      authorizedShares: 3000000,
      dilutedShares: 2000000,
      ownershipPercentage: 30,
      amountRaised: 3000000
    });
    await shareClass.save();

    const res = await request(app)
      .put(`/api/shareclasses/${shareClass._id}`)
      .send({
        name: 'Series C Updated',
        authorizedShares: 3500000,
        dilutedShares: 2500000,
        ownershipPercentage: 35,
        amountRaised: 3500000
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('shareClass');
    expect(res.body.shareClass).toHaveProperty('name', 'Series C Updated');
  }, 10000);

  it('should delete a share class by ID', async () => {
    const shareClass = new ShareClass({
      shareClassId: '7',
      name: 'Series D',
      authorizedShares: 2000000,
      dilutedShares: 1500000,
      ownershipPercentage: 15,
      amountRaised: 2000000
    });
    await shareClass.save();

    const res = await request(app).delete(`/api/shareclasses/${shareClass._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Share class deleted');
  }, 10000);
});
