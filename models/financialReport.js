// models/financialReport.js

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const FinancialReportSchema = new Schema({
  ReportID: {
    type: String,
    default: uuidv4, // Generate a UUID by default
    unique: true,
    required: true,
  },
  Type: {
    type: String,
    enum: ['Annual', 'Quarterly'], // Enum values
    required: true,
  },
  Data: {
    type: Schema.Types.Mixed, // Stores JSON data
    required: true,
  },
  TotalRevenue: {
    type: Schema.Types.Decimal128, // Decimal for monetary values
    required: true,
  },
  TotalExpenses: {
    type: Schema.Types.Decimal128,
    required: true,
  },
  NetIncome: {
    type: Schema.Types.Decimal128,
    required: true,
  },
  EquitySummary: {
    type: [String], // Array of UUIDs (shareClassId)
    default: [],    // Optional field
  },
  Timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

module.exports = mongoose.model('FinancialReport', FinancialReportSchema);
