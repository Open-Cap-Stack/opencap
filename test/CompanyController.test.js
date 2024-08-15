const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const companyController = require('../controllers/companyController');
const Company = require('../models/Company');

// Mock the Company model
jest.mock('../models/Company');

const app = express();
app.use(express.json());
app.use("/api/companies", require("../routes/companyRoutes"));

describe('Company Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/companies', () => {
    it('should create a new company', async () => {
      const companyData = {
        companyId: 'new-company-id',
        CompanyName: 'New Test Company',
        CompanyType: 'corporation', // Assuming 'corporation' is one of the valid enum values
        RegisteredAddress: '456 New Avenue, New City, NC',
        TaxID: '987-65-4321',
        corporationDate: new Date(),
      };

      Company.prototype.save.mockResolvedValue(companyData);

      const response = await request(app)
        .post('/api/companies')
        .send(companyData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(companyData);
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/companies')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Invalid company data' });
    });
  });

  describe('GET /api/companies', () => {
    it('should get all companies', async () => {
      const companies = [
        {
          companyId: 'company-id-1',
          CompanyName: 'Company 1',
          CompanyType: 'startup',
          RegisteredAddress: '123 Test Street, Test City, TC',
          TaxID: '111-22-3333',
          corporationDate: new Date(),
        },
        {
          companyId: 'company-id-2',
          CompanyName: 'Company 2',
          CompanyType: 'corporation',
          RegisteredAddress: '456 Test Avenue, Test City, TC',
          TaxID: '444-55-6666',
          corporationDate: new Date(),
        },
      ];

      Company.find.mockResolvedValue(companies);

      const response = await request(app).get('/api/companies');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(companies);
    });

    it('should return 404 if no companies are found', async () => {
      Company.find.mockResolvedValue([]);

      const response = await request(app).get('/api/companies');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'No companies found' });
    });
  });

  describe('GET /api/companies/:id', () => {
    it('should get a company by id', async () => {
      const company = {
        companyId: 'company-id-1',
        CompanyName: 'Company 1',
        CompanyType: 'startup',
        RegisteredAddress: '123 Test Street, Test City, TC',
        TaxID: '111-22-3333',
        corporationDate: new Date(),
      };

      Company.findById.mockResolvedValue(company);

      const response = await request(app).get(`/api/companies/${company.companyId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(company);
    });

    it('should return 404 if company is not found', async () => {
      Company.findById.mockResolvedValue(null);

      const response = await request(app).get(`/api/companies/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Company not found' });
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('should update a company by id', async () => {
      const companyId = 'company-id-1';
      const updatedCompany = {
        companyId,
        CompanyName: 'Updated Company',
        CompanyType: 'corporation',
        RegisteredAddress: '789 Updated Road, Updated City, UC',
        TaxID: '111-22-3333',
        corporationDate: new Date(),
      };

      Company.findByIdAndUpdate.mockResolvedValue(updatedCompany);

      const response = await request(app)
        .put(`/api/companies/${companyId}`)
        .send(updatedCompany);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedCompany);
    });

    it('should return 404 if company to update is not found', async () => {
      Company.findByIdAndUpdate.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/companies/${mongoose.Types.ObjectId()}`)
        .send({ CompanyName: 'Updated Company' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Company not found' });
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('should delete a company by id', async () => {
      const companyId = 'company-id-1';
      Company.findByIdAndDelete.mockResolvedValue({ companyId });

      const response = await request(app).delete(`/api/companies/${companyId}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Company deleted' });
    });

    it('should return 404 if company to delete is not found', async () => {
      Company.findByIdAndDelete.mockResolvedValue(null);

      const response = await request(app).delete(`/api/companies/${mongoose.Types.ObjectId()}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Company not found' });
    });
  });
});
