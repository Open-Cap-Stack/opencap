const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Employee = require('../models/employeeModel');

describe('Employee Routes', () => {
  beforeAll(async () => {
    const mongoURI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/opencap-test';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false // Add this to fix deprecation warning
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Employee.deleteMany({});
  });

  describe('GET /api/employees', () => {
    it('should GET all employees', async () => {
      // Create a few test employees first
      const testEmployees = [
        {
          EmployeeID: 'TEST001',
          Name: 'Test Employee 1',
          Email: 'test1@example.com'
        },
        {
          EmployeeID: 'TEST002',
          Name: 'Test Employee 2',
          Email: 'test2@example.com'
        }
      ];

      await Employee.create(testEmployees);

      const response = await request(app)
        .get('/api/employees')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/employees')
        .query({ page: 'invalid', limit: 'invalid' })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should GET a specific employee by ID', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com'
      });

      const response = await request(app)
        .get(`/api/employees/${employee._id}`)
        .expect(200);

      expect(response.body.Name).toBe('John Doe');
    });

    it('should return 404 for non-existent employee', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/employees/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Not found');
    });

    it('should handle invalid ID format', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('POST /api/employees', () => {
    it('should create a new employee with all fields', async () => {
      const now = new Date();
      const future = new Date(now.getTime());
      future.setMonth(now.getMonth() + 1); // Set CliffDate 1 month after StartDate

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
          StartDate: now,
          CliffDate: future,
          VestingPeriod: 12,
          TotalEquity: 1000,
        },
        TaxCalculator: {
          TaxBracket: 30,
          TaxLiability: 300,
        },
      };

      const response = await request(app)
        .post('/api/employees')
        .send(employee)
        .expect(201);

      expect(response.body).toHaveProperty('Name', 'John Doe');
      expect(response.body).toHaveProperty('Email', 'john.doe@example.com');
    });

    it('should not create employee without required fields', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
      expect(response.body.message).toContain('required fields');
    });

    it('should not create employee with duplicate EmployeeID', async () => {
      const employee = {
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com'
      };

      await request(app)
        .post('/api/employees')
        .send(employee);

      const response = await request(app)
        .post('/api/employees')
        .send({
          ...employee,
          Email: 'different.email@example.com'
        })
        .expect(400);

      expect(response.body.error).toBe('Duplicate key error');
    });

    it('should not create employee with duplicate Email', async () => {
      const employee = {
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com'
      };

      await request(app)
        .post('/api/employees')
        .send(employee);

      const response = await request(app)
        .post('/api/employees')
        .send({
          ...employee,
          EmployeeID: 'E12346'
        })
        .expect(400);

      expect(response.body.error).toBe('Duplicate key error');
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update an existing employee', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com'
      });

      const response = await request(app)
        .put(`/api/employees/${employee._id}`)
        .send({ Name: 'Jane Doe' })
        .expect(200);

      expect(response.body.Name).toBe('Jane Doe');
    });

    it('should handle invalid ID format on update', async () => {
      const response = await request(app)
        .put('/api/employees/invalid-id')
        .send({ Name: 'Jane Doe' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should handle duplicate fields on update', async () => {
      const employee1 = await Employee.create({
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com'
      });

      const employee2 = await Employee.create({
        EmployeeID: 'E12346',
        Name: 'Jane Doe',
        Email: 'jane.doe@example.com'
      });

      const response = await request(app)
        .put(`/api/employees/${employee2._id}`)
        .send({ Email: 'john.doe@example.com' })
        .expect(400);

      expect(response.body.error).toBe('Duplicate key error');
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete an existing employee', async () => {
      const employee = await Employee.create({
        EmployeeID: 'E12345',
        Name: 'John Doe',
        Email: 'john.doe@example.com'
      });

      const response = await request(app)
        .delete(`/api/employees/${employee._id}`)
        .expect(200);

      expect(response.body.message).toBe('Employee deleted successfully');
      
      const deletedEmployee = await Employee.findById(employee._id);
      expect(deletedEmployee).toBeNull();
    });

    it('should handle invalid ID format on delete', async () => {
      const response = await request(app)
        .delete('/api/employees/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should handle non-existent employee on delete', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/employees/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Not found');
    });
  });
});