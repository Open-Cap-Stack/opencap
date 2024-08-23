const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Issuer = require('../models/issuerModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Issuer Management', () => {
  beforeEach(async () => {
    await Issuer.deleteMany({});
  });

  it('should list issuers', async () => {
    await Issuer.create({ id: '1', legalName: 'MangoCart, Inc.', dateOfIncorporation: new Date(), countryOfIncorporation: 'USA' });

    const res = await request(app).get('/api/v2/issuers');
    expect(res.statusCode).toEqual(200);
    expect(res.body.issuers.length).toEqual(1);
  });

  it('should create a new issuer', async () => {
    const res = await request(app).post('/api/v2/issuers').send({ legalName: 'MangoCart, Inc.', dateOfIncorporation: new Date(), countryOfIncorporation: 'USA' });

    expect(res.statusCode).toEqual(201);
    expect(res.body.legalName).toEqual('MangoCart, Inc.');
  });

  it('should update issuer details', async () => {
    const issuer = await Issuer.create({ id: '1', legalName: 'MangoCart, Inc.', dateOfIncorporation: new Date(), countryOfIncorporation: 'USA' });

    const res = await request(app).put(`/api/v2/issuers/${issuer._id}`).send({ legalName: 'MangoCart, Ltd.' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.legalName).toEqual('MangoCart, Ltd.');
  });

  it('should delete an issuer', async () => {
    const issuer = await Issuer.create({ id: '1', legalName: 'MangoCart, Inc.', dateOfIncorporation: new Date(), countryOfIncorporation: 'USA' });

    const res = await request(app).delete(`/api/v2/issuers/${issuer._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Issuer deleted');
  });
});
