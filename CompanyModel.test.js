const mongoose = require('mongoose');
const chai = require('chai');
const expect = chai.expect;
const Company = require('../models/Company');
const { connectDB, disconnectDB } = require('../db'); // Adjust according to your database connection setup

beforeAll(async function () {
  await connectDB(); // Ensure this matches your database connection logic
});

afterAll(async function () {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Company Model', function () {
  it('should create a company with valid fields', async function () {
    const companyData = {
      companyId: 'valid-company-id',
      CompanyName: 'Test Company',
      CompanyType: 'startup', // Assuming 'startup' is a valid enum value
      RegisteredAddress: '123 Test Street, Test City, TC',
      TaxID: '123-45-6789',
      corporationDate: new Date(),
    };

    const company = new Company(companyData);
    const savedCompany = await company.save();

    expect(savedCompany.companyId).to.equal(companyData.companyId);
    expect(savedCompany.CompanyName).to.equal(companyData.CompanyName);
    expect(savedCompany.CompanyType).to.equal(companyData.CompanyType);
    expect(savedCompany.RegisteredAddress).to.equal(companyData.RegisteredAddress);
    expect(savedCompany.TaxID).to.equal(companyData.TaxID);
    expect(new Date(savedCompany.corporationDate).toISOString()).to.equal(new Date(companyData.corporationDate).toISOString());
  });

  it('should not create a company without required fields', async function () {
    const companyData = {
      CompanyName: 'Test Company',
    };

    const company = new Company(companyData);

    try {
      await company.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.errors.companyId).to.exist;
      expect(error.errors.CompanyType).to.exist;
      expect(error.errors.RegisteredAddress).to.exist;
      expect(error.errors.corporationDate).to.exist;
    }
  });

  it('should not create a company with duplicate companyId', async function () {
    const companyData1 = {
      companyId: 'duplicate-company-id',
      CompanyName: 'First Company',
      CompanyType: 'startup',
      RegisteredAddress: '123 First Street, First City, FC',
      TaxID: '111-22-3333',
      corporationDate: new Date(),
    };

    const companyData2 = {
      companyId: 'duplicate-company-id',
      CompanyName: 'Second Company',
      CompanyType: 'corporation',
      RegisteredAddress: '456 Second Avenue, Second City, SC',
      TaxID: '444-55-6666',
      corporationDate: new Date(),
    };

    const company1 = new Company(companyData1);
    await company1.save();

    const company2 = new Company(companyData2);

    try {
      await company2.save();
    } catch (error) {
      expect(error).to.exist;
      expect(error.code).to.equal(11000); // Duplicate key error code
    }
  });
});
