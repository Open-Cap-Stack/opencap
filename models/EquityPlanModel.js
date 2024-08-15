const mongoose = require('mongoose');

const equityPlanSchema = new mongoose.Schema({
    planId: { type: String, unique: true, required: true },
    planName: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    allocation: { type: Number, required: true },
    participants: [{ type: String }], // List of stakeholder names or IDs
    VestingTerms: { type: Object },
    VestingStartDate: { type: Date },
    VestingEndDate: { type: Date },
    VestingSchedule: { type: String },
    PlanType: { type: String, enum: ['Stock Option Plan', 'Restricted Stock Plan'], required: true },
    AllocationType: { type: String, enum: ['Fixed', 'Performance-Based'] },
    PlanAdministrator: { type: String }
}, { timestamps: true });

const EquityPlan = mongoose.model('EquityPlan', equityPlanSchema);

module.exports = EquityPlan;
