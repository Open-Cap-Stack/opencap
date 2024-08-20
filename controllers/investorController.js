const Investor = require('../models/Investor');

exports.createInvestor = async (req, res) => {
  const {
    investorId,
    investmentAmount,
    equityPercentage,
    investorType,
    relatedFundraisingRound,
  } = req.body;

  if (
    !investorId ||
    !investmentAmount ||
    !equityPercentage ||
    !investorType ||
    !relatedFundraisingRound
  ) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const investor = new Investor({
      investorId,
      investmentAmount,
      equityPercentage,
      investorType,
      relatedFundraisingRound,
    });
    await investor.save();
    res.status(201).json(investor);
  } catch (error) {
    res.status(500).json({ error: 'Error creating investor' });
  }
};

exports.getInvestorById = async (req, res) => {
  try {
    const investor = await Investor.findById(req.params.id);
    if (!investor) {
      return res.status(404).json({ error: 'Investor not found' });
    }
    res.status(200).json({ investor });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching investor' });
  }
};

exports.getAllInvestors = async (req, res) => {
  try {
    const investors = await Investor.find();
    res.status(200).json({ investors });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching investors' });
  }
};

exports.updateInvestor = async (req, res) => {
  const {
    investorId,
    investmentAmount,
    equityPercentage,
    investorType,
    relatedFundraisingRound,
  } = req.body;

  if (
    !investorId ||
    !investmentAmount ||
    !equityPercentage ||
    !investorType ||
    !relatedFundraisingRound
  ) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const investor = await Investor.findByIdAndUpdate(
      req.params.id,
      {
        investorId,
        investmentAmount,
        equityPercentage,
        investorType,
        relatedFundraisingRound,
      },
      { new: true }
    );

    if (!investor) {
      return res.status(404).json({ error: 'Investor not found' });
    }

    res.status(200).json(investor);
  } catch (error) {
    res.status(500).json({ error: 'Error updating investor' });
  }
};

exports.deleteInvestor = async (req, res) => {
  try {
    const investor = await Investor.findByIdAndDelete(req.params.id);

    if (!investor) {
      return res.status(404).json({ error: 'Investor not found' });
    }

    res.status(200).json({ message: 'Investor deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting investor' });
  }
};
