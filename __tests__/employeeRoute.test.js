// test/employeeRoute.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app'); // Ensure this points to your Express app
const Employee = require('../models/employeeModel');

beforeAll(async () => {
  await mongoose.connect("mongodb://localhost:27017/testDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Employee Routes", () => {
  beforeEach(async () => {
    await Employee.deleteMany({});
  });

  describe("GET /api/employees", () => {
    it("it should GET all the employees", async () => {
      const response = await request(app).get("/api/employees");
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });
  });

  describe("POST /api/employees", () => {
    it("it should POST a new employee", async () => {
      const employee = {
        EmployeeID: "E12345",
        Name: "John Doe",
        Email: "john.doe@example.com",
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
      const response = await request(app)
        .post("/api/employees")
        .send(employee);
      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("Name", "John Doe");
    });
  });
});
