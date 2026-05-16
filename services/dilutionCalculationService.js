/**
 * Dilution Calculation Service
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * Provides sophisticated dilution calculations for fundraising scenarios including:
 * - Pro-forma cap table generation
 * - Dilution impact analysis
 * - Option pool management (pre/post-money)
 * - Waterfall analysis integration
 * - Scenario comparison
 */

const WaterfallAnalysisService = require('./waterfallAnalysisService');

class DilutionCalculationService {
    /**
     * Calculate pro-forma cap table after a financing round
     * @param {Object} baseCapTable - Current cap table before financing
     * @param {Object} financing - Financing terms
     * @returns {Object} Pro-forma cap table with dilution analysis
     */
    static calculateProFormaCapTable(baseCapTable, financing) {
        // Validation
        if (!baseCapTable) {
            throw new Error('Base cap table is required');
        }

        if (!financing) {
            throw new Error('Financing terms are required');
        }

        if (financing.pricePerShare !== undefined && financing.pricePerShare <= 0) {
            throw new Error('Price per share must be positive');
        }

        if (financing.optionPoolTargetPercentage !== undefined && financing.optionPoolTargetPercentage >= 100) {
            throw new Error('Option pool target percentage must be less than 100');
        }

        const {
            amount = 0,
            pricePerShare,
            optionPoolExpansion = false,
            optionPoolTargetPercentage = 0,
            optionPoolPreOrPost = 'post',
            investors = [],
            preMoneyValuation
        } = financing;

        // Step 1: Calculate new shares from financing
        const newSharesFromFinancing = pricePerShare > 0 ? Math.round(amount / pricePerShare) : 0;

        // Step 2: Handle option pool expansion
        let optionPoolShares = baseCapTable.optionPool?.total || 0;
        let optionPoolExpansionShares = 0;

        if (optionPoolExpansion && optionPoolTargetPercentage > 0) {
            if (optionPoolPreOrPost === 'pre') {
                // Pre-money option pool: creates dilution before investment
                // Solve: targetPct/100 = poolTotal / (existingShares + poolTotal + newShares)
                // => poolTotal = (existingShares + newShares) * targetPct / (100 - targetPct)
                const existingShares = baseCapTable.totalShares || 0;
                const sharesExcludingPool = existingShares + newSharesFromFinancing;
                const targetPoolTotal = Math.ceil((sharesExcludingPool * optionPoolTargetPercentage) / (100 - optionPoolTargetPercentage));
                optionPoolExpansionShares = Math.max(0, targetPoolTotal - optionPoolShares);
            } else {
                // Post-money option pool: calculated after investment
                // Will be handled after total shares are known
            }
        }

        // Step 3: Calculate total shares after financing (before post-money option pool)
        const baseShares = baseCapTable.totalShares || 0;
        let totalSharesBeforePostPool = baseShares + optionPoolExpansionShares + newSharesFromFinancing;

        // Step 4: Handle post-money option pool
        if (optionPoolExpansion && optionPoolTargetPercentage > 0 && optionPoolPreOrPost === 'post') {
            // Target % = (optionPoolShares + expansion) / totalShares
            // Solving for total shares including expansion:
            const targetPoolShares = Math.ceil(
                (totalSharesBeforePostPool * optionPoolTargetPercentage) / (100 - optionPoolTargetPercentage)
            );
            optionPoolExpansionShares = Math.max(0, targetPoolShares - optionPoolShares);
        }

        // Step 5: Calculate final totals
        const totalShares = baseShares + optionPoolExpansionShares + newSharesFromFinancing;
        if (totalShares === 0) {
            throw new Error('Total shares cannot be zero — base cap table has no shares and no new shares are being issued');
        }
        const fullyDilutedShares = totalShares;
        optionPoolShares += optionPoolExpansionShares;

        // Step 6: Calculate post-money valuation
        const calculatedPreMoneyValuation = preMoneyValuation || (pricePerShare * baseShares);
        const postMoneyValuation = calculatedPreMoneyValuation + amount;

        // Step 7: Build pro-forma share classes
        const proFormaShareClasses = [...(baseCapTable.shareClasses || [])];

        // Add new preferred share class for this round
        if (newSharesFromFinancing > 0) {
            proFormaShareClasses.push({
                shareClassId: `series-new-${Date.now()}`,
                name: 'New Series Preferred',
                shares: newSharesFromFinancing,
                ownershipPercentage: (newSharesFromFinancing / totalShares) * 100,
                fullyDilutedPercentage: (newSharesFromFinancing / fullyDilutedShares) * 100,
                value: amount,
                preferenceType: 'preferred',
                liquidationMultiple: financing.liquidationPreference || 1,
                participationRights: financing.participatingPreferred || false
            });
        }

        // Update existing share class percentages
        proFormaShareClasses.forEach(sc => {
            if (sc.shareClassId && sc.shareClassId.startsWith('series-new')) {
                return; // Already calculated above
            }
            sc.ownershipPercentage = (sc.shares / totalShares) * 100;
            sc.fullyDilutedPercentage = (sc.shares / fullyDilutedShares) * 100;
            sc.value = sc.shares * pricePerShare;
        });

        // Step 8: Build pro-forma stakeholders
        const proFormaStakeholders = [];

        // Add existing stakeholders with updated ownership
        for (const stakeholder of baseCapTable.stakeholders || []) {
            proFormaStakeholders.push({
                stakeholderId: stakeholder.stakeholderId,
                name: stakeholder.name,
                shareClassId: stakeholder.shareClassId,
                shares: stakeholder.shares,
                ownershipPercentage: (stakeholder.shares / totalShares) * 100,
                fullyDilutedPercentage: (stakeholder.shares / fullyDilutedShares) * 100,
                value: stakeholder.shares * pricePerShare,
                dilution: 0 // Will be calculated separately
            });
        }

        // Add new investors
        for (const investor of investors) {
            const investorShares = pricePerShare > 0 ? Math.round(investor.investmentAmount / pricePerShare) : 0;
            proFormaStakeholders.push({
                stakeholderId: investor.investorId || `investor-${Date.now()}`,
                investorId: investor.investorId,
                name: investor.name,
                shareClassId: `series-new-${Date.now()}`,
                shares: investorShares,
                investmentAmount: investor.investmentAmount,
                ownershipPercentage: (investorShares / totalShares) * 100,
                fullyDilutedPercentage: (investorShares / fullyDilutedShares) * 100,
                value: investor.investmentAmount,
                leadInvestor: investor.leadInvestor || false,
                dilution: 0
            });
        }

        // Step 9: Calculate option pool
        const proFormaOptionPool = {
            allocated: baseCapTable.optionPool?.allocated || 0,
            unallocated: optionPoolShares - (baseCapTable.optionPool?.allocated || 0),
            total: optionPoolShares,
            percentageOfCapitalization: (optionPoolShares / totalShares) * 100
        };

        // Step 10: Return pro-forma cap table
        return {
            totalShares,
            fullyDilutedShares,
            postMoneyValuation,
            preMoneyValuation: calculatedPreMoneyValuation,
            shareClasses: proFormaShareClasses,
            stakeholders: proFormaStakeholders,
            optionPool: proFormaOptionPool,
            pricePerShare
        };
    }

    /**
     * Calculate dilution impact for all stakeholders
     * @param {Object} baseCapTable - Pre-financing cap table
     * @param {Object} proFormaCapTable - Post-financing cap table
     * @returns {Object} Dilution analysis
     */
    static calculateDilution(baseCapTable, proFormaCapTable) {
        if (!baseCapTable || !proFormaCapTable) {
            throw new Error('Both base and pro-forma cap tables are required');
        }

        const dilutionByStakeholder = [];
        let totalDilution = 0;
        let stakeholderCount = 0;
        let foundersDilution = 0;
        let existingInvestorsDilution = 0;
        let employeesDilution = 0;
        let foundersCount = 0;
        let investorsCount = 0;
        let employeesCount = 0;

        // Calculate dilution for each existing stakeholder
        for (const baseStakeholder of baseCapTable.stakeholders || []) {
            const proFormaStakeholder = (proFormaCapTable.stakeholders || []).find(
                s => s.stakeholderId === baseStakeholder.stakeholderId
            );

            if (proFormaStakeholder) {
                const preFunding = baseStakeholder.ownershipPercentage || 0;
                const postFunding = proFormaStakeholder.ownershipPercentage || 0;
                const dilutionPercentage = preFunding > 0 ? ((preFunding - postFunding) / preFunding) * 100 : 0;
                const absoluteDilution = preFunding - postFunding;

                dilutionByStakeholder.push({
                    stakeholderId: baseStakeholder.stakeholderId,
                    name: baseStakeholder.name,
                    preFunding,
                    postFunding,
                    dilutionPercentage: isFinite(dilutionPercentage) ? dilutionPercentage : 0,
                    absoluteDilution
                });

                if (isFinite(dilutionPercentage)) {
                    totalDilution += dilutionPercentage;
                    stakeholderCount++;

                    // Categorize by stakeholder type
                    const name = (baseStakeholder.name || '').toLowerCase();
                    if (name.includes('founder') || name.includes('ceo') || name.includes('co-founder')) {
                        foundersDilution += dilutionPercentage;
                        foundersCount++;
                    } else if (name.includes('investor') || name.includes('vc') || name.includes('fund')) {
                        existingInvestorsDilution += dilutionPercentage;
                        investorsCount++;
                    } else if (name.includes('employee') || name.includes('option') || name.includes('team')) {
                        employeesDilution += dilutionPercentage;
                        employeesCount++;
                    }
                }
            }
        }

        return {
            foundersDilution: foundersCount > 0 ? foundersDilution / foundersCount : 0,
            existingInvestorsDilution: investorsCount > 0 ? existingInvestorsDilution / investorsCount : 0,
            employeesDilution: employeesCount > 0 ? employeesDilution / employeesCount : 0,
            averageDilution: stakeholderCount > 0 ? totalDilution / stakeholderCount : 0,
            byStakeholder: dilutionByStakeholder
        };
    }

