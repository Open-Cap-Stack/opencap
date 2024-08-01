// models/FundraisingModel.js
const mongoose = require('mongoose');

const fundraisingRoundSchema = new mongoose.Schema({
    roundName: {
        type: String,
        required: true,
    },
    amountRaised: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    investors: {
        type: [String],
        required: true,
    },
    equityGiven: {
        type: Number,
        required: true,
    },
});

const FundraisingRound = mongoose.model('FundraisingRound', fundraisingRoundSchema);
module.exports = FundraisingRound;
