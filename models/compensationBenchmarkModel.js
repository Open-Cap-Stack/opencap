const mongoose = require('mongoose');

const CompensationBenchmarkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  corporationId: { type: String, required: true },
  benchmarks_version_datetime: { type: Date, required: true },
  compensation_type: { type: String, enum: ['SALARY', 'EQUITY_AS_FULLY_DILUTED_PERCENT'], required: true },
  industry: { type: String },
  percentile: { type: String, enum: ['P25', 'P50', 'P75'], required: true },
  post_money_valuation_bucket: { type: String },
  geo_adjustment_location: { type: String },
  job_area: { type: String },
  job_specialization: { type: String },
  job_level: { type: String },
});

const CompensationBenchmark = mongoose.model('CompensationBenchmark', CompensationBenchmarkSchema);

module.exports = CompensationBenchmark;
