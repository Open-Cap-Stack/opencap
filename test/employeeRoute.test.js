const chai = require("chai");
const server = require("../app");
const Employee = require("../models/employee");
const should = chai.should();

describe("Employee Routes", () => {
  beforeEach((done) => {
    Employee.deleteMany({}, (err) => {
      done();
    });
  });

  describe("GET /employees", () => {
    it("it should GET all the employees", (done) => {
      chai
        .request(server)
        .get("/employees")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a("array");
          res.body.length.should.be.eql(0);
          done();
        });
    });
  });

  describe("POST /employees", () => {
    it("it should POST a new employee", (done) => {
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
});
