const request = require('supertest');
const app = require('../app'); // Your Express app
const mongoose = require('mongoose');
const Company = require('../models/Company');

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true });
});

beforeEach(async () => {
  await Company.deleteMany({}); // Clear companies collection
  const company = new Company({
    companyId: 'test-company-id',
    CompanyName: 'Test Company',
    CompanyType: 'startup', // Assuming 'startup' is one of the valid enum values
    RegisteredAddress: '123 Test Street, Test City, TC',
    TaxID: '123-45-6789',
    corporationDate: new Date(),
  });
  await company.save();
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Company API Test', () => {
  it('should get all companies', async () => {
    const res = await request(app).get('/api/companies');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0); // Ensure that the array is not empty
  });

  it('should create a new company', async () => {
    const newCompany = {
      companyId: 'new-company-id',
      CompanyName: 'New Test Company',
      CompanyType: 'corporation', // Assuming 'corporation' is one of the valid enum values
      RegisteredAddress: '456 New Avenue, New City, NC',
      TaxID: '987-65-4321',
      corporationDate: new Date(),
    };

    const res = await request(app).post('/api/companies').send(newCompany);
    expect(res.statusCode).toEqual(201);
    expect(res.body.companyId).toEqual(newCompany.companyId);
    expect(res.body.CompanyName).toEqual(newCompany.CompanyName);
    expect(res.body.CompanyType).toEqual(newCompany.CompanyType);
    expect(res.body.RegisteredAddress).toEqual(newCompany.RegisteredAddress);
    expect(res.body.TaxID).toEqual(newCompany.TaxID);
    expect(new Date(res.body.corporationDate).toISOString()).toEqual(newCompany.corporationDate.toISOString());
  });

  it('should update an existing company', async () => {
    const company = await Company.findOne(); // Fetch the existing company

    const updatedData = {
      CompanyName: 'Updated Test Company',
      CompanyType: 'corporation',
      RegisteredAddress: '789 Updated Road, Updated City, UC',
      TaxID: '111-22-3333',
      corporationDate: new Date(),
    };

    const res = await request(app).put(`/api/companies/${company._id}`).send(updatedData);
    expect(res.statusCode).toEqual(200);
    expect(res.body.CompanyName).toEqual(updatedData.CompanyName);
    expect(res.body.CompanyType).toEqual(updatedData.CompanyType);
    expect(res.body.RegisteredAddress).toEqual(updatedData.RegisteredAddress);
    expect(res.body.TaxID).toEqual(updatedData.TaxID);
    expect(new Date(res.body.corporationDate).toISOString()).toEqual(updatedData.corporationDate.toISOString());
  });

  it('should delete a company', async () => {
    const company = await Company.findOne(); // Fetch the existing company

    const res = await request(app).delete(`/api/companies/${company._id}`);
    expect(res.statusCode).toEqual(200);

    const deletedCompany = await Company.findById(company._id);
    expect(deletedCompany).toBeNull();
  });
});
