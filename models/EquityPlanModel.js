const mongoose = require('mongoose');

const equityPlanSchema = new mongoose.Schema({
    planName: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    allocation: { type: Number, required: true },  // Amount of equity allocated
    participants: [{ type: String }]  // List of participant names or IDs
}, { timestamps: true });

const EquityPlan = mongoose.model('EquityPlan', equityPlanSchema);

module.exports = EquityPlan;
