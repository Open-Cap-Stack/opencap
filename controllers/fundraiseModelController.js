/**
 * Fundraise Model Controller
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * API controller for managing fundraising models including:
 * - CRUD operations
 * - Dilution calculations
 * - Pro-forma cap table generation
 * - Scenario management
 * - Waterfall analysis integration
 * - Export functionality
 */

const FundraisingModel = require('../models/FundraisingModel');
const ModelScenario = require('../models/ModelScenario');
const DilutionCalculationService = require('../services/dilutionCalculationService');

/**
 * Create a new fundraising model
 */
exports.createModel = async (req, res) => {
    try {
        const { companyId, name, modelType, baseCapTable, financing } = req.body;

        // Validate required fields
        if (!companyId || !name || !modelType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: companyId, name, and modelType are required'
            });
        }

        if (!baseCapTable || !financing) {
            return res.status(400).json({
                success: false,
                error: 'Both baseCapTable and financing are required'
            });
        }

        // Validate numeric fields
        if (financing.amount < 0) {
            return res.status(400).json({
                success: false,
                error: 'Investment amount cannot be negative'
            });
        }

        const modelData = {
            ...req.body,
            createdBy: req.user._id
        };

        const savedModel = await FundraisingModel.create(modelData);
        res.status(201).json({
            success: true,
            data: savedModel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get model by ID
 */
exports.getModel = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        res.status(200).json({
            success: true,
            data: model
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get all models with optional filters
 */
exports.getModels = async (req, res) => {
    try {
        const { companyId, status, modelType } = req.query;
        const query = {};

        if (companyId) query.companyId = companyId;
        if (status) query.status = status;
        if (modelType) query.modelType = modelType;

        const models = await FundraisingModel.find(query, {
            sort: { createdAt: -1 }
        });

        res.status(200).json({
            success: true,
            data: models,
            count: models.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Update model configuration
 */
exports.updateModel = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        // Prevent updates to finalized models
        if (model.status === 'finalized') {
            return res.status(400).json({
                success: false,
                error: 'Cannot update finalized model'
            });
        }

        const updateData = {
            ...req.body,
            status: 'draft', // Reset to draft when configuration changes
            updatedBy: req.user._id
        };

        // Don't allow status or audit field changes through this endpoint
        delete updateData.createdBy;
        delete updateData.createdAt;
        delete updateData.modelId;

        const result = await FundraisingModel.updateOne(
            { modelId: req.params.id },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            return res.status(409).json({
                success: false,
                error: 'Model was not modified. Possible concurrent update conflict.'
            });
        }

        const updatedModel = await FundraisingModel.findOne({ modelId: req.params.id });

        res.status(200).json({
            success: true,
            data: updatedModel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Calculate dilution and pro-forma cap table for a model
 */
exports.calculateModel = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        // Calculate pro-forma cap table
        const proFormaCapTable = DilutionCalculationService.calculateProFormaCapTable(
            model.baseCapTable,
            model.financing
        );

        // Calculate dilution
        const dilutionAnalysis = DilutionCalculationService.calculateDilution(
            model.baseCapTable,
            proFormaCapTable
        );

        // Calculate valuation metrics
        const valuationMetrics = DilutionCalculationService.calculateValuationMetrics(
            proFormaCapTable
        );

        // Update model with results
        const updateData = {
            proFormaCapTable,
            dilutionAnalysis,
            valuationMetrics,
            status: 'calculated',
            calculatedAt: new Date().toISOString(),
            updatedBy: req.user._id
        };

        await FundraisingModel.updateOne(
            { modelId: req.params.id },
            { $set: updateData }
        );

        const updatedModel = await FundraisingModel.findOne({ modelId: req.params.id });

        res.status(200).json({
            success: true,
            data: updatedModel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Calculate waterfall distribution for exit scenario
 */
exports.calculateWaterfall = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        if (model.status !== 'calculated' && model.status !== 'finalized') {
            return res.status(400).json({
                success: false,
                error: 'Model must be calculated before waterfall analysis'
            });
        }

        const { exitValuation, transactionCosts = 0, escrowAmount = 0, debtPayoff = 0 } = req.body;

        if (!exitValuation || exitValuation <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Valid exit valuation is required'
            });
        }

        const waterfallResult = DilutionCalculationService.calculateWaterfallWithNewRound(
            model.proFormaCapTable,
            exitValuation,
            { transactionCosts, escrowAmount, debtPayoff }
        );

        res.status(200).json({
            success: true,
            data: waterfallResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Add a new scenario to a model
 */
exports.addScenario = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        const { name, description, scenarioType, financingOverrides } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Scenario name is required'
            });
        }

        const scenarioData = {
            modelId: model.modelId,
            companyId: model.companyId,
            name,
            description,
            scenarioType: scenarioType || 'custom',
            financingOverrides: financingOverrides || {},
            createdBy: req.user._id
        };

        const scenario = await ModelScenario.create(scenarioData);

        // Add scenario to model's scenario list
        const scenarios = model.scenarios || [];
        scenarios.push(scenario.scenarioId);
        await FundraisingModel.updateOne(
            { modelId: model.modelId },
            { $set: { scenarios, updatedBy: req.user._id } }
        );

        res.status(201).json({
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
 * Get a specific scenario
 */
exports.getScenario = async (req, res) => {
    try {
        const scenario = await ModelScenario.findOne({ scenarioId: req.params.scenarioId });

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
 * Get pro-forma cap table
 */
exports.getProFormaCapTable = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        if (model.status === 'draft') {
            return res.status(400).json({
                success: false,
                error: 'Model must be calculated before viewing pro-forma cap table'
            });
        }

        res.status(200).json({
            success: true,
            data: model.proFormaCapTable
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Export model results
 */
exports.exportModel = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        const format = req.query.format || 'json';

        if (format === 'csv') {
            // Generate CSV
            const csvLines = ['Name,Shares,Ownership %,Value,Dilution'];

            if (model.proFormaCapTable && model.proFormaCapTable.stakeholders) {
                for (const stakeholder of model.proFormaCapTable.stakeholders) {
                    csvLines.push([
                        stakeholder.name || stakeholder.stakeholderId,
                        stakeholder.shares || 0,
                        (stakeholder.ownershipPercentage || 0).toFixed(2),
                        stakeholder.value || 0,
                        (stakeholder.dilution || 0).toFixed(2)
                    ].join(','));
                }
            }

            // Add summary
            csvLines.push('');
            csvLines.push('Summary');
            csvLines.push(`Total Shares,${model.proFormaCapTable?.totalShares || 0}`);
            csvLines.push(`Post-Money Valuation,${model.proFormaCapTable?.postMoneyValuation || 0}`);
            csvLines.push(`Average Dilution,${model.dilutionAnalysis?.averageDilution || 0}%`);

            const csv = csvLines.join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=fundraising-model-${model.modelId}.csv`);
            return res.status(200).send(csv);
        }

        // Default to JSON export
        const exportData = {
            modelId: model.modelId,
            companyId: model.companyId,
            name: model.name,
            modelType: model.modelType,
            baseCapTable: model.baseCapTable,
            financing: model.financing,
            proFormaCapTable: model.proFormaCapTable,
            dilutionAnalysis: model.dilutionAnalysis,
            valuationMetrics: model.valuationMetrics,
            status: model.status,
            calculatedAt: model.calculatedAt,
            exportedAt: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            data: exportData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Delete a fundraising model
 */
exports.deleteModel = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        // Prevent deletion of finalized models
        if (model.status === 'finalized') {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete finalized model'
            });
        }

        // Delete associated scenarios first
        await ModelScenario.deleteMany({ modelId: req.params.id });

        // Delete the model
        await FundraisingModel.deleteOne({ modelId: req.params.id });

        res.status(200).json({
            success: true,
            message: 'Fundraising model and associated scenarios deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Finalize a model (prevent further changes)
 */
exports.finalizeModel = async (req, res) => {
    try {
        const model = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Fundraising model not found'
            });
        }

        if (model.status !== 'calculated') {
            return res.status(400).json({
                success: false,
                error: 'Model must be calculated before finalizing'
            });
        }

        const finalizedModel = await FundraisingModel.finalize(req.params.id, req.user._id);

        res.status(200).json({
            success: true,
            data: finalizedModel
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Clone a model for scenario comparison
 */
exports.cloneModel = async (req, res) => {
    try {
        const sourceModel = await FundraisingModel.findOne({ modelId: req.params.id });

        if (!sourceModel) {
            return res.status(404).json({
                success: false,
                error: 'Source model not found'
            });
        }

        const { name, description, financing } = req.body;

        const clonedModel = await FundraisingModel.clone(
            req.params.id,
            { name, description, financing },
            req.user._id
        );

        res.status(201).json({
            success: true,
            data: clonedModel
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
 */
exports.compareScenarios = async (req, res) => {
    try {
        const { scenarioIds } = req.body;

        if (!scenarioIds || scenarioIds.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'At least 2 scenario IDs are required for comparison'
            });
        }

        // Fetch all scenarios
        const scenarios = [];
        for (const scenarioId of scenarioIds) {
            const scenario = await ModelScenario.findOne({ scenarioId });
            if (scenario) {
                scenarios.push(scenario);
            }
        }

        if (scenarios.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Could not find enough valid scenarios for comparison'
            });
        }

        // Generate comparison report
        const comparisonReport = DilutionCalculationService.generateComparisonReport(scenarios);

        res.status(200).json({
            success: true,
            data: comparisonReport
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
