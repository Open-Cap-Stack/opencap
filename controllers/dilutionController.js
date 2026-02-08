/**
 * Dilution Controller
 * Issue #200: Implement Dilution Calculator Backend
 *
 * API controller for dilution calculations and scenario management.
 */

const DilutionScenario = require('../models/DilutionScenario');
const DilutionCalculation = require('../models/DilutionCalculation');
const DilutionCalculatorService = require('../services/dilutionCalculationService');
const SAFEDilutionService = require('../services/safeDilutionService');
const OptionPoolCalculatorService = require('../services/optionPoolCalculatorService');

/**
 * Calculate dilution for a funding round
 * POST /api/v1/dilution/calculate
 */
exports.calculate = async (req, res) => {
  try {
    const {
      companyId,
      scenarioId,
      preMoney,
      newInvestment,
      existingShares,
      sharePrice,
      stakeholders,
      shareClasses
    } = req.body;

    // Validate required fields
    if (!companyId || !preMoney || !newInvestment || !existingShares) {
      return res.status(400).json({
        error: 'Missing required fields: companyId, preMoney, newInvestment, existingShares'
      });
    }

    // Validate positive numbers to prevent division by zero and invalid calculations
    if (existingShares <= 0) {
      return res.status(400).json({
        error: 'Invalid calculation: existingShares must be a positive number'
      });
    }

    if (preMoney < 0 || newInvestment < 0) {
      return res.status(400).json({
        error: 'Invalid calculation: preMoney and newInvestment cannot be negative'
      });
    }

    const results = await DilutionCalculatorService.calculateFundingRound({
      companyId,
      scenarioId,
      preMoney,
      newInvestment,
      existingShares,
      sharePrice: sharePrice || (preMoney / existingShares),
      stakeholders: stakeholders || [],
      shareClasses: shareClasses || []
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Calculate SAFE dilution
 * POST /api/v1/dilution/safe
 */
exports.calculateSAFE = async (req, res) => {
  try {
    const {
      companyId,
      scenarioId,
      safeAmount,
      valuationCap,
      discountRate,
      pricePerShare,
      existingShares
    } = req.body;

    // Validate required fields
    if (!companyId || !safeAmount || !existingShares) {
      return res.status(400).json({
        error: 'Missing required fields: companyId, safeAmount, existingShares'
      });
    }

    if (!valuationCap && !discountRate) {
      return res.status(400).json({
        error: 'Either valuationCap or discountRate must be provided'
      });
    }

    // Validate positive numbers to prevent invalid calculations
    if (existingShares <= 0) {
      return res.status(400).json({
        error: 'Invalid calculation: existingShares must be a positive number'
      });
    }

    if (safeAmount < 0) {
      return res.status(400).json({
        error: 'Invalid calculation: safeAmount cannot be negative'
      });
    }

    if (valuationCap !== undefined && valuationCap <= 0) {
      return res.status(400).json({
        error: 'Invalid calculation: valuationCap must be a positive number'
      });
    }

    if (discountRate !== undefined && (discountRate < 0 || discountRate > 100)) {
      return res.status(400).json({
        error: 'Invalid calculation: discountRate must be between 0 and 100'
      });
    }

    const results = await SAFEDilutionService.calculateSAFEDilution({
      companyId,
      scenarioId,
      safeAmount,
      valuationCap,
      discountRate,
      pricePerShare,
      existingShares
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Calculate option pool dilution
 * POST /api/v1/dilution/option-pool
 */
exports.calculateOptionPool = async (req, res) => {
  try {
    const {
      companyId,
      scenarioId,
      targetPoolPercentage,
      currentPoolShares,
      currentTotalShares,
      calculationMethod
    } = req.body;

    // Validate required fields
    if (!companyId || !targetPoolPercentage || !currentTotalShares) {
      return res.status(400).json({
        error: 'Missing required fields: companyId, targetPoolPercentage, currentTotalShares'
      });
    }

    // Validate positive numbers to prevent division by zero and invalid calculations
    if (currentTotalShares <= 0) {
      return res.status(400).json({
        error: 'Invalid calculation: currentTotalShares must be a positive number'
      });
    }

    if (targetPoolPercentage < 0 || targetPoolPercentage > 100) {
      return res.status(400).json({
        error: 'Invalid calculation: targetPoolPercentage must be between 0 and 100'
      });
    }

    if (currentPoolShares !== undefined && currentPoolShares < 0) {
      return res.status(400).json({
        error: 'Invalid calculation: currentPoolShares cannot be negative'
      });
    }

    const results = await OptionPoolCalculatorService.calculateOptionPoolDilution({
      companyId,
      scenarioId,
      targetPoolPercentage,
      currentPoolShares: currentPoolShares || 0,
      currentTotalShares,
      calculationMethod: calculationMethod || 'pre_money'
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Calculate multi-round dilution
 * POST /api/v1/dilution/multi-round
 */
exports.calculateMultiRound = async (req, res) => {
  try {
    const { companyId, rounds } = req.body;

    // Validate required fields
    if (!companyId || !rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: companyId and rounds array'
      });
    }

    let currentShares = rounds[0].existingShares || 0;
    const results = [];

    // Validate initial shares are positive
    if (currentShares <= 0) {
      return res.status(400).json({
        error: 'Invalid calculation: initial existingShares must be a positive number'
      });
    }

    // Calculate each round sequentially
    for (const round of rounds) {
      // Validate round values
      if (round.preMoney < 0 || round.newInvestment < 0) {
        return res.status(400).json({
          error: `Invalid calculation: preMoney and newInvestment cannot be negative in round ${results.length + 1}`
        });
      }

      // Prevent division by zero when calculating share price
      if (currentShares <= 0) {
        return res.status(400).json({
          error: `Invalid calculation: total shares cannot be zero at round ${results.length + 1}`
        });
      }

      const roundResult = await DilutionCalculatorService.calculateFundingRound({
        companyId,
        preMoney: round.preMoney,
        newInvestment: round.newInvestment,
        existingShares: currentShares,
        sharePrice: round.sharePrice || (round.preMoney / currentShares),
        stakeholders: round.stakeholders || [],
        shareClasses: round.shareClasses || []
      });

      results.push({
        roundName: round.name || `Round ${results.length + 1}`,
        ...roundResult
      });

      // Update current shares for next round
      currentShares = roundResult.totalShares;
    }

    // Calculate cumulative dilution
    const initialShares = rounds[0].existingShares || 0;
    const finalShares = results[results.length - 1].totalShares;
    const cumulativeDilution = finalShares > 0
      ? ((finalShares - initialShares) / finalShares) * 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        rounds: results,
        summary: {
          initialShares,
          finalShares,
          cumulativeDilution,
          roundCount: rounds.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Compare multiple scenarios
 * POST /api/v1/dilution/compare
 */
exports.compareScenarios = async (req, res) => {
  try {
    const { scenarioIds } = req.body;

    // Validate required fields
    if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
      return res.status(400).json({
        error: 'At least 2 scenario IDs are required for comparison'
      });
    }

    const comparison = await DilutionCalculatorService.compareScenarios(scenarioIds);

    res.status(200).json({
      success: true,
      data: comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get dilution history for a company
 * GET /api/v1/dilution/history/:companyId
 */
exports.getHistory = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        error: 'Company ID is required'
      });
    }

    const history = await DilutionCalculatorService.getCompanyDilutionHistory(companyId);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Create a new dilution scenario
 * POST /api/v1/dilution/scenario
 */
exports.createScenario = async (req, res) => {
  try {
    const scenarioData = req.body;

    const scenario = await DilutionScenario.create(scenarioData);

    res.status(201).json({
      success: true,
      data: scenario
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get scenario by ID
 * GET /api/v1/dilution/scenario/:scenarioId
 */
exports.getScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await DilutionScenario.findByScenarioId(scenarioId);

    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }

    res.status(200).json({
      success: true,
      data: scenario
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all scenarios for a company
 * GET /api/v1/dilution/scenarios/:companyId
 */
exports.getScenarios = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { type, limit, skip } = req.query;

    const query = { companyId };
    if (type) {
      query.type = type;
    }

    const options = {
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
      sort: { createdAt: -1 }
    };

    const scenarios = await DilutionScenario.find(query, options);

    res.status(200).json({
      success: true,
      data: scenarios,
      count: scenarios.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update a scenario
 * PUT /api/v1/dilution/scenario/:scenarioId
 */
exports.updateScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const updateData = req.body;

    // ZeroDB: Use direct update without MongoDB $set operator
    const result = await DilutionScenario.updateOne(
      { scenarioId },
      updateData
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }

    const updatedScenario = await DilutionScenario.findByScenarioId(scenarioId);

    res.status(200).json({
      success: true,
      data: updatedScenario
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a scenario
 * DELETE /api/v1/dilution/scenario/:scenarioId
 */
exports.deleteScenario = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const result = await DilutionScenario.deleteOne({ scenarioId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Scenario deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get calculation by ID
 * GET /api/v1/dilution/calculation/:calculationId
 */
exports.getCalculation = async (req, res) => {
  try {
    const { calculationId } = req.params;

    const calculation = await DilutionCalculation.findByCalculationId(calculationId);

    if (!calculation) {
      return res.status(404).json({
        success: false,
        error: 'Calculation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: calculation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get calculations for a scenario
 * GET /api/v1/dilution/calculations/scenario/:scenarioId
 */
exports.getScenarioCalculations = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    const calculations = await DilutionCalculation.findByScenario(scenarioId, {
      sort: { createdAt: -1 }
    });

    res.status(200).json({
      success: true,
      data: calculations,
      count: calculations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get fully diluted cap table
 * GET /api/v1/dilution/fully-diluted/:companyId
 */
exports.getFullyDiluted = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { includeOptions, includeWarrants, includeSAFEs } = req.query;

    const results = await DilutionCalculatorService.calculateFullyDiluted({
      companyId,
      includeOptions: includeOptions !== 'false',
      includeWarrants: includeWarrants !== 'false',
      includeSAFEs: includeSAFEs !== 'false'
    });

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get option pool summary
 * GET /api/v1/dilution/option-pool-summary/:companyId
 */
exports.getOptionPoolSummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    const summary = await OptionPoolCalculatorService.getCompanyOptionPoolSummary(companyId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get SAFE dilution summary
 * GET /api/v1/dilution/safe-summary/:companyId
 */
exports.getSAFESummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    const summary = await SAFEDilutionService.getCompanySAFEDilution(companyId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
