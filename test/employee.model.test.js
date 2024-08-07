const mongoose = require("mongoose");
const chai = require("chai");
const Employee = require("../models/employee");
const should = chai.should();

describe("Employee Model", () => {
  before((done) => {
    mongoose.connect("mongodb://localhost/testDB", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "connection error:"));
    db.once("open", () => {
      console.log("Connected to test database");
      done();
    });
  });

  after((done) => {
    mongoose.connection.close(done);
  });

  it("should create a new employee", (done) => {
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
        StartDate: new Date(),
        CliffDate: new Date(),
        VestingPeriod: 12,
        TotalEquity: 1000,
      },
      TaxCalculator: {
        TaxBracket: 30,
        TaxLiability: 300,
      },
    });
    employee.save((err, savedEmployee) => {
      should.not.exist(err);
      savedEmployee.should.be.an("object");
      savedEmployee.should.have.property("Name").eql("John Doe");
      done();
    });
  });
});
