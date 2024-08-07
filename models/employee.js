const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  EmployeeID: {
    type: String,
    required: true,
    unique: true,
  },
  Name: {
    type: String,
    required: true,
  },
  Email: {
    type: String,
    required: true,
    unique: true,
  },
  EquityOverview: {
    TotalEquity: Number,
    VestedEquity: Number,
    UnvestedEquity: Number,
  },
  DocumentAccess: [
    {
      DocID: String,
      DocumentType: String,
      Timestamp: Date,
    },
  ],
  VestingSchedule: {
    StartDate: Date,
    CliffDate: Date,
    VestingPeriod: Number, // In months
    TotalEquity: Number,
  },
  TaxCalculator: {
    TaxBracket: Number,
    TaxLiability: Number,
  },
});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
