const request = require('supertest');
const chai = require('chai');
const server = require('../app');
const Employee = require('../models/employeeModel');
const expect = chai.expect;

describe('Employee Controller', () => {
  beforeAll(async function () {
    await connectDB();
  });
  
  afterAll(async function () {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  describe('/POST employee', () => {
    it('it should create a new employee', async () => {
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
        .post('/employees')
        .send(employee);

      expect(response.statusCode).to.equal(201);
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('Name').that.equals('John Doe');
    });
  });

  // Additional controller tests (GET, PUT, DELETE)
});
