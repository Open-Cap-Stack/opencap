/**
 * Scenario Fundraise Controller
 * Issue #661: Unified scenario modeling endpoint
 *
 * POST /api/v1/scenarios/fundraise
 * Wraps existing dilution services into one unified endpoint.
 *
 * Accepts:
 *   preMoney, raiseAmount, instrument ('priced'|'safe'|'note'),
 *   optionPoolExpansionPct, stackOnScenarioId (optional),
 *   stakeholders, existingShares, valuationCap, discountRate
 *
 * Returns:
 *   scenarioId, inputs summary, ownershipTable (per-stakeholder pre/post)
 */

const { v4: uuidv4 } = require('uuid');
const DilutionCalculatorService = require('../services/dilutionCalculationService');
const SAFEDilutionService = require('../services/safeDilutionService');

const VALID_INSTRUMENTS = ['priced', 'safe', 'note'];

/**
 * POST /api/v1/scenarios/fundraise
 */
exports.fundraise = async (req, res) => {
  try {
    const {
      preMoney,
      raiseAmount,
      instrument,
      optionPoolExpansionPct,
      stackOnScenarioId,
      stakeholders = [],
      existingShares,
      valuationCap,
      discountRate,
      companyId
    } = req.body;

    // Validate required fields
    if (!preMoney && preMoney !== 0) {
      return res.status(400).json({ error: 'preMoney is required' });
    }
    if (!raiseAmount && raiseAmount !== 0) {
      return res.status(400).json({ error: 'raiseAmount is required' });
    }
    if (!instrument || !VALID_INSTRUMENTS.includes(instrument)) {
      return res.status(400).json({
        error: `instrument must be one of: ${VALID_INSTRUMENTS.join(', ')}`
      });
    }

    const effectiveExistingShares = existingShares || stakeholders.reduce((sum, sh) => sum + (sh.sharesOwned || 0), 0) || 1000000;
    const sharePrice = preMoney / effectiveExistingShares;

    let calculationResult;

    if (instrument === 'priced') {
      calculationResult = await DilutionCalculatorService.calculateFundingRound({
        companyId: companyId || req.user?.companyId,
        preMoney,
        newInvestment: raiseAmount,
        existingShares: effectiveExistingShares,
        sharePrice,
        stakeholders,
        optionPoolExpansion: Boolean(optionPoolExpansionPct),
        optionPoolTargetPercentage: optionPoolExpansionPct || 0
      });
    } else if (instrument === 'safe' || instrument === 'note') {
      calculationResult = await SAFEDilutionService.calculateSAFEDilution({
        safeAmount: raiseAmount,
        valuationCap: valuationCap || preMoney,
        discountRate: discountRate || 0,
        currentSharePrice: sharePrice,
        existingShares: effectiveExistingShares,
        stakeholders
      });
    }

    // Build per-stakeholder ownership table
    const resultStakeholders = calculationResult?.stakeholders || stakeholders;
    const ownershipTable = resultStakeholders.map(sh => ({
      stakeholderId: sh.stakeholderId || sh.id,
      name: sh.name,
      sharesOwned: sh.sharesOwned || 0,
      preOwnershipPct: typeof sh.preOwnership === 'number' ? sh.preOwnership : null,
      postOwnershipPct: typeof sh.postOwnership === 'number' ? sh.postOwnership : null
    }));

    const scenarioId = `sc_${uuidv4()}`;

    res.status(200).json({
      scenarioId,
      inputs: {
        preMoney,
        raiseAmount,
        instrument,
        optionPoolExpansionPct: optionPoolExpansionPct || 0,
        stackOnScenarioId: stackOnScenarioId || null
      },
      ownershipTable,
      calculationDetails: calculationResult,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scenario fundraise calculation failed:', error);
    res.status(500).json({ error: error.message });
  }
};
