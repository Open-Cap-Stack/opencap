const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Stakeholder = require('../models/Stakeholder');
const connectDB = require('../db');

const app = express();
app.use(express.json());
app.use('/api/stakeholders', require('../routes/stakeholders'));

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

describe('Stakeholder API Test', () => {
  it('should create a new stakeholder', async () => {
    const res = await request(app)
      .post('/api/stakeholders')
      .send({
        stakeholderId: '3',
        name: 'Jane Doe',
        ownershipPercentage: 10,
        sharesOwned: 1000000
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('stakeholder');
    expect(res.body.stakeholder).toHaveProperty('_id');
    expect(res.body.stakeholder).toHaveProperty('name', 'Jane Doe');
  }, 10000);

  it('should fail to create a stakeholder with missing fields', async () => {
    const res = await request(app)
      .post('/api/stakeholders')
      .send({
        stakeholderId: '4'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error');
  }, 10000);

  it('should get all stakeholders', async () => {
    const res = await request(app).get('/api/stakeholders');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('stakeholders');
    expect(res.body.stakeholders).toBeInstanceOf(Array);
  }, 10000);

  it('should get a stakeholder by ID', async () => {
    const stakeholder = new Stakeholder({ stakeholderId: '5', name: 'Alice', ownershipPercentage: 15, sharesOwned: 1500000 });
    await stakeholder.save();

    const res = await request(app).get(`/api/stakeholders/${stakeholder._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('stakeholder');
    expect(res.body.stakeholder).toHaveProperty('_id', stakeholder._id.toString());
  }, 10000);

  it('should update a stakeholder by ID', async () => {
    const stakeholder = new Stakeholder({ stakeholderId: '6', name: 'Bob', ownershipPercentage: 20, sharesOwned: 2000000 });
    await stakeholder.save();

    const res = await request(app)
      .put(`/api/stakeholders/${stakeholder._id}`)
      .send({
        name: 'Robert',
        ownershipPercentage: 25,
        sharesOwned: 2500000
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('stakeholder');
    expect(res.body.stakeholder).toHaveProperty('name', 'Robert');
  }, 10000);

  it('should delete a stakeholder by ID', async () => {
    const stakeholder = new Stakeholder({ stakeholderId: '7', name: 'Charlie', ownershipPercentage: 30, sharesOwned: 3000000 });
    await stakeholder.save();

    const res = await request(app).delete(`/api/stakeholders/${stakeholder._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Stakeholder deleted');
  }, 10000);
});