    /**
     * Calculate waterfall distribution with new financing round
     * @param {Object} proFormaCapTable - Pro-forma cap table
     * @param {number} exitValuation - Exit valuation to model
     * @param {Object} options - Waterfall options
     * @returns {Object} Waterfall analysis results
     */
    static calculateWaterfallWithNewRound(proFormaCapTable, exitValuation, options = {}) {
        if (!proFormaCapTable) {
            throw new Error('Pro-forma cap table is required');
        }

        if (!exitValuation || exitValuation <= 0) {
            throw new Error('Exit valuation must be positive');
        }

        // Build waterfall analysis input
        const waterfallInput = {
            exitValuation,
            transactionCosts: options.transactionCosts || 0,
            escrowAmount: options.escrowAmount || 0,
            debtPayoff: options.debtPayoff || 0,
            shareClasses: (proFormaCapTable.shareClasses || []).map(sc => ({
                shareClassId: sc.shareClassId,
                name: sc.name,
                totalShares: sc.shares,
                pricePerShare: proFormaCapTable.pricePerShare || 1,
                preferenceType: this._mapPreferenceType(sc.preferenceType),
                liquidationMultiple: sc.liquidationMultiple || 1,
                seniorityRank: sc.seniorityRank || 1,
                originalInvestment: sc.value || (sc.shares * (proFormaCapTable.pricePerShare || 1))
            }))
        };

        // Map participation rights to preference types
        waterfallInput.shareClasses = waterfallInput.shareClasses.map(sc => {
            if (sc.preferenceType === 'preferred' || sc.preferenceType === 'non_participating') {
                const shareClass = proFormaCapTable.shareClasses.find(c => c.shareClassId === sc.shareClassId);
                if (shareClass && shareClass.participationRights) {
                    sc.preferenceType = 'participating';
                } else {
                    sc.preferenceType = 'non_participating';
                }
            }
            return sc;
        });

        // Calculate waterfall
        const waterfallResult = WaterfallAnalysisService.calculateWaterfall(waterfallInput);

        return {
            exitValuation,
            shareClassResults: waterfallResult.shareClassResults || [],
            summary: waterfallResult.summary || {},
            stakeholderResults: this._mapWaterfallToStakeholders(
                proFormaCapTable.stakeholders || [],
                waterfallResult.shareClassResults || []
            )
        };
    }

