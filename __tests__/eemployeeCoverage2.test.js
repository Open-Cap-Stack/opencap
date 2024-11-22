const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Employee = require('../models/employeeModel');

describe('Employee Controller Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Employee.deleteMany({});
  });

  it('should create an employee successfully', async () => {
    const response = await request(app).post('/api/employees').send({
      EmployeeID: 'E001',
      Name: 'Test Employee',
      Email: 'test@example.com',
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('EmployeeID', 'E001');
  });

  it('should fail to create an employee with missing fields', async () => {
    const response = await request(app).post('/api/employees').send({
      Name: 'Test Employee',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Validation error');
    expect(response.body).toHaveProperty('message', 'Missing required fields: EmployeeID, Name, Email');
  });

  it('should handle duplicate key errors', async () => {
    await Employee.create({
      EmployeeID: 'E001',
      Name: 'Duplicate Test',
      Email: 'duplicate@example.com',
    });

    const response = await request(app).post('/api/employees').send({
      EmployeeID: 'E001',
      Name: 'Duplicate Test',
      Email: 'test@example.com',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Duplicate key error');
  });

  it('should fail with invalid ID format during get by ID', async () => {
    const response = await request(app).get('/api/employees/invalid-id');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Validation error');
  });

  it('should update an employee successfully', async () => {
    // Create a new employee in the database
    const employee = await Employee.create({
      EmployeeID: 'E002',
      Name: 'Test Employee',
      Email: 'test2@example.com',
    });
  
    // Send an update request including all required fields
    const response = await request(app).put(`/api/employees/${employee._id}`).send({
      EmployeeID: 'E002', // Required by the controller's validation logic
      Name: 'Updated Employee',
      Email: 'test2@example.com', // Required by the controller's validation logic
    });
  
    // Log the response for debugging
    console.log('Response:', response.status, response.body);
  
    // Check the response
    expect(response.status).toBe(200); // Ensure the status is 200
    expect(response.body).toHaveProperty('Name', 'Updated Employee'); // Verify the Name was updated
    expect(response.body).toHaveProperty('EmployeeID', 'E002'); // Verify the EmployeeID remains the same
    expect(response.body).toHaveProperty('Email', 'test2@example.com'); // Verify the Email remains unchanged
  });

  it('should fail to update with invalid data', async () => {
    // Create a valid employee first
    const employee = await Employee.create({
      EmployeeID: 'E003',
      Name: 'Valid Employee',
      Email: 'valid@example.com',
    });
  
    // Attempt to update with invalid data
    const response = await request(app)
      .put(`/api/employees/${employee._id}`)
      .send({
        EquityOverview: {
          TotalEquity: 'invalid', // This should trigger a validation error as it expects a number
        }
      });
  
    // We should get a 400 validation error
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Validation error');
    expect(response.body.message).toContain('TotalEquity must be a number');
  });
  

  it('should delete an employee successfully', async () => {
    const employee = await Employee.create({
      EmployeeID: 'E004',
      Name: 'Test Employee',
      Email: 'test4@example.com',
    });

    const response = await request(app).delete(`/api/employees/${employee._id}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Employee deleted successfully');
  });

  it('should fail to delete with invalid ID format', async () => {
    const response = await request(app).delete('/api/employees/invalid-id');
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Validation error');
  });

  it('should fail to delete a non-existent employee', async () => {
    const response = await request(app).delete(`/api/employees/${new mongoose.Types.ObjectId()}`);
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not found');
  });
});
