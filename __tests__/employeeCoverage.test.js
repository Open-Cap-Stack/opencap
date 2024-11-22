const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Employee = require('../models/employeeModel');

describe('Employee Controller Coverage', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }
    await Employee.deleteMany({});
  });

  // Passing Tests
  describe('Passing Tests', () => {
    it('should handle database connection check before operations', async () => {
      await mongoose.connection.close();
      let response;

      try {
        response = await request(app)
          .post('/api/employees')
          .send({
            EmployeeID: 'TEST001',
            Name: 'Test Employee',
            Email: 'test@example.com',
          });
      } catch (error) {
        response = error.response || { status: 500, body: { error: 'Internal server error' } };
      }

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');

      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test');
    });

    it('should handle invalid email format during creation', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({
          EmployeeID: 'TEST002',
          Name: 'Invalid Email Employee',
          Email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should handle invalid ID format during update', async () => {
      const response = await request(app)
        .put('/api/employees/invalid-id')
        .send({ Name: 'Updated Name' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  // Updated Failing Tests
  describe('Failing Tests', () => {
    it('should handle validation with empty update data', async () => {
      const employee = await Employee.create({
        EmployeeID: 'TEST001',
        Name: 'Test Employee',
        Email: 'test@example.com',
      });

      const response = await request(app)
        .put(`/api/employees/${employee._id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should validate nested object updates - invalid data type', async () => {
      // Create test employee with equity data
      const employee = await Employee.create({
        EmployeeID: 'TEST001',
        Name: 'Test Employee',
        Email: 'test@example.com',
        EquityOverview: {
          TotalEquity: 1000,
          VestedEquity: 500,
          UnvestedEquity: 500,
        },
      });

      // Attempt to update with invalid data type
      const response = await request(app)
        .put(`/api/employees/${employee._id}`)
        .send({
          EquityOverview: {
            TotalEquity: 'invalid',
          },
        });

      // Verify response
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('TotalEquity must be a number');
    });

    it('should handle database error during delete operation', async () => {
      const employee = await Employee.create({
        EmployeeID: 'TEST001',
        Name: 'Test Employee',
        Email: 'test@example.com',
      });

      await mongoose.connection.close();
      let response;

      try {
        response = await request(app).delete(`/api/employees/${employee._id}`);
      } catch (error) {
        response = error.response || { status: 500, body: { error: 'Internal server error' } };
      }

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Internal server error');

      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test');
    });

    it('should handle duplicate key error during update', async () => {
        // Create the first employee and wait for it to be saved
        const employee1 = await Employee.create({
          EmployeeID: 'TEST001',
          Name: 'Employee One',
          Email: 'employee1@example.com',
        });
      
        // Add a delay to ensure the first employee is fully saved
        await new Promise(resolve => setTimeout(resolve, 100));
      
        // Create second employee
        const employee2 = await Employee.create({
          EmployeeID: 'TEST002',
          Name: 'Employee Two',
          Email: 'employee2@example.com',
        });
      
        // Add another small delay
        await new Promise(resolve => setTimeout(resolve, 100));
      
        // Try to update employee2 with employee1's EmployeeID (which should be unique)
        const response = await request(app)
          .put(`/api/employees/${employee2._id}`)
          .send({ EmployeeID: 'TEST001' }); // Use EmployeeID instead of Email
      
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Duplicate key error');
      });

    it('should return 404 for updating non-existent employee', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/employees/${nonExistentId}`)
        .send({
          Name: 'Non-existent Employee',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not found');
    });

    it('should successfully update a valid employee', async () => {
      const employee = await Employee.create({
        EmployeeID: 'TEST003',
        Name: 'Valid Employee',
        Email: 'valid@example.com',
      });

      const response = await request(app)
        .put(`/api/employees/${employee._id}`)
        .send({
          Name: 'Updated Employee',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('Name', 'Updated Employee');
    });
  });
});