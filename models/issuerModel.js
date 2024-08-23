const mongoose = require('mongoose');

const IssuerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  legalName: { type: String, required: true },
  doingBusinessAsName: { type: String },
  website: { type: String },
  dateOfIncorporation: { type: Date, required: true },
  countryOfIncorporation: { type: String, required: true },
  stateOfIncorporation: { type: String },
  employerIdentificationNumber: { type: String },
  address: {
    line1: { type: String },
    city: { type: String },
    countrySubdivision: { type: String },
    country: { type: String },
    postalCode: { type: String }
  },
  primaryContactId: { type: String },
  certificateOfIncorporationId: { type: String }
});

const Issuer = mongoose.model('Issuer', IssuerSchema);

module.exports = Issuer;
