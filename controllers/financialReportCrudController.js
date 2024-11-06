// controllers/financialReportCrudController.js
const FinancialReport = require("../models/financialReport");
const { validateFinancialReport } = require("./financialReportBusinessController");

const createFinancialReport = async (req, res, next) => {
  try {
    const validation = validateFinancialReport(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const financialReport = new FinancialReport(req.body);
    const newFinancialReport = await financialReport.save();
    res.status(201).json(newFinancialReport);
  } catch (error) {
    next(error);
  }
};

const getFinancialReport = async (req, res, next) => {
  try {
    const report = await FinancialReport.findOne({ ReportID: req.params.id });
    if (!report) {
      return res.status(404).json({ message: 'Financial report not found' });
    }
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

const listFinancialReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reports = await FinancialReport.find()
      .skip(skip)
      .limit(limit);

    const totalCount = await FinancialReport.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      reports,
      totalCount,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

const updateFinancialReport = async (req, res, next) => {
  try {
    const validation = validateFinancialReport(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const report = await FinancialReport.findOneAndUpdate(
      { ReportID: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Financial report not found' });
    }

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};

const deleteFinancialReport = async (req, res, next) => {
  try {
    const report = await FinancialReport.findOneAndDelete({ 
      ReportID: req.params.id 
    });

    if (!report) {
      return res.status(404).json({ message: 'Financial report not found' });
    }

    res.status(200).json({
      message: 'Financial report deleted successfully',
      report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFinancialReport,
  getFinancialReport,
  listFinancialReports,
  updateFinancialReport,
  deleteFinancialReport
};