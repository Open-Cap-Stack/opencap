const mongoose = require("mongoose");
const chai = require("chai");
const Employee = require("../models/employeeModel");
const should = chai.should();
const { connectDB, disconnectDB } = require('../db');

describe("Employee Model", () => {
  beforeAll(async function () {
    await connectDB();
  });
  
  afterAll(async function () {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it("should create a new employee", async () => {
    const now = new Date();
    const future = new Date(now);
    future.setMonth(future.getMonth() + 1); // Set cliff date 1 month in future

    const employee = new Employee({
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
        StartDate: now,
        CliffDate: future, // This ensures CliffDate is after StartDate
        VestingPeriod: 12,
        TotalEquity: 1000,
      },
      TaxCalculator: {
        TaxBracket: 30,
        TaxLiability: 300,
      },
    });

    const savedEmployee = await employee.save();
    should.exist(savedEmployee);
    savedEmployee.should.be.an("object");
    savedEmployee.should.have.property("Name").eql("John Doe");
  });
});