const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Employee = require('../models/employeeModel');

describe('Employee Controller Additional Coverage', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Employee.deleteMany({});
  });

  it('should handle database error during employee creation', async () => {
    const employee = {
      EmployeeID: 'TEST001',
      Name: 'Test Employee',
      Email: 'test@example.com',
    };

    await mongoose.connection.close();

    const response = await request(app)
      .post('/api/employees')
      .send(employee);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');

    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test');
  });

  it('should handle pagination edge cases', async () => {
    await Employee.create([
      { EmployeeID: 'TEST001', Name: 'Test1', Email: 'test1@example.com' },
      { EmployeeID: 'TEST002', Name: 'Test2', Email: 'test2@example.com' }
    ]);

    const response = await request(app)
      .get('/api/employees')
      .query({ page: -1, limit: -5 });

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  // Updated this test
  it('should handle malformed object ID format', async () => {
    const invalidId = 'not-a-valid-id';
    const response = await request(app)
      .get(`/api/employees/${invalidId}`);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Validation error');
    expect(response.body).toHaveProperty('message', 'Invalid employee ID format');
  });

  // Updated this test
  it('should handle validation during update with invalid data', async () => {
    // First create a valid employee
    const employee = await Employee.create({
      EmployeeID: 'TEST001',
      Name: 'Test Employee',
      Email: 'test@example.com',
    });
  
    // Try to update with invalid EquityOverview data
    const response = await request(app)
      .put(`/api/employees/${employee._id}`)
      .send({
        EquityOverview: {
          TotalEquity: 'invalid', // This should fail since TotalEquity must be a number
          VestedEquity: 'invalid',
          UnvestedEquity: 'invalid'
        }
      });
  
    // Log response for debugging
    console.log('Validation Test Response:', {
      status: response.status,
      body: response.body
    });
  
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
  });

  it('should handle database error during update', async () => {
    const employee = await Employee.create({
      EmployeeID: 'TEST001',
      Name: 'Test Employee',
      Email: 'test@example.com'
    });

    await mongoose.connection.close();

    const response = await request(app)
      .put(`/api/employees/${employee._id}`)
      .send({ Name: 'Updated Name' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');

    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test');
  });

  it('should handle database error during delete', async () => {
    const employee = await Employee.create({
      EmployeeID: 'TEST001',
      Name: 'Test Employee',
      Email: 'test@example.com'
    });

    await mongoose.connection.close();

    const response = await request(app)
      .delete(`/api/employees/${employee._id}`);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error');

    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test');
  });
});