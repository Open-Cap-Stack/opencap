const chai = require("chai");
const server = require("../app");
const Employee = require("../models/employee");
const should = chai.should();

describe("Employee Controller", () => {
  beforeEach((done) => {
    Employee.deleteMany({}, (err) => {
      done();
    });
  });

  describe("/POST employee", () => {
    it("it should create a new employee", (done) => {
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
      chai
        .request(server)
        .post("/employees")
        .send(employee)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a("object");
          res.body.should.have.property("Name").eql("John Doe");
          done();
        });
    });
  });

  // Additional controller tests (GET, PUT, DELETE)
});
