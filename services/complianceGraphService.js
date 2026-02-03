/**
 * Compliance Graph Service
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Provides compliance tracking and audit trail functionality using graph database:
 * - Compliance trail tracking
 * - Audit path retrieval
 * - Compliance gap detection
 * - Compliance report generation
 */

const graphDatabaseService = require('./graphDatabaseService');
const { v4: uuidv4 } = require('uuid');

class ComplianceGraphService {
  constructor() {
    this.actionTypes = [
      'CREATED', 'REVIEWED', 'APPROVED', 'REJECTED',
      'SIGNED', 'ARCHIVED', 'STATUS_CHANGE', 'FINAL_APPROVAL'
    ];
  }

  // ==================== Compliance Trail Tracking ====================

  /**
   * Track a compliance action in the graph
   * @param {Object} trailData - Trail data
   * @param {string} trailData.documentId - Document ID
   * @param {string} trailData.action - Compliance action
   * @param {string} trailData.actorId - Actor performing the action
   * @param {string} trailData.actorRole - Actor's role
   * @param {Date} trailData.timestamp - Action timestamp
   * @param {string} trailData.companyId - Company ID
   * @param {string} trailData.previousActionId - Previous action in chain
   * @returns {Promise<Object>} Trail result
   */
  async trackComplianceTrail(trailData) {
    this._validateTrailData(trailData);

    try {
      const {
        documentId,
        documentType,
        action,
        actorId,
        actorRole,
        timestamp = new Date(),
        companyId,
        previousActionId,
        fromStatus,
        toStatus
      } = trailData;

      // Check if document node exists
      let documentNode;
      const existingDocs = await graphDatabaseService.findNodes('Document', { id: documentId });

      if (existingDocs.length > 0) {
        documentNode = existingDocs[0];
      } else {
        // Create document node
        documentNode = await graphDatabaseService.createNode(['Document', 'ComplianceDocument'], {
          id: documentId,
          type: documentType || 'document',
          companyId,
          createdAt: timestamp.toISOString()
        });
      }

      // Create or get actor node
      const actorNode = await graphDatabaseService.createNode(['Actor', 'User'], {
        id: actorId,
        role: actorRole || 'unknown'
      });

      // Create compliance action node
      const actionId = uuidv4();
      const actionNode = await graphDatabaseService.createNode(['ComplianceAction'], {
        id: actionId,
        action,
        timestamp: timestamp.toISOString(),
        documentId,
        actorId,
        fromStatus,
        toStatus
      });

      // Create relationships
      await graphDatabaseService.createRelationship(
        { label: 'ComplianceAction', id: actionId },
        { label: 'Document', id: documentId },
        'ACTION_ON',
        { timestamp: timestamp.toISOString() }
      );

      await graphDatabaseService.createRelationship(
        { label: 'Actor', id: actorId },
        { label: 'ComplianceAction', id: actionId },
        'PERFORMED',
        { timestamp: timestamp.toISOString() }
      );

      // Link to previous action if exists
      if (previousActionId) {
        await graphDatabaseService.createRelationship(
          { label: 'ComplianceAction', id: previousActionId },
          { label: 'ComplianceAction', id: actionId },
          'FOLLOWED_BY',
          { timestamp: timestamp.toISOString() }
        );
      }

      const result = {
        success: true,
        trailId: actionId,
        documentId,
        action,
        actorId,
        timestamp
      };

      if (fromStatus && toStatus) {
        result.statusChange = { from: fromStatus, to: toStatus };
      }

      return result;
    } catch (error) {
      console.error('Track compliance trail error:', error);
      throw new Error(`Failed to track compliance trail: ${error.message}`);
    }
  }

