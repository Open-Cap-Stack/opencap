// controllers/fundraisingController.js
const FundraisingRound = require('../models/FundraisingModel');

exports.createFundraisingRound = async (req, res) => {
    try {
        const newRound = new FundraisingRound(req.body);
        const savedRound = await newRound.save();
        res.status(201).json(savedRound);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getFundraisingRounds = async (req, res) => {
    try {
        const rounds = await FundraisingRound.find();
        res.status(200).json(rounds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getFundraisingRoundById = async (req, res) => {
    try {
        const round = await FundraisingRound.findById(req.params.id);
        if (!round) {
            return res.status(404).json({ message: 'Fundraising round not found' });
        }
        res.status(200).json(round);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateFundraisingRound = async (req, res) => {
    try {
        const round = await FundraisingRound.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!round) {
            return res.status(404).json({ message: 'Fundraising round not found' });
        }
        res.status(200).json(round);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteFundraisingRound = async (req, res) => {
    try {
        const round = await FundraisingRound.findByIdAndDelete(req.params.id);
        if (!round) {
            return res.status(404).json({ message: 'Fundraising round not found' });
        }
        res.status(200).json({ message: 'Fundraising round deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
