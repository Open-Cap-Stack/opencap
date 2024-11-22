const request = require('supertest');
const chai = require('chai');
const server = require('../app');
const { connectDB, disconnectDB } = require('../db');
const mongoose = require('mongoose');
const Employee = require('../models/employeeModel');
const expect = chai.expect;

describe('Employee Controller', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await disconnectDB();
  });

  beforeEach(async () => {
    await Employee.deleteMany({});
  });

  describe('/POST employee', () => {
    it('should create a new employee', async () => {
      const startDate = new Date();
      const cliffDate = new Date(startDate);
      cliffDate.setMonth(cliffDate.getMonth() + 1);

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
          StartDate: startDate,
          CliffDate: cliffDate,
          VestingPeriod: 12,
          TotalEquity: 1000,
        },
        TaxCalculator: {
          TaxBracket: 30,
          TaxLiability: 300,
        },
      };

      const response = await request(server)
        .post('/api/employees')
        .send(employee);

      expect(response.statusCode).to.equal(201);
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('Name').that.equals('John Doe');
    });
  });

  describe('/GET employees', () => {
    it('should get all employees', async () => {
      // Create test employees first
      await Employee.create([
        {
          EmployeeID: 'E001',
          Name: 'Test One',
          Email: 'test1@example.com'
        },
        {
          EmployeeID: 'E002',
          Name: 'Test Two',
          Email: 'test2@example.com'
        }
      ]);

      const response = await request(server).get('/api/employees');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.be.an('array');
      expect(response.body).to.have.lengthOf(2);
    });

    it('should get employee by ID', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E003',
        Name: 'Test Three',
        Email: 'test3@example.com'
      });

      const response = await request(server).get(`/api/employees/${employee._id}`);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property('Name').that.equals('Test Three');
    });

    it('should return 404 for non-existent employee', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(server).get(`/api/employees/${nonExistentId}`);
      expect(response.statusCode).to.equal(404);
      expect(response.body).to.have.property('error').that.equals('Not found');
    });
  });

  describe('/PUT employee', () => {
    it('should update employee', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E004',
        Name: 'Test Four',
        Email: 'test4@example.com'
      });

      const response = await request(server)
        .put(`/api/employees/${employee._id}`)
        .send({ Name: 'Updated Name' });

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property('Name').that.equals('Updated Name');
    });

    it('should fail to update with invalid ID', async () => {
      const response = await request(server)
        .put('/api/employees/invalid-id')
        .send({ Name: 'Test' });

      expect(response.statusCode).to.equal(400);
      expect(response.body).to.have.property('error').that.equals('Validation error');
    });
  });

  describe('/DELETE employee', () => {
    it('should delete employee', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E005',
        Name: 'Test Five',
        Email: 'test5@example.com'
      });

      const response = await request(server).delete(`/api/employees/${employee._id}`);
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property('message').that.equals('Employee deleted successfully');

      const deletedEmployee = await Employee.findById(employee._id);
      expect(deletedEmployee).to.be.null;
    });

    it('should fail to delete with invalid ID', async () => {
      const response = await request(server).delete('/api/employees/invalid-id');
      expect(response.statusCode).to.equal(400);
      expect(response.body).to.have.property('error').that.equals('Validation error');
    });
  });

  describe('Error handling', () => {
    it('should handle validation with empty update data', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E006',
        Name: 'Test Six',
        Email: 'test6@example.com'
      });

      const response = await request(server)
        .put(`/api/employees/${employee._id}`)
        .send({});

      expect(response.statusCode).to.equal(400);
      expect(response.body).to.have.property('error').that.equals('Validation error');
    });

    it('should handle database connection errors', async () => {
      await mongoose.connection.close();

      const response = await request(server)
        .post('/api/employees')
        .send({
          EmployeeID: 'E007',
          Name: 'Test Seven',
          Email: 'test7@example.com'
        });

      expect(response.statusCode).to.equal(500);
      expect(response.body).to.have.property('error').that.equals('Internal server error');

      // Reconnect for other tests
      await connectDB();
    });
  });
});