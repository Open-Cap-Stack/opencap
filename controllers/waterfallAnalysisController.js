/**
 * Waterfall Analysis Controller
 * Issue #56: Create waterfall analysis engine
 *
 * API controller for managing waterfall analyses including:
 * - CRUD operations
 * - Running waterfall calculations
 * - Comparing scenarios
 * - Exporting results
 * - Visualization data
 */
const databaseAdapter = require('../services/databaseAdapter');
const WaterfallAnalysisService = require('../services/waterfallAnalysisService');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new waterfall analysis
 */
exports.createAnalysis = async (req, res) => {
  try {
    const { companyId, exitValuation, exitType } = req.body;

    // Validate required fields
    if (!companyId || exitValuation === undefined || !exitType) {
      return res.status(400).json({
        error: 'Missing required fields: companyId, exitValuation, and exitType are required'
      });
    }

    const analysisData = {
      ...req.body,
      analysisId: req.body.analysisId || `WF-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'draft'
    };

    // Calculate net proceeds
    analysisData.netProceeds = exitValuation -
      (analysisData.transactionCosts || 0) -
      (analysisData.escrowAmount || 0) -
      (analysisData.debtPayoff || 0);

    const savedAnalysis = await databaseAdapter.create('WaterfallAnalysis', analysisData);
    res.status(201).json(savedAnalysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get analysis by ID
 */
exports.getAnalysis = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }
    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all analyses with optional filters
 */
exports.getAnalyses = async (req, res) => {
  try {
    const { companyId, exitType, status, comparisonGroupId } = req.query;
    const query = {};

    if (companyId) query.companyId = companyId;
    if (exitType) query.exitType = exitType;
    if (status) query.status = status;
    if (comparisonGroupId) query.comparisonGroupId = comparisonGroupId;

    const analyses = await databaseAdapter.find('WaterfallAnalysis', query);
    res.status(200).json(analyses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Run waterfall calculation on an analysis
 */
exports.runAnalysis = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }

    // Normalize share classes — UI sends { name, shareClassName, preferenceAmount }
    // but the service expects shareClassId, originalInvestment, and preferenceType
    const normalizedShareClasses = (analysis.shareClasses || []).map((sc, i) => ({
      shareClassId: sc.shareClassId || sc.name || `class-${i}`,
      name: sc.name || sc.shareClassName || `Class ${i + 1}`,
      shareClassName: sc.shareClassName || sc.name || `Class ${i + 1}`,
      // Standard VC preferred is 1x non-participating; 'common' only when preference is 0
      preferenceType: sc.preferenceType || (
        (sc.preferenceAmount > 0 || sc.liquidationPreference > 0) ? 'non_participating' : 'common'
      ),
      originalInvestment: sc.originalInvestment || sc.preferenceAmount || sc.liquidationPreference || 0,
      liquidationMultiple: sc.liquidationMultiple || 1,
      seniorityRank: sc.seniorityRank || (i + 1),
      totalShares: sc.totalShares || sc.shares || 0,
      pricePerShare: sc.pricePerShare || 0,
      participatingPreferred: sc.participatingPreferred || false,
      participationCap: sc.participationCap || 0,
    }));

    // Run the waterfall calculation
    const result = WaterfallAnalysisService.calculateWaterfall({
      ...analysis,
      shareClasses: normalizedShareClasses,
    });

    // Update the analysis with results
    const updateData = {
      results: result.results || [],
      shareClassResults: result.shareClassResults,
      summary: result.summary,
      status: 'calculated',
      calculatedAt: new Date()
    };

    const updatedAnalysis = await databaseAdapter.findByIdAndUpdate(
      'WaterfallAnalysis',
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json(updatedAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update analysis configuration
 */
exports.updateAnalysis = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      status: 'draft' // Reset to draft when configuration changes
    };

    // Recalculate net proceeds if relevant fields changed
    if (req.body.exitValuation !== undefined ||
        req.body.transactionCosts !== undefined ||
        req.body.escrowAmount !== undefined ||
        req.body.debtPayoff !== undefined) {
      const existing = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
      if (existing) {
        const exitVal = req.body.exitValuation ?? existing.exitValuation;
        const transCosts = req.body.transactionCosts ?? existing.transactionCosts ?? 0;
        const escrow = req.body.escrowAmount ?? existing.escrowAmount ?? 0;
        const debt = req.body.debtPayoff ?? existing.debtPayoff ?? 0;
        updateData.netProceeds = exitVal - transCosts - escrow - debt;
      }
    }

    const analysis = await databaseAdapter.findByIdAndUpdate(
      'WaterfallAnalysis',
      req.params.id,
      updateData,
      { new: true }
    );

    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }

    res.status(200).json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete an analysis
 */
exports.deleteAnalysis = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findByIdAndDelete('WaterfallAnalysis', req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }
    res.status(200).json({ message: 'Waterfall analysis deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Compare multiple scenarios
 */
exports.compareScenarios = async (req, res) => {
  try {
    const { scenarioIds } = req.body;

    if (!scenarioIds || scenarioIds.length < 2) {
      return res.status(400).json({
        error: 'At least 2 scenario IDs are required for comparison'
      });
    }

    // Fetch all scenarios
    const analyses = await databaseAdapter.find('WaterfallAnalysis', {
      _id: { $in: scenarioIds }
    });

    if (analyses.length < 2) {
      return res.status(400).json({
        error: 'Could not find enough valid scenarios for comparison'
      });
    }

    // Run comparison
    const comparison = WaterfallAnalysisService.compareScenarios(analyses);

    // Calculate comparison metrics
    const comparisonMetrics = {
      minExitValuation: Math.min(...comparison.map(c => c.exitValuation)),
      maxExitValuation: Math.max(...comparison.map(c => c.exitValuation)),
      avgExitValuation: comparison.reduce((sum, c) => sum + c.exitValuation, 0) / comparison.length
    };

    res.status(200).json({
      comparison,
      metrics: comparisonMetrics
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get visualization data for charts
 */
exports.getVisualizationData = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }

    const options = {
      includeSensitivity: req.query.includeSensitivity === 'true'
    };

    const chartData = WaterfallAnalysisService.generateWaterfallChart(analysis, options);

    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Export analysis results
 */
exports.exportResults = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }

    const format = req.query.format || 'json';

    if (format === 'csv') {
      // Generate CSV
      const csvLines = ['Share Class,Total Shares,Preference Amount,Participation Amount,Total Proceeds,Percentage of Exit'];

      if (analysis.shareClassResults) {
        for (const result of analysis.shareClassResults) {
          csvLines.push([
            result.shareClassName || result.shareClassId,
            result.totalShares || 0,
            result.preferenceAmount || 0,
            result.participationAmount || 0,
            result.totalProceeds || 0,
            (result.percentageOfExit || 0).toFixed(2)
          ].join(','));
        }
      }

      // Add summary
      csvLines.push('');
      csvLines.push('Summary');
      if (analysis.summary) {
        csvLines.push(`Total Distributed,${analysis.summary.totalDistributed || 0}`);
        csvLines.push(`Total to Preferred,${analysis.summary.totalToPreferred || 0}`);
        csvLines.push(`Total to Common,${analysis.summary.totalToCommon || 0}`);
        csvLines.push(`Effective Exit Multiple,${(analysis.summary.effectiveExitMultiple || 0).toFixed(2)}x`);
      }

      const csv = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=waterfall-analysis-${analysis.analysisId || analysis._id}.csv`);
      return res.status(200).send(csv);
    }

    // Default to JSON export
    const exportData = {
      analysisId: analysis.analysisId,
      companyId: analysis.companyId,
      scenarioName: analysis.scenarioName,
      exitValuation: analysis.exitValuation,
      exitType: analysis.exitType,
      netProceeds: analysis.netProceeds,
      shareClassResults: analysis.shareClassResults,
      summary: analysis.summary,
      calculatedAt: analysis.calculatedAt,
      exportedAt: new Date().toISOString()
    };

    res.status(200).json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Clone an existing analysis
 */
exports.cloneAnalysis = async (req, res) => {
  try {
    const sourceAnalysis = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
    if (!sourceAnalysis) {
      return res.status(404).json({ message: 'Source analysis not found' });
    }

    // Create clone data (exclude _id and timestamps)
    const cloneData = {
      companyId: sourceAnalysis.companyId,
      exitValuation: sourceAnalysis.exitValuation,
      exitType: sourceAnalysis.exitType,
      transactionCosts: sourceAnalysis.transactionCosts,
      escrowAmount: sourceAnalysis.escrowAmount,
      debtPayoff: sourceAnalysis.debtPayoff,
      netProceeds: sourceAnalysis.netProceeds,
      shareClasses: sourceAnalysis.shareClasses,
      scenarioName: req.body.scenarioName || `Copy of ${sourceAnalysis.scenarioName || 'Untitled'}`,
      scenarioDescription: req.body.scenarioDescription || sourceAnalysis.scenarioDescription,
      analysisId: `WF-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'draft',
      comparisonGroupId: sourceAnalysis.comparisonGroupId || sourceAnalysis._id
    };

    const clonedAnalysis = await databaseAdapter.create('WaterfallAnalysis', cloneData);
    res.status(201).json(clonedAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Finalize an analysis (mark as final, prevent further changes)
 */
exports.finalizeAnalysis = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findById('WaterfallAnalysis', req.params.id);
    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }

    if (analysis.status !== 'calculated') {
      return res.status(400).json({
        error: 'Analysis must be calculated before finalizing'
      });
    }

    const updatedAnalysis = await databaseAdapter.findByIdAndUpdate(
      'WaterfallAnalysis',
      req.params.id,
      { status: 'finalized' },
      { new: true }
    );

    res.status(200).json(updatedAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Archive an analysis
 */
exports.archiveAnalysis = async (req, res) => {
  try {
    const analysis = await databaseAdapter.findByIdAndUpdate(
      'WaterfallAnalysis',
      req.params.id,
      { status: 'archived' },
      { new: true }
    );

    if (!analysis) {
      return res.status(404).json({ message: 'Waterfall analysis not found' });
    }

    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
