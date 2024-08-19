const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const companySchema = new Schema({
  companyId: {
    type: String,
    required: true,
    unique: true, // Ensures that companyId is unique across documents
  },
  CompanyName: {
    type: String,
    required: true,
  },
  CompanyType: {
    type: String,
    required: true,
    enum: ['startup', 'corporation', 'non-profit', 'government'], // Enum for CompanyType
  },
  RegisteredAddress: {
    type: String,
    required: true,
  },
  TaxID: {
    type: String,
    required: true,
  },
  corporationDate: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
