/**
 * Financial Metrics Routes
 * 
 * [Feature] OCAE-402: Create financial metrics calculation endpoints
 * Router for financial metrics API endpoints with appropriate RBAC
 */

const express = require('express');
const router = express.Router();
const financialMetricsController = require('../../controllers/v1/financialMetricsController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasPermission } = require('../../middleware/rbacMiddleware');

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/profitability:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate profitability metrics for a company
 *     description: Calculates gross profit margin, operating profit margin, and net profit margin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *     responses:
 *       200:
 *         description: Profitability metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/profitability',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateProfitabilityMetrics
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/liquidity:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate liquidity metrics for a company
 *     description: Calculates current ratio, quick ratio, and cash ratio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *     responses:
 *       200:
 *         description: Liquidity metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/liquidity',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateLiquidityMetrics
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/solvency:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate solvency metrics for a company
 *     description: Calculates debt-to-equity ratio, debt-to-asset ratio, and interest coverage ratio
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *     responses:
 *       200:
 *         description: Solvency metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/solvency',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateSolvencyMetrics
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/efficiency:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate efficiency metrics for a company
 *     description: Calculates asset turnover, inventory turnover, and receivables turnover ratios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *     responses:
 *       200:
 *         description: Efficiency metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/efficiency',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateEfficiencyMetrics
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/growth:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate growth metrics for a company
 *     description: Calculates year-over-year or quarter-over-quarter growth rates for key financials
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *       - in: query
 *         name: compareWith
 *         schema:
 *           type: string
 *           enum: [previous-year, previous-quarter]
 *         required: false
 *         description: Basis for comparison (defaults to previous-year)
 *     responses:
 *       200:
 *         description: Growth metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/growth',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateGrowthMetrics
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/valuation:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate valuation metrics for a company
 *     description: Calculates P/E ratio, EV/EBITDA, P/B ratio, and other valuation metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *     responses:
 *       200:
 *         description: Valuation metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/valuation',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateValuationMetrics
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/metrics/dashboard:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Calculate comprehensive financial metrics dashboard
 *     description: Combines all financial metrics into a single dashboard view
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *         required: true
 *         description: Reporting period in format YYYY-QX or YYYY-full (e.g., 2024-Q1 or 2024-full)
 *     responses:
 *       200:
 *         description: Comprehensive metrics calculated successfully
 *       400:
 *         description: Invalid input parameters
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: No financial data found for the specified period
 *       500:
 *         description: Server error while calculating metrics
 */
router.get(
  '/companies/:companyId/metrics/dashboard',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.calculateComprehensiveMetrics
);

module.exports = router;
