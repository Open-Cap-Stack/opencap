const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Corporation = require('../models/corporationModel');

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

describe('Corporation Management', () => {

  beforeEach(async () => {
    // Reset the database before each test
    await Corporation.deleteMany({});
  });

  it('should list corporations with pagination', async () => {
    await Corporation.create({ id: '1', legalName: 'Corp One' });
    await Corporation.create({ id: '2', legalName: 'Corp Two' });

    const res = await request(app).get('/api/v2/corporations?page=1&limit=10');

    expect(res.statusCode).toEqual(200);
    expect(res.body.corporations.length).toEqual(2);
    expect(res.body.corporations[0].legalName).toEqual('Corp One');
  });

  it('should create a new corporation', async () => {
    const res = await request(app)
      .post('/api/v2/corporations')
      .send({ id: '1', legalName: 'Corp One', website: 'http://corpone.com' });

    expect(res.statusCode).toEqual(201);
    expect(res.body.legalName).toEqual('Corp One');
  });

  it('should update a corporation\'s details', async () => {
    const corp = await Corporation.create({ id: '1', legalName: 'Corp One' });

    const res = await request(app)
      .put(`/api/v2/corporations/${corp._id}`)
      .send({ legalName: 'Corp One Updated' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.legalName).toEqual('Corp One Updated');
  });

  it('should delete a corporation', async () => {
    const corp = await Corporation.create({ id: '1', legalName: 'Corp One' });

    const res = await request(app)
      .delete(`/api/v2/corporations/${corp._id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Corporation deleted successfully');
    
    const findRes = await Corporation.findById(corp._id);
    expect(findRes).toBeNull();
  });

});
