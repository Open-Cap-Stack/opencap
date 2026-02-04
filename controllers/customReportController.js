/**
 * Custom Report Controller
 * Issue #197: Build Custom Report Builder Engine
 *
 * Handles all custom report operations with ZeroDB integration.
 * Provides dynamic report building, execution, and management.
 */

const CustomReport = require('../models/CustomReport');
const CustomReportField = require('../models/CustomReportField');
const ReportFilter = require('../models/ReportFilter');
const queryBuilderService = require('../services/queryBuilderService');
const reportAggregationService = require('../services/reportAggregationService');
const zeroDbService = require('../services/zerodbService');
const { v4: uuidv4 } = require('uuid');

class CustomReportController {
  /**
   * Create a new custom report
   * POST /api/v1/reports/custom
   */
  static async createCustomReport(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Validate report configuration
      const validation = await queryBuilderService.validateReportConfig(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Invalid report configuration',
          errors: validation.errors
        });
      }

      // Create report
      const reportData = {
        ...req.body,
        reportId: uuidv4(),
        createdBy: user.id,
        companyId: req.body.companyId || user.companyId
      };

      const report = new CustomReport(reportData);
      await report.save();

      // Store in ZeroDB
      try {
        await zeroDbService.insertRow('custom_reports', {
          report_id: report.reportId,
          name: report.name,
          company_id: report.companyId,
          created_by: report.createdBy,
          data_sources: report.dataSources,
          fields: report.fields,
          status: report.status,
          created_at: report.createdAt
        });
      } catch (zeroDbError) {
        console.error('Failed to store in ZeroDB:', zeroDbError);
        // Continue - MongoDB is primary storage
      }

      return res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get custom report by ID
   * GET /api/v1/reports/custom/:id
   */
  static async getCustomReport(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const report = await CustomReport.findOne({ reportId: req.params.id });

      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check access permissions
      const hasAccess =
        report.createdBy === user.id ||
        report.isPublic ||
        report.sharedWith.includes(user.id) ||
        user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this report' });
      }

      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all custom reports
   * GET /api/v1/reports/custom
   */
  static async listCustomReports(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
      const skip = (page - 1) * limit;

      // Build query based on user permissions
      const query = {
        $or: [
          { createdBy: user.id },
          { isPublic: true },
          { sharedWith: user.id }
        ]
      };

      if (user.role === 'admin') {
        delete query.$or; // Admin can see all reports
      }

      // Add status filter if provided
      if (req.query.status) {
        query.status = req.query.status;
      }

      // Add company filter
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      } else if (user.companyId) {
        query.companyId = user.companyId;
      }

      const reports = await CustomReport.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const totalCount = await CustomReport.countDocuments(query);
      const totalPages = Math.ceil(totalCount / limit);

      return res.status(200).json({
        reports,
        totalCount,
        currentPage: page,
        totalPages,
        limit
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update custom report
   * PUT /api/v1/reports/custom/:id
   */
  static async updateCustomReport(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const report = await CustomReport.findOne({ reportId: req.params.id });

      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check permissions - only creator or admin can update
      if (report.createdBy !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to update this report' });
      }

      // Validate updated configuration
      const validation = await queryBuilderService.validateReportConfig(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Invalid report configuration',
          errors: validation.errors
        });
      }

      // Update report
      Object.assign(report, req.body);
      await report.save();

      // Update in ZeroDB
      try {
        await zeroDbService.updateRows('custom_reports',
          { report_id: report.reportId },
          {
            $set: {
              name: report.name,
              data_sources: report.dataSources,
              fields: report.fields,
              status: report.status,
              updated_at: new Date()
            }
          }
        );
      } catch (zeroDbError) {
        console.error('Failed to update in ZeroDB:', zeroDbError);
      }

      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete custom report
   * DELETE /api/v1/reports/custom/:id
   */
  static async deleteCustomReport(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const report = await CustomReport.findOne({ reportId: req.params.id });

      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check permissions
      if (report.createdBy !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this report' });
      }

      await CustomReport.deleteOne({ reportId: req.params.id });

      // Delete from ZeroDB
      try {
        await zeroDbService.deleteRows('custom_reports', { report_id: report.reportId });
      } catch (zeroDbError) {
        console.error('Failed to delete from ZeroDB:', zeroDbError);
      }

      return res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute custom report
   * POST /api/v1/reports/custom/:id/execute
   */
  static async executeCustomReport(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const report = await CustomReport.findOne({ reportId: req.params.id });

      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check access permissions
      const hasAccess =
        report.createdBy === user.id ||
        report.isPublic ||
        report.sharedWith.includes(user.id) ||
        user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied to this report' });
      }

      // Get filters for this report
      const filters = await ReportFilter.find({
        reportId: report.reportId,
        isActive: true
      });

      // Build filter query
      const filterQuery = queryBuilderService.buildFilterQuery(
        filters,
        report.fields
      );

      // Execute report with aggregations
      const results = await reportAggregationService.executeReport(report, filterQuery);

      // Update execution statistics
      report.executionCount += 1;
      report.lastExecutedAt = new Date();
      await report.save();

      return res.status(200).json({
        reportId: report.reportId,
        reportName: report.name,
        executedAt: new Date(),
        rowCount: results.length,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available data sources
   * GET /api/v1/reports/custom/data-sources
   */
  static async getDataSources(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get available tables from ZeroDB
      try {
        const tables = await zeroDbService.listTables();

        const dataSources = tables.map(table => ({
          name: table.table_name || table,
          displayName: (table.table_name || table).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          recordCount: table.row_count || 0
        }));

        return res.status(200).json({ dataSources });
      } catch (zeroDbError) {
        console.error('Failed to get tables from ZeroDB:', zeroDbError);
        // Return default data sources
        return res.status(200).json({
          dataSources: [
            { name: 'stakeholders', displayName: 'Stakeholders', recordCount: 0 },
            { name: 'transactions', displayName: 'Transactions', recordCount: 0 },
            { name: 'equity_grants', displayName: 'Equity Grants', recordCount: 0 },
            { name: 'financial_reports', displayName: 'Financial Reports', recordCount: 0 }
          ]
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available fields for data sources
   * GET /api/v1/reports/custom/fields
   */
  static async getAvailableFields(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { dataSource } = req.query;

      if (dataSource) {
        // Get fields for specific data source
        const fields = await queryBuilderService.getAvailableFields(dataSource);
        return res.status(200).json({ fields });
      }

      // Get all fields grouped by data source
      const allFields = await CustomReportField.find().sort({ dataSource: 1, displayName: 1 });

      const groupedFields = allFields.reduce((acc, field) => {
        if (!acc[field.dataSource]) {
          acc[field.dataSource] = [];
        }
        acc[field.dataSource].push(field);
        return acc;
      }, {});

      return res.status(200).json({ fieldsByDataSource: groupedFields });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview report with sample data
   * POST /api/v1/reports/custom/preview
   */
  static async previewReport(req, res, next) {
    try {
      const { user } = req;
      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Validate report configuration
      const validation = await queryBuilderService.validateReportConfig(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          message: 'Invalid report configuration',
          errors: validation.errors
        });
      }

      // Create temporary report object
      const tempReport = {
        ...req.body,
        reportId: 'preview',
        limit: Math.min(req.body.limit || 10, 50) // Limit preview to 50 rows
      };

      // Build filter query
      const filterQuery = queryBuilderService.buildFilterQuery(
        req.body.filters || [],
        req.body.fields
      );

      // Execute preview
      const results = await reportAggregationService.executeReport(tempReport, filterQuery);

      return res.status(200).json({
        preview: true,
        rowCount: results.length,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = {
  createCustomReport: CustomReportController.createCustomReport.bind(CustomReportController),
  getCustomReport: CustomReportController.getCustomReport.bind(CustomReportController),
  listCustomReports: CustomReportController.listCustomReports.bind(CustomReportController),
  updateCustomReport: CustomReportController.updateCustomReport.bind(CustomReportController),
  deleteCustomReport: CustomReportController.deleteCustomReport.bind(CustomReportController),
  executeCustomReport: CustomReportController.executeCustomReport.bind(CustomReportController),
  getDataSources: CustomReportController.getDataSources.bind(CustomReportController),
  getAvailableFields: CustomReportController.getAvailableFields.bind(CustomReportController),
  previewReport: CustomReportController.previewReport.bind(CustomReportController)
};