    /**
     * Generate comparison report for multiple scenarios
     * @param {Array} scenarios - Array of scenario objects with pro-forma cap tables
     * @returns {Object} Comparison report
     */
    static generateComparisonReport(scenarios) {
        if (!scenarios || scenarios.length === 0) {
            throw new Error('At least one scenario is required');
        }

        const comparisons = scenarios.map(scenario => {
            const capTable = scenario.proFormaCapTable || {};
            const dilution = scenario.dilutionAnalysis || {};

            return {
                name: scenario.name || 'Unnamed Scenario',
                postMoneyValuation: capTable.postMoneyValuation || 0,
                averageDilution: dilution.averageDilution || 0,
                founderOwnership: this._calculateFounderOwnership(capTable.stakeholders || []),
                investorOwnership: this._calculateInvestorOwnership(capTable.stakeholders || []),
                optionPoolPercentage: capTable.optionPool?.percentageOfCapitalization || 0
            };
        });

        // Calculate summary statistics
        const valuations = comparisons.map(c => c.postMoneyValuation);
        const dilutions = comparisons.map(c => c.averageDilution);

        return {
            scenarios: comparisons,
            summary: {
                minValuation: Math.min(...valuations),
                maxValuation: Math.max(...valuations),
                avgValuation: valuations.reduce((sum, v) => sum + v, 0) / valuations.length,
                minDilution: Math.min(...dilutions),
                maxDilution: Math.max(...dilutions),
                avgDilution: dilutions.reduce((sum, d) => sum + d, 0) / dilutions.length
            },
            recommendedScenario: this._identifyBestScenario(comparisons)
        };
    }

    /**
     * Calculate valuation metrics
     * @param {Object} proFormaCapTable - Pro-forma cap table
     * @param {Object} options - Additional valuation parameters
     * @returns {Object} Valuation metrics
     */
    static calculateValuationMetrics(proFormaCapTable, options = {}) {
        const pricePerShare = proFormaCapTable.pricePerShare || 0;
        const totalShares = proFormaCapTable.totalShares || 0;
        const fullyDilutedShares = proFormaCapTable.fullyDilutedShares || totalShares;

        const fullyDilutedValue = pricePerShare * fullyDilutedShares;
        const debt = options.debt || 0;
        const cash = options.cash || 0;

        return {
            pricePerShare,
            fullyDilutedValue,
            enterpriseValue: fullyDilutedValue + debt - cash,
            equityValue: fullyDilutedValue,
            impliedValuation: proFormaCapTable.postMoneyValuation || fullyDilutedValue
        };
    }

    // Private helper methods

    /**
     * Map preference type to waterfall analysis format
     * @private
     */
    static _mapPreferenceType(preferenceType) {
        const mapping = {
            'common': 'common',
            'preferred': 'non_participating',
            'participating_preferred': 'participating',
            'warrant': 'common'
        };
        return mapping[preferenceType] || 'common';
    }

    /**
     * Map waterfall results to stakeholders
     * @private
     */
    static _mapWaterfallToStakeholders(stakeholders, shareClassResults) {
        return stakeholders.map(stakeholder => {
            const shareClassResult = shareClassResults.find(
                r => r.shareClassId === stakeholder.shareClassId
            );

            const totalProceeds = shareClassResult ? shareClassResult.totalProceeds || 0 : 0;
            const sharesOwned = stakeholder.shares || 0;

            return {
                stakeholderId: stakeholder.stakeholderId,
                name: stakeholder.name,
                shares: sharesOwned,
                proceeds: totalProceeds,
                proceedsPerShare: sharesOwned > 0 ? totalProceeds / sharesOwned : 0
            };
        });
    }

