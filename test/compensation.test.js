const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const CompensationBenchmark = require('../models/compensationBenchmarkModel');

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

describe('Compensation Management', () => {

  beforeEach(async () => {
    // Reset the database before each test
    await CompensationBenchmark.deleteMany({});
  });

  it('should fetch compensation benchmark attributes', async () => {
    const res = await request(app).get('/api/v2/compensation/benchmarks/attributes');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('compensation_types');
    expect(res.body).toHaveProperty('industries');
    expect(res.body).toHaveProperty('percentiles');
  });

  it('should retrieve compensation benchmarks', async () => {
    await CompensationBenchmark.create({ id: '1', corporationId: 'corp1', benchmarks_version_datetime: new Date(), compensation_type: 'SALARY', percentile: 'P50' });

    const res = await request(app).get('/api/v2/compensation/benchmarks?corporationId=corp1');

    expect(res.statusCode).toEqual(200);
    expect(res.body.benchmarks.length).toEqual(1);
  });

  it('should update a compensation benchmark', async () => {
    const benchmark = await CompensationBenchmark.create({ id: '1', corporationId: 'corp1', benchmarks_version_datetime: new Date(), compensation_type: 'SALARY', percentile: 'P50' });

    const res = await request(app)
      .put(`/api/v2/compensation/benchmarks/${benchmark._id}`)
      .send({ compensation_type: 'EQUITY_AS_FULLY_DILUTED_PERCENT' });

    expect(res.statusCode).toEqual(200);
    expect(res.body.compensation_type).toEqual('EQUITY_AS_FULLY_DILUTED_PERCENT');
  });

});
