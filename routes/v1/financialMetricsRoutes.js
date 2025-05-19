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
 * /api/v1/metrics/companies/{companyId}/metrics/profitability:
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
 * /api/v1/metrics/companies/{companyId}/metrics/liquidity:
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
 * /api/v1/metrics/companies/{companyId}/metrics/solvency:
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
 * /api/v1/metrics/companies/{companyId}/metrics/efficiency:
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
 * /api/v1/metrics/companies/{companyId}/metrics/dashboard:
 *   get:
 *     tags:
 *       - Financial Metrics
 *     summary: Get financial metrics dashboard
 *     description: Returns a comprehensive dashboard of all financial metrics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         schema:
 *           type: string
 *         required: true
 *         description: Unique ID of the company
 *     responses:
 *       200:
 *         description: Financial metrics dashboard retrieved successfully
 *       401:
 *         description: Unauthorized - Missing or invalid authentication
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error while retrieving dashboard
 */
router.get(
  '/companies/:companyId/metrics/dashboard',
  authenticateToken,
  hasPermission('financialReports.view'),
  financialMetricsController.getFinancialDashboard
);

module.exports = router;
