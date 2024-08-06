const EquityPlan = require('../models/EquityPlanModel');

exports.createEquityPlan = async (req, res) => {
    try {
        const newPlan = new EquityPlan(req.body);
        const savedPlan = await newPlan.save();
        res.status(201).json(savedPlan);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.getEquityPlans = async (req, res) => {
    try {
        const plans = await EquityPlan.find();
        res.status(200).json(plans);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getEquityPlanById = async (req, res) => {
    try {
        const plan = await EquityPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Equity plan not found' });
        }
        res.status(200).json(plan);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateEquityPlan = async (req, res) => {
    try {
        const plan = await EquityPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!plan) {
            return res.status(404).json({ message: 'Equity plan not found' });
        }
        res.status(200).json(plan);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteEquityPlan = async (req, res) => {
    try {
        const plan = await EquityPlan.findByIdAndDelete(req.params.id);
        if (!plan) {
            return res.status(404).json({ message: 'Equity plan not found' });
        }
        res.status(200).json({ message: 'Equity plan deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
