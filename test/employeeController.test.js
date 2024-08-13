const request = require('supertest');
const chai = require('chai');
const server = require('../app');
const { connectDB, disconnectDB } = require('../db');
const mongoose = require('mongoose');
const Employee = require('../models/employeeModel');
const expect = chai.expect;

describe('Employee Controller', () => {
  beforeAll(async () => {
    console.log('Connecting to DB...');
    await connectDB();
  });

  afterAll(async () => {
    console.log('Dropping database and disconnecting...');
    await mongoose.connection.db.dropDatabase();
    await disconnectDB();
  });

  describe('/POST employee', () => {
    it('should create a new employee', async () => {
      const employee = {
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com',
        EquityOverview: {
          TotalEquity: 1000,
          VestedEquity: 500,
          UnvestedEquity: 500,
        },
        DocumentAccess: [],
        VestingSchedule: {
          StartDate: new Date(),
          CliffDate: new Date(),
          VestingPeriod: 12,
          TotalEquity: 1000,
        },
        TaxCalculator: {
          TaxBracket: 30,
          TaxLiability: 300,
        },
      };

      const response = await request(server)
        .post('/api/employees') // Updated route to include /api
        .send(employee);

      console.log('Response Status:', response.statusCode);
      console.log('Response Body:', response.body);

      expect(response.statusCode).to.equal(201);
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('Name').that.equals('John Doe');
    });
  });
});
