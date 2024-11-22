const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  EmployeeID: {
    type: String,
    required: [true, "EmployeeID is required"],
    unique: true,
  },
  Name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  Email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"], // Regex for email validation
  },
  EquityOverview: {
    TotalEquity: {
      type: Number,
      default: 0,
    },
    VestedEquity: {
      type: Number,
      default: 0,
    },
    UnvestedEquity: {
      type: Number,
      default: 0,
    },
  },
  DocumentAccess: [
    {
      DocID: {
        type: String,
        required: [true, "DocID is required"],
      },
      DocumentType: {
        type: String,
        required: [true, "DocumentType is required"],
      },
      Timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  VestingSchedule: {
    StartDate: {
      type: Date,
      default: null,
    },
    CliffDate: {
      type: Date,
      default: null,
    },
    VestingPeriod: {
      type: Number,
      default: 0,
    },
    TotalEquity: {
      type: Number,
      default: 0,
    },
  },
  TaxCalculator: {
    TaxBracket: {
      type: Number,
      default: 0,
    },
    TaxLiability: {
      type: Number,
      default: 0,
    },
  },
});

// Pre-save hooks for advanced validation
employeeSchema.pre("save", function (next) {
  if (
    this.EquityOverview.TotalEquity <
    this.EquityOverview.VestedEquity + this.EquityOverview.UnvestedEquity
  ) {
    return next(
      new Error(
        "TotalEquity must be greater than or equal to the sum of VestedEquity and UnvestedEquity"
      )
    );
  }

  if (
    this.VestingSchedule.CliffDate &&
    this.VestingSchedule.CliffDate <= this.VestingSchedule.StartDate
  ) {
    return next(new Error("CliffDate must be after StartDate"));
  }

  next();
});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;