  /**
   * Get the full compliance trail for a document
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Compliance trail
   */
  async getComplianceTrail(documentId) {
    try {
      const query = `
        MATCH (d:Document {id: $documentId})<-[:ACTION_ON]-(action:ComplianceAction)
        OPTIONAL MATCH (actor:Actor)-[:PERFORMED]->(action)
        RETURN action, actor
        ORDER BY action.timestamp ASC
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { documentId });

      const trail = result.records.map(record => {
        const action = record.get('action');
        const actor = record.get('actor');

        return {
          actionId: action?.properties?.id,
          action: action?.properties?.action,
          timestamp: action?.properties?.timestamp,
          actor: actor ? {
            id: actor.properties?.id,
            name: actor.properties?.name,
            role: actor.properties?.role
          } : null
        };
      });

      return {
        documentId,
        trail,
        totalActions: trail.length
      };
    } catch (error) {
      console.error('Get compliance trail error:', error);
      throw new Error(`Failed to retrieve compliance trail: ${error.message}`);
    }
  }

  // ==================== Audit Path ====================

  /**
   * Get audit path for a document
   * @param {string} documentId - Document ID
   * @param {Object} options - Path options
   * @returns {Promise<Object>} Audit path
   */
  async getAuditPath(documentId, options = {}) {
    try {
      let fromNode, toNode;

      if (options.fromAction && options.toAction) {
        fromNode = { label: 'ComplianceAction', id: options.fromAction };
        toNode = { label: 'ComplianceAction', id: options.toAction };
      } else {
        fromNode = { label: 'Document', id: documentId };
        toNode = { label: 'ComplianceAction', id: 'FINAL_APPROVAL' };
      }

      const path = await graphDatabaseService.findShortestPath(fromNode, toNode, {
        maxDepth: options.maxDepth || 15,
        relationshipTypes: ['ACTION_ON', 'FOLLOWED_BY', 'APPROVED_BY', 'REVIEWED_BY']
      });

      if (!path) {
        return {
          documentId,
          path: null,
          complete: false
        };
      }

      // Calculate duration if timestamps available
      let duration = null;
      if (path.start?.properties?.timestamp && path.end?.properties?.timestamp) {
        const startDate = new Date(path.start.properties.timestamp);
        const endDate = new Date(path.end.properties.timestamp);
        const diffMs = endDate - startDate;
        duration = {
          milliseconds: diffMs,
          days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
          hours: Math.floor(diffMs / (1000 * 60 * 60))
        };
      }

      return {
        documentId,
        path: {
          start: path.start,
          end: path.end,
          segments: path.segments.map(seg => ({
            ...seg,
            timestamp: seg.relationship?.properties?.timestamp
          })),
          length: path.length
        },
        complete: true,
        duration
      };
    } catch (error) {
      console.error('Get audit path error:', error);
      throw new Error(`Failed to get audit path: ${error.message}`);
    }
  }

  /**
   * Get full audit trail as graph structure
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Graph structure
   */
  async getAuditTrailGraph(documentId) {
    try {
      const query = `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH path = (d)<-[*]-(n)
        WITH collect(distinct n) + d as nodes, collect(distinct relationships(path)) as rels
        UNWIND rels as relList
        UNWIND relList as rel
        RETURN nodes, collect(distinct rel) as relationships
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { documentId });

      if (result.records.length === 0) {
        return { nodes: [], relationships: [] };
      }

      const record = result.records[0];
      return {
        nodes: record.get('nodes') || [],
        relationships: record.get('relationships') || []
      };
    } catch (error) {
      console.error('Get audit trail graph error:', error);
      throw new Error(`Failed to get audit trail graph: ${error.message}`);
    }
  }

  // ==================== Compliance Gaps ====================

  /**
   * Find compliance gaps for a document
   * @param {string} documentId - Document ID
   * @param {Object} options - Gap detection options
   * @returns {Promise<Object>} Compliance gaps
   */
  async findComplianceGaps(documentId, options = {}) {
    try {
      const {
        requiredApprovals = [],
        requiredSignatories = [],
        checkExpiration = false,
        expirationDays = 30,
        checkOrphans = false,
        documentType
      } = options;

      // Get existing actions
      const query = `
        MATCH (d:Document {id: $documentId})<-[:ACTION_ON]-(action:ComplianceAction)
        RETURN action
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { documentId });
      const existingActions = result.records.map(r => r.get('action')?.properties?.action);

      // Find missing required approvals
      const gaps = [];
      for (const required of requiredApprovals) {
        if (!existingActions.includes(required)) {
          gaps.push({ missing: required, type: 'required_approval' });
        }
      }

      // Check for chain breaks
      let chainBreaks = [];
      if (result.records.length > 1) {
        const chainQuery = `
          MATCH (d:Document {id: $documentId})<-[:ACTION_ON]-(a1:ComplianceAction)
          MATCH (d)<-[:ACTION_ON]-(a2:ComplianceAction)
          WHERE a1.timestamp < a2.timestamp
          AND NOT (a1)-[:FOLLOWED_BY]->(a2)
          RETURN {from: a1.id, to: a2.id, missing: 'LINK'} as chainBreaks
        `;
        const chainResult = await graphDatabaseService.runCypherQuery(chainQuery, { documentId });
        chainBreaks = chainResult.records.map(r => r.get('chainBreaks'));
      }

      // Check for expired approvals
      let expiredApprovals = [];
      if (checkExpiration) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() - expirationDays);

        expiredApprovals = result.records
          .filter(r => {
            const action = r.get('action');
            const validUntil = action?.properties?.validUntil;
            return validUntil && new Date(validUntil) < new Date();
          })
          .map(r => r.get('action')?.properties);
      }

      // Check for missing signatories
      let missingSignatories = requiredSignatories;
      if (requiredSignatories.length > 0) {
        const signatoryQuery = `
          MATCH (d:Document {id: $documentId})<-[:ACTION_ON]-(action:ComplianceAction)
          MATCH (actor:Actor)-[:PERFORMED]->(action)
          WHERE action.action = 'SIGNED'
          RETURN actor.role as role
        `;
        const signatoryResult = await graphDatabaseService.runCypherQuery(signatoryQuery, { documentId });
        const signedRoles = signatoryResult.records.map(r => r.get('role'));
        missingSignatories = requiredSignatories.filter(s => !signedRoles.includes(s));
      }

      // Check for orphaned actions
      let orphanedActions = [];
      if (checkOrphans) {
        const orphanQuery = `
          MATCH (action:ComplianceAction {documentId: $documentId})
          WHERE NOT (action)-[:ACTION_ON]->(:Document)
          RETURN action
        `;
        const orphanResult = await graphDatabaseService.runCypherQuery(orphanQuery, { documentId });
        orphanedActions = orphanResult.records.map(r => r.get('action'));
      }

      // Calculate compliance score
      const totalRequired = requiredApprovals.length;
      const completed = totalRequired - gaps.length;
      const complianceScore = totalRequired > 0 ? (completed / totalRequired) * 100 : 100;

      return {
        documentId,
        gaps,
        chainBreaks,
        expiredApprovals,
        missingSignatories,
        orphanedActions,
        complianceScore,
        compliant: gaps.length === 0 && chainBreaks.length === 0 && expiredApprovals.length === 0
      };
    } catch (error) {
      console.error('Find compliance gaps error:', error);
      throw new Error(`Failed to find compliance gaps: ${error.message}`);
    }
  }

  /**
   * Find compliance gaps across all company documents
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} Company compliance gaps
   */
  async findCompanyComplianceGaps(companyId) {
    try {
      const query = `
        MATCH (d:Document {companyId: $companyId})
        OPTIONAL MATCH (d)<-[:ACTION_ON]-(action:ComplianceAction)
        WITH d, count(action) as actionCount
        WHERE actionCount = 0 OR d.status <> 'compliant'
        RETURN {documentId: d.id, gaps: CASE WHEN actionCount = 0 THEN 1 ELSE 0 END} as docGaps
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { companyId });

      return {
        companyId,
        documentsWithGaps: result.records.map(r => r.get('docGaps')),
        totalDocumentsChecked: result.records.length
      };
    } catch (error) {
      console.error('Find company compliance gaps error:', error);
      throw new Error(`Failed to find company compliance gaps: ${error.message}`);
    }
  }

  // ==================== Compliance Report Generation ====================

  /**
   * Generate comprehensive compliance report
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Compliance report
   */
  async generateComplianceReport(companyId, options = {}) {
    const {
      startDate,
      endDate,
      documentType,
      includeTimeline = false,
      includeRiskAssessment = false,
      includeApprovalAnalysis = false
    } = options;

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    try {
      const params = { companyId };
      let dateFilter = '';

      if (startDate && endDate) {
        dateFilter = 'AND action.timestamp >= $startDate AND action.timestamp <= $endDate';
        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      let typeFilter = '';
      if (documentType) {
        typeFilter = `AND d.type = '${documentType}'`;
      }

      // Get statistics
      const statsQuery = `
        MATCH (d:Document {companyId: $companyId})${typeFilter}
        OPTIONAL MATCH (d)<-[:ACTION_ON]-(action:ComplianceAction)${dateFilter}
        WITH d, count(action) as actions,
             CASE WHEN d.status = 'compliant' THEN 1 ELSE 0 END as isCompliant,
             CASE WHEN d.status = 'pending' THEN 1 ELSE 0 END as isPending,
             CASE WHEN d.status = 'rejected' THEN 1 ELSE 0 END as isRejected
        RETURN count(d) as total,
               sum(isCompliant) as compliant,
               sum(isPending) as pending,
               sum(isRejected) as rejected
      `;

      const statsResult = await graphDatabaseService.runCypherQuery(statsQuery, params);
      const stats = statsResult.records[0];

      const totalDocuments = this._toNumber(stats?.get('total')) || 0;
      const compliantDocuments = this._toNumber(stats?.get('compliant')) || 0;

      const statistics = {
        totalDocuments,
        compliantDocuments,
        pendingDocuments: this._toNumber(stats?.get('pending')) || 0,
        rejectedDocuments: this._toNumber(stats?.get('rejected')) || 0,
        complianceRate: totalDocuments > 0 ? (compliantDocuments / totalDocuments) * 100 : 0
      };

      // Get actor activity
      const actorQuery = `
        MATCH (actor:Actor)-[:PERFORMED]->(action:ComplianceAction)-[:ACTION_ON]->(d:Document {companyId: $companyId})
        ${dateFilter}
        RETURN actor.id as actorId,
               count(action) as actions,
               sum(CASE WHEN action.action = 'APPROVED' THEN 1 ELSE 0 END) as approvals
        ORDER BY actions DESC
      `;

      const actorResult = await graphDatabaseService.runCypherQuery(actorQuery, params);
      const actorActivity = actorResult.records.map(r => ({
        actorId: r.get('actorId'),
        totalActions: this._toNumber(r.get('actions')),
        approvals: this._toNumber(r.get('approvals'))
      }));

      const report = {
        companyId,
        generatedAt: new Date().toISOString(),
        dateRange: { startDate, endDate },
        summary: {
          totalDocuments,
          compliantDocuments,
          complianceRate: statistics.complianceRate
        },
        statistics,
        actorActivity
      };

      // Include timeline if requested
      if (includeTimeline) {
        const timelineQuery = `
          MATCH (action:ComplianceAction)-[:ACTION_ON]->(d:Document {companyId: $companyId})
          WITH substring(action.timestamp, 0, 7) as month, count(action) as count
          RETURN month, count
          ORDER BY month
        `;
        const timelineResult = await graphDatabaseService.runCypherQuery(timelineQuery, params);
        report.timeline = timelineResult.records.map(r => ({
          month: r.get('month'),
          actionCount: this._toNumber(r.get('count'))
        }));
      }

      // Include risk assessment if requested
      if (includeRiskAssessment) {
        const riskQuery = `
          MATCH (d:Document {companyId: $companyId})
          OPTIONAL MATCH (d)<-[:ACTION_ON]-(action:ComplianceAction)
          WITH d,
               CASE WHEN d.deadline < datetime() AND d.status <> 'compliant' THEN 1 ELSE 0 END as overdue,
               CASE WHEN d.deadline < datetime() + duration('P7D') THEN 1 ELSE 0 END as expiringSoon,
               CASE WHEN d.priority = 'critical' AND d.status = 'pending' THEN 1 ELSE 0 END as pendingCritical
          RETURN sum(overdue) as overdueCount,
                 sum(expiringSoon) as expiringSoon,
                 sum(pendingCritical) as pendingCritical
        `;
        const riskResult = await graphDatabaseService.runCypherQuery(riskQuery, params);
        const risk = riskResult.records[0];

        const overdueCount = this._toNumber(risk?.get('overdueCount')) || 0;
        const pendingCritical = this._toNumber(risk?.get('pendingCritical')) || 0;

        let riskLevel = 'low';
        if (overdueCount > 5 || pendingCritical > 0) riskLevel = 'high';
        else if (overdueCount > 0) riskLevel = 'medium';

        report.riskAssessment = {
          overdueCount,
          expiringSoon: this._toNumber(risk?.get('expiringSoon')) || 0,
          pendingCritical,
          riskLevel
        };
      }

      // Include approval analysis if requested
      if (includeApprovalAnalysis) {
        const analysisQuery = `
          MATCH (a1:ComplianceAction)-[:FOLLOWED_BY]->(a2:ComplianceAction)
          WHERE a1.documentId IN [d.id | (d:Document {companyId: $companyId})]
          WITH duration.between(datetime(a1.timestamp), datetime(a2.timestamp)).days as days
          RETURN avg(days) as avgApprovalTime,
                 max(days) as maxApprovalTime,
                 min(days) as minApprovalTime
        `;
        const analysisResult = await graphDatabaseService.runCypherQuery(analysisQuery, params);
        const analysis = analysisResult.records[0];

        report.approvalAnalysis = {
          averageApprovalTime: this._toNumber(analysis?.get('avgApprovalTime')) || 0,
          maxApprovalTime: this._toNumber(analysis?.get('maxApprovalTime')) || 0,
          minApprovalTime: this._toNumber(analysis?.get('minApprovalTime')) || 0
        };
      }

      return report;
    } catch (error) {
      console.error('Generate compliance report error:', error);
      throw new Error(`Failed to generate compliance report: ${error.message}`);
    }
  }

  /**
   * Generate report for specific document
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Document compliance report
   */
  async generateDocumentComplianceReport(documentId) {
    try {
      const query = `
        MATCH (d:Document {id: $documentId})
        OPTIONAL MATCH (d)<-[:ACTION_ON]-(action:ComplianceAction)
        RETURN d as document,
               d.status as complianceStatus,
               count(action) as approvalCount
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { documentId });

      if (result.records.length === 0) {
        throw new Error('Document not found');
      }

      const record = result.records[0];

      return {
        documentId,
        document: record.get('document')?.properties,
        complianceStatus: record.get('complianceStatus'),
        approvalCount: this._toNumber(record.get('approvalCount'))
      };
    } catch (error) {
      console.error('Generate document compliance report error:', error);
      throw new Error(`Failed to generate document compliance report: ${error.message}`);
    }
  }

  /**
   * Export compliance report in specified format
   * @param {Object} reportData - Report data
   * @param {string} format - Export format
   * @returns {Promise<Object>} Exported report
   */
  async exportComplianceReport(reportData, format = 'json') {
    try {
      let data;

      switch (format) {
        case 'csv':
          data = this._convertToCSV(reportData);
          break;
        case 'json':
        default:
          data = JSON.stringify(reportData, null, 2);
          break;
      }

      return {
        format,
        data,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Export compliance report error:', error);
      throw new Error(`Failed to export compliance report: ${error.message}`);
    }
  }

  // ==================== Compliance Workflow ====================

  /**
   * Initiate a compliance workflow
   * @param {Object} workflowData - Workflow data
   * @returns {Promise<Object>} Created workflow
   */
  async initiateComplianceWorkflow(workflowData) {
    try {
      const {
        documentId,
        workflowType,
        requiredSteps,
        deadline
      } = workflowData;

      const workflowId = uuidv4();

      await graphDatabaseService.createNode(['ComplianceWorkflow'], {
        id: workflowId,
        documentId,
        workflowType,
        requiredSteps: JSON.stringify(requiredSteps),
        deadline: deadline?.toISOString(),
        status: 'initiated',
        createdAt: new Date().toISOString()
      });

      await graphDatabaseService.createRelationship(
        { label: 'ComplianceWorkflow', id: workflowId },
        { label: 'Document', id: documentId },
        'WORKFLOW_FOR',
        {}
      );

      return {
        workflowId,
        status: 'initiated',
        documentId,
        requiredSteps
      };
    } catch (error) {
      console.error('Initiate compliance workflow error:', error);
      throw new Error(`Failed to initiate compliance workflow: ${error.message}`);
    }
  }

  /**
   * Complete a workflow step
   * @param {string} workflowId - Workflow ID
   * @param {string} step - Step to complete
   * @param {Object} data - Completion data
   * @returns {Promise<Object>} Completion result
   */
  async completeWorkflowStep(workflowId, step, data = {}) {
    try {
      const query = `
        MATCH (w:ComplianceWorkflow {id: $workflowId})
        CREATE (s:WorkflowStep {
          step: $step,
          status: 'completed',
          completedAt: $completedAt,
          actorId: $actorId
        })
        CREATE (w)-[:HAS_STEP]->(s)
        RETURN s
      `;

      const result = await graphDatabaseService.runCypherQuery(query, {
        workflowId,
        step,
        completedAt: (data.completedAt || new Date()).toISOString(),
        actorId: data.actorId
      });

      return {
        stepCompleted: step,
        success: true,
        workflowId
      };
    } catch (error) {
      console.error('Complete workflow step error:', error);
      throw new Error(`Failed to complete workflow step: ${error.message}`);
    }
  }

  // ==================== Compliance Queries ====================

  /**
   * Get documents by compliance status
   * @param {string} companyId - Company ID
   * @param {string} status - Compliance status
   * @returns {Promise<Object[]>} Documents
   */
  async getDocumentsByComplianceStatus(companyId, status) {
    try {
      const query = `
        MATCH (d:Document {companyId: $companyId, status: $status})
        RETURN d
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { companyId, status });

      return result.records.map(r => r.get('d')?.properties);
    } catch (error) {
      console.error('Get documents by compliance status error:', error);
      throw new Error(`Failed to get documents by compliance status: ${error.message}`);
    }
  }

  /**
   * Get compliance history for an actor
   * @param {string} actorId - Actor ID
   * @returns {Promise<Object>} Actor compliance history
   */
  async getActorComplianceHistory(actorId) {
    try {
      const query = `
        MATCH (actor:Actor {id: $actorId})-[:PERFORMED]->(action:ComplianceAction)
        OPTIONAL MATCH (action)-[:ACTION_ON]->(d:Document)
        RETURN action, d as document
        ORDER BY action.timestamp DESC
      `;

      const result = await graphDatabaseService.runCypherQuery(query, { actorId });

      const actions = result.records.map(r => ({
        action: r.get('action')?.properties,
        document: r.get('document')?.properties
      }));

      return {
        actorId,
        actions,
        totalActions: actions.length
      };
    } catch (error) {
      console.error('Get actor compliance history error:', error);
      throw new Error(`Failed to get actor compliance history: ${error.message}`);
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Validate trail data
   * @private
   */
  _validateTrailData(trailData) {
    if (!trailData.documentId) {
      throw new Error('Document ID is required');
    }
    if (!trailData.action) {
      throw new Error('Action is required');
    }
    if (!trailData.actorId) {
      throw new Error('Actor ID is required');
    }
  }

  /**
   * Convert report to CSV format
   * @private
   */
  _convertToCSV(data) {
    if (!data.statistics) return '';

    const headers = Object.keys(data.statistics);
    const values = Object.values(data.statistics);

    return [headers.join(','), values.join(',')].join('\n');
  }

  /**
   * Convert Neo4j integer to JavaScript number
   * @private
   */
  _toNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && value.low !== undefined) {
      return value.low;
    }
    return value;
  }
}

// Export singleton instance
module.exports = new ComplianceGraphService();