    /**
     * Calculate total founder ownership
     * @private
     */
    static _calculateFounderOwnership(stakeholders) {
        return stakeholders
            .filter(s => {
                const name = (s.name || '').toLowerCase();
                return name.includes('founder') || name.includes('ceo') || name.includes('co-founder');
            })
            .reduce((sum, s) => sum + (s.ownershipPercentage || 0), 0);
    }

    /**
     * Calculate total investor ownership
     * @private
     */
    static _calculateInvestorOwnership(stakeholders) {
        return stakeholders
            .filter(s => {
                const name = (s.name || '').toLowerCase();
                return name.includes('investor') || name.includes('vc') || name.includes('fund') || s.investorId;
            })
            .reduce((sum, s) => sum + (s.ownershipPercentage || 0), 0);
    }

    /**
     * Identify best scenario based on multiple criteria
     * @private
     */
    static _identifyBestScenario(comparisons) {
        if (comparisons.length === 0) return null;

        // Score each scenario (higher is better)
        const scored = comparisons.map(scenario => ({
            ...scenario,
            score: (scenario.postMoneyValuation / 1000000) - (scenario.averageDilution * 2) + (scenario.founderOwnership * 3)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored[0].name;
    }

    /**
     * Calculate dilution for a funding round (controller-facing API)
     * Bridges the controller's flat params to calculateProFormaCapTable
     */
    static calculateFundingRound({ companyId, preMoney, newInvestment, existingShares, sharePrice, stakeholders = [], shareClasses = [] }) {
        const defaultShareClasses = [
            { shareClassId: 'common', name: 'Common', shares: existingShares, sharesAuthorized: existingShares, sharesIssued: existingShares, pricePerShare: sharePrice, preferenceType: 'common' }
        ];
        const baseCapTable = {
            totalShares: existingShares,
            shareClasses: shareClasses.length > 0 ? shareClasses : defaultShareClasses,
            stakeholders,
            optionPool: { total: 0, allocated: 0, available: 0 }
        };

        const financing = {
            amount: newInvestment,
            pricePerShare: sharePrice,
            preMoneyValuation: preMoney
        };

        const proForma = this.calculateProFormaCapTable(baseCapTable, financing);
        const dilution = this.calculateDilution(baseCapTable, proForma);

        return {
            companyId,
            preMoney,
            postMoney: preMoney + newInvestment,
            newInvestment,
            sharePrice,
            existingShares,
            newShares: proForma.totalShares - existingShares,
            totalShares: proForma.totalShares,
            dilutionPercentage: dilution.overallDilutionPercentage,
            proFormaCapTable: proForma,
            dilutionAnalysis: dilution
        };
    }

    /**
     * Calculate fully diluted cap table for a company
     */
    static async calculateFullyDiluted({ companyId, includeOptions = true, includeWarrants = true, includeSAFEs = true }) {
        const DilutionScenario = require('../models/DilutionScenario');
        const scenarios = await DilutionScenario.find({ companyId });

        return {
            companyId,
            includeOptions,
            includeWarrants,
            includeSAFEs,
            scenarioCount: scenarios.length,
            scenarios: scenarios.map(s => ({
                scenarioId: s.scenarioId,
                name: s.name,
                type: s.type
            }))
        };
    }

    /**
     * Get dilution history for a company
     */
    static async getCompanyDilutionHistory(companyId) {
        const DilutionCalculation = require('../models/DilutionCalculation');
        const calculations = await DilutionCalculation.find({ companyId }, { sort: { createdAt: -1 } });
        return calculations;
    }

    /**
     * Compare multiple scenarios by ID
     */
    static async compareScenarios(scenarioIds) {
        const DilutionScenario = require('../models/DilutionScenario');
        const scenarios = [];
        for (const id of scenarioIds) {
            const scenario = await DilutionScenario.findByScenarioId(id);
            if (scenario) scenarios.push(scenario);
        }

        if (scenarios.length < 2) {
            throw new Error('At least 2 valid scenarios are required for comparison');
        }

        return this.generateComparisonReport(scenarios);
    }
}

module.exports = DilutionCalculationService;
