const mongoose = require('mongoose');

const fundraisingRoundSchema = new mongoose.Schema({
    roundId: { type: String, unique: true, required: true },
    roundName: { type: String, required: true },
    amountRaised: { type: Number, required: true },
    date: { type: Date, required: true },
    investors: [{ type: String, required: true }],
    equityGiven: { type: Number, required: true },
    RoundType: { type: String, required: true },  // e.g., Seed, Series A
    TermsOfInvestment: { type: String },
    ShareClassesInvolved: [{ type: String }],
    LegalDocuments: [{ type: String }]
}, { timestamps: true });

const FundraisingRound = mongoose.model('FundraisingRound', fundraisingRoundSchema);

module.exports = FundraisingRound;
