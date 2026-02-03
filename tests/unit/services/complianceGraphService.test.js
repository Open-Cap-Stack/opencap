/**
 * Compliance Graph Service Test Suite
 *
 * [Feature] Issue #49: Complete Graph Database (Neo4j) Integration
 * Comprehensive test coverage for compliance graph operations including:
 * - Compliance trail tracking
 * - Audit path retrieval
 * - Compliance gap detection
 * - Compliance report generation
 */

const complianceGraphService = require('../../../services/complianceGraphService');
const graphDatabaseService = require('../../../services/graphDatabaseService');

// Mock graph database service
jest.mock('../../../services/graphDatabaseService');

describe('Compliance Graph Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    graphDatabaseService.createNode = jest.fn().mockResolvedValue({
      id: 1,
      labels: ['Document'],
      properties: { id: 'DOC001' }
    });

    graphDatabaseService.createRelationship = jest.fn().mockResolvedValue({
      id: 100,
      type: 'APPROVED_BY',
      properties: {}
    });

    graphDatabaseService.findShortestPath = jest.fn().mockResolvedValue(null);
    graphDatabaseService.getRelatedNodes = jest.fn().mockResolvedValue([]);
    graphDatabaseService.runCypherQuery = jest.fn().mockResolvedValue({ records: [] });
    graphDatabaseService.findNodes = jest.fn().mockResolvedValue([]);
  });

  describe('Compliance Trail Tracking', () => {
    describe('trackComplianceTrail', () => {
      it('should track a document approval in the compliance graph', async () => {
        const trailData = {
          documentId: 'DOC001',
          documentType: 'financial_report',
          action: 'APPROVED',
          actorId: 'USER001',
          actorRole: 'CFO',
          timestamp: new Date('2024-01-15T10:00:00Z'),
          companyId: 'COMP001'
        };

        graphDatabaseService.createNode
          .mockResolvedValueOnce({
            id: 1,
            labels: ['Document', 'ComplianceDocument'],
            properties: { id: 'DOC001', type: 'financial_report' }
          })
          .mockResolvedValueOnce({
            id: 2,
            labels: ['Actor', 'User'],
            properties: { id: 'USER001', role: 'CFO' }
          })
          .mockResolvedValueOnce({
            id: 3,
            labels: ['ComplianceAction'],
            properties: { action: 'APPROVED', timestamp: trailData.timestamp }
          });

        const result = await complianceGraphService.trackComplianceTrail(trailData);

        expect(graphDatabaseService.createNode).toHaveBeenCalled();
        expect(graphDatabaseService.createRelationship).toHaveBeenCalled();
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.trailId).toBeDefined();
      });

      it('should link approval to existing document node', async () => {
        const trailData = {
          documentId: 'DOC001',
          action: 'REVIEWED',
          actorId: 'USER002',
          actorRole: 'Reviewer'
        };

        graphDatabaseService.findNodes.mockResolvedValue([
          { id: 1, labels: ['Document'], properties: { id: 'DOC001' } }
        ]);

        await complianceGraphService.trackComplianceTrail(trailData);

        expect(graphDatabaseService.findNodes).toHaveBeenCalledWith(
          'Document',
          { id: 'DOC001' }
        );
      });

      it('should create proper approval chain relationships', async () => {
        const trailData = {
          documentId: 'DOC001',
          action: 'APPROVED',
          actorId: 'USER001',
          actorRole: 'CFO',
          previousActionId: 'ACTION001'
        };

        await complianceGraphService.trackComplianceTrail(trailData);

        expect(graphDatabaseService.createRelationship).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          'FOLLOWED_BY',
          expect.any(Object)
        );
      });

      it('should throw error for missing required fields', async () => {
        await expect(complianceGraphService.trackComplianceTrail({}))
          .rejects.toThrow('Document ID is required');

        await expect(complianceGraphService.trackComplianceTrail({ documentId: 'DOC001' }))
          .rejects.toThrow('Action is required');
      });

      it('should track compliance status changes', async () => {
        const trailData = {
          documentId: 'DOC001',
          action: 'STATUS_CHANGE',
          actorId: 'SYSTEM',
          fromStatus: 'pending',
          toStatus: 'approved',
          timestamp: new Date()
        };

        const result = await complianceGraphService.trackComplianceTrail(trailData);

        expect(result.statusChange).toBeDefined();
        expect(result.statusChange.from).toBe('pending');
        expect(result.statusChange.to).toBe('approved');
      });

      it('should support different compliance action types', async () => {
        const actions = ['CREATED', 'REVIEWED', 'APPROVED', 'REJECTED', 'ARCHIVED'];

        for (const action of actions) {
          await complianceGraphService.trackComplianceTrail({
            documentId: 'DOC001',
            action,
            actorId: 'USER001'
          });
        }

        expect(graphDatabaseService.createNode).toHaveBeenCalledTimes(actions.length * 3);
      });
    });

    describe('getComplianceTrail', () => {
      it('should retrieve the full compliance trail for a document', async () => {
        const mockTrail = [
          {
            node: { id: 1, labels: ['ComplianceAction'], properties: { action: 'CREATED', timestamp: '2024-01-01' } },
            relationship: { type: 'INITIATED' }
          },
          {
            node: { id: 2, labels: ['ComplianceAction'], properties: { action: 'REVIEWED', timestamp: '2024-01-05' } },
            relationship: { type: 'REVIEWED_BY' }
          },
          {
            node: { id: 3, labels: ['ComplianceAction'], properties: { action: 'APPROVED', timestamp: '2024-01-10' } },
            relationship: { type: 'APPROVED_BY' }
          }
        ];

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: mockTrail.map(item => ({
            get: (key) => {
              if (key === 'action') return item.node;
              if (key === 'rel') return item.relationship;
            },
            toObject: () => item
          }))
        });

        const result = await complianceGraphService.getComplianceTrail('DOC001');

        expect(result).toBeDefined();
        expect(result.documentId).toBe('DOC001');
        expect(result.trail).toHaveLength(3);
        expect(result.trail[0].action).toBe('CREATED');
      });

      it('should return empty trail for document with no compliance history', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({ records: [] });

        const result = await complianceGraphService.getComplianceTrail('DOC999');

        expect(result.trail).toHaveLength(0);
      });

      it('should include actor information in trail', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'action') return { properties: { action: 'APPROVED' } };
              if (key === 'actor') return { properties: { id: 'USER001', name: 'John Doe', role: 'CFO' } };
            }
          }]
        });

        const result = await complianceGraphService.getComplianceTrail('DOC001');

        expect(result.trail[0].actor).toBeDefined();
        expect(result.trail[0].actor.role).toBe('CFO');
      });
    });
  });

  describe('Audit Path', () => {
    describe('getAuditPath', () => {
      it('should retrieve audit path from document to final approval', async () => {
        const mockPath = {
          start: { labels: ['Document'], properties: { id: 'DOC001' } },
          end: { labels: ['ComplianceAction'], properties: { action: 'FINAL_APPROVAL' } },
          segments: [
            {
              start: { labels: ['Document'] },
              relationship: { type: 'REVIEWED_BY' },
              end: { labels: ['ComplianceAction'] }
            },
            {
              start: { labels: ['ComplianceAction'] },
              relationship: { type: 'APPROVED_BY' },
              end: { labels: ['ComplianceAction'] }
            }
          ],
          length: 2
        };

        graphDatabaseService.findShortestPath.mockResolvedValue(mockPath);

        const result = await complianceGraphService.getAuditPath('DOC001');

        expect(result).toBeDefined();
        expect(result.documentId).toBe('DOC001');
        expect(result.path).toBeDefined();
        expect(result.path.length).toBe(2);
      });

      it('should return audit path between two specific points', async () => {
        const mockPath = {
          segments: [{ relationship: { type: 'REVIEWED_BY' } }],
          length: 1
        };

        graphDatabaseService.findShortestPath.mockResolvedValue(mockPath);

        const result = await complianceGraphService.getAuditPath('DOC001', {
          fromAction: 'ACTION001',
          toAction: 'ACTION002'
        });

        expect(graphDatabaseService.findShortestPath).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'ACTION001' }),
          expect.objectContaining({ id: 'ACTION002' }),
          expect.any(Object)
        );
      });

      it('should return null when no audit path exists', async () => {
        graphDatabaseService.findShortestPath.mockResolvedValue(null);

        const result = await complianceGraphService.getAuditPath('DOC001');

        expect(result.path).toBeNull();
        expect(result.complete).toBe(false);
      });

      it('should include timestamps in audit path', async () => {
        const mockPath = {
          segments: [{
            start: { properties: { timestamp: '2024-01-01' } },
            relationship: { type: 'APPROVED_BY', properties: { timestamp: '2024-01-02' } },
            end: { properties: { timestamp: '2024-01-02' } }
          }],
          length: 1
        };

        graphDatabaseService.findShortestPath.mockResolvedValue(mockPath);

        const result = await complianceGraphService.getAuditPath('DOC001');

        expect(result.path.segments).toHaveLength(1);
        expect(result.path.segments[0]).toBeDefined();
      });

      it('should calculate total audit duration', async () => {
        const mockPath = {
          start: { properties: { timestamp: '2024-01-01T00:00:00Z' } },
          end: { properties: { timestamp: '2024-01-05T00:00:00Z' } },
          segments: [],
          length: 3
        };

        graphDatabaseService.findShortestPath.mockResolvedValue(mockPath);

        const result = await complianceGraphService.getAuditPath('DOC001');

        expect(result.duration).toBeDefined();
        expect(result.duration.days).toBe(4);
      });
    });

    describe('getAuditTrailGraph', () => {
      it('should return full audit trail as graph structure', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'nodes') return [{ id: 1 }, { id: 2 }, { id: 3 }];
                if (key === 'relationships') return [{ id: 100 }, { id: 101 }];
              }
            }
          ]
        });

        const result = await complianceGraphService.getAuditTrailGraph('DOC001');

        expect(result.nodes).toBeDefined();
        expect(result.relationships).toBeDefined();
      });
    });
  });

  describe('Compliance Gaps', () => {
    describe('findComplianceGaps', () => {
      it('should identify missing required approvals', async () => {
        const requiredApprovals = ['LEGAL_REVIEW', 'CFO_APPROVAL', 'BOARD_APPROVAL'];

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: () => ({ properties: { action: 'LEGAL_REVIEW' } }) },
            { get: () => ({ properties: { action: 'CFO_APPROVAL' } }) }
          ]
        });

        const result = await complianceGraphService.findComplianceGaps('DOC001', {
          requiredApprovals
        });

        expect(result).toBeDefined();
        expect(result.gaps).toHaveLength(1);
        expect(result.gaps[0].missing).toBe('BOARD_APPROVAL');
      });

      it('should detect broken approval chains', async () => {
        // First query returns existing actions
        graphDatabaseService.runCypherQuery
          .mockResolvedValueOnce({
            records: [
              { get: () => ({ properties: { action: 'ACTION001' } }) },
              { get: () => ({ properties: { action: 'ACTION002' } }) }
            ]
          })
          // Second query returns chain breaks
          .mockResolvedValueOnce({
            records: [{
              get: () => ({ from: 'ACTION001', to: 'ACTION003', missing: 'LINK' })
            }]
          });

        const result = await complianceGraphService.findComplianceGaps('DOC001');

        expect(result.chainBreaks).toBeDefined();
      });

      it('should identify expired approvals', async () => {
        const now = new Date();
        const expiredDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago

        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: () => ({
              properties: {
                action: 'APPROVAL',
                timestamp: expiredDate.toISOString(),
                validUntil: expiredDate.toISOString()
              }
            })
          }]
        });

        const result = await complianceGraphService.findComplianceGaps('DOC001', {
          checkExpiration: true,
          expirationDays: 30
        });

        expect(result.expiredApprovals).toBeDefined();
        expect(result.expiredApprovals).toHaveLength(1);
      });

      it('should check for missing required signatories', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({ records: [] });
        graphDatabaseService.findNodes.mockResolvedValue([]);

        const result = await complianceGraphService.findComplianceGaps('DOC001', {
          requiredSignatories: ['CEO', 'CFO', 'LEGAL'],
          documentType: 'financial_report'
        });

        expect(result.missingSignatories).toBeDefined();
        expect(result.missingSignatories).toHaveLength(3);
      });

      it('should return compliance score', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: () => ({ properties: { action: 'LEGAL_REVIEW' } }) },
            { get: () => ({ properties: { action: 'CFO_APPROVAL' } }) }
          ]
        });

        const result = await complianceGraphService.findComplianceGaps('DOC001', {
          requiredApprovals: ['LEGAL_REVIEW', 'CFO_APPROVAL', 'BOARD_APPROVAL']
        });

        expect(result.complianceScore).toBeDefined();
        expect(result.complianceScore).toBeCloseTo(66.67, 0);
      });

      it('should return empty gaps for fully compliant document', async () => {
        const requiredApprovals = ['LEGAL_REVIEW', 'CFO_APPROVAL'];

        // Mock both required query calls
        graphDatabaseService.runCypherQuery
          .mockResolvedValueOnce({
            records: [
              { get: () => ({ properties: { action: 'LEGAL_REVIEW' } }) },
              { get: () => ({ properties: { action: 'CFO_APPROVAL' } }) }
            ]
          });

        const result = await complianceGraphService.findComplianceGaps('DOC001', {
          requiredApprovals
        });

        expect(result.gaps).toHaveLength(0);
        expect(result.complianceScore).toBe(100);
      });

      it('should identify orphaned compliance actions', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: () => [{ id: 'ACTION999', properties: { action: 'UNKNOWN_ACTION' } }]
          }]
        });

        const result = await complianceGraphService.findComplianceGaps('DOC001', {
          checkOrphans: true
        });

        expect(result.orphanedActions).toBeDefined();
      });
    });

    describe('findCompanyComplianceGaps', () => {
      it('should find compliance gaps across all company documents', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: () => ({ documentId: 'DOC001', gaps: 1 }) },
            { get: () => ({ documentId: 'DOC002', gaps: 2 }) }
          ]
        });

        const result = await complianceGraphService.findCompanyComplianceGaps('COMP001');

        expect(result.companyId).toBe('COMP001');
        expect(result.documentsWithGaps).toBeDefined();
      });
    });
  });

  describe('Compliance Report Generation', () => {
    describe('generateComplianceReport', () => {
      it('should generate comprehensive compliance report', async () => {
        graphDatabaseService.runCypherQuery
          .mockResolvedValueOnce({
            records: [{ get: () => 10 }]
          })
          .mockResolvedValueOnce({
            records: [{ get: () => 8 }]
          })
          .mockResolvedValueOnce({
            records: [
              { get: () => ({ action: 'APPROVED', count: 15 }) },
              { get: () => ({ action: 'REJECTED', count: 2 }) }
            ]
          });

        const result = await complianceGraphService.generateComplianceReport('COMP001', {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        });

        expect(result).toBeDefined();
        expect(result.companyId).toBe('COMP001');
        expect(result.summary).toBeDefined();
        expect(result.generatedAt).toBeDefined();
      });

      it('should include document compliance statistics', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              switch (key) {
                case 'total': return 100;
                case 'compliant': return 85;
                case 'pending': return 10;
                case 'rejected': return 5;
              }
            }
          }]
        });

        const result = await complianceGraphService.generateComplianceReport('COMP001');

        expect(result.statistics).toBeDefined();
        expect(result.statistics.totalDocuments).toBe(100);
        expect(result.statistics.compliantDocuments).toBe(85);
        expect(result.statistics.complianceRate).toBe(85);
      });

      it('should include actor activity breakdown', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'actorId') return 'USER001';
                if (key === 'actions') return 15;
                if (key === 'approvals') return 12;
              }
            },
            {
              get: (key) => {
                if (key === 'actorId') return 'USER002';
                if (key === 'actions') return 10;
                if (key === 'approvals') return 8;
              }
            }
          ]
        });

        const result = await complianceGraphService.generateComplianceReport('COMP001');

        expect(result.actorActivity).toBeDefined();
        expect(result.actorActivity).toHaveLength(2);
      });

      it('should include compliance timeline', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: (key) => key === 'month' ? '2024-01' : 15 },
            { get: (key) => key === 'month' ? '2024-02' : 20 }
          ]
        });

        const result = await complianceGraphService.generateComplianceReport('COMP001', {
          includeTimeline: true
        });

        expect(result.timeline).toBeDefined();
      });

      it('should include risk assessment', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'overdueCount') return 5;
              if (key === 'expiringSoon') return 3;
              if (key === 'pendingCritical') return 2;
            }
          }]
        });

        const result = await complianceGraphService.generateComplianceReport('COMP001', {
          includeRiskAssessment: true
        });

        expect(result.riskAssessment).toBeDefined();
        expect(result.riskAssessment.riskLevel).toBeDefined();
      });

      it('should filter report by document type', async () => {
        await complianceGraphService.generateComplianceReport('COMP001', {
          documentType: 'financial_report'
        });

        expect(graphDatabaseService.runCypherQuery).toHaveBeenCalledWith(
          expect.stringContaining('financial_report'),
          expect.any(Object)
        );
      });

      it('should include approval chain analysis', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'avgApprovalTime') return 3.5;
              if (key === 'maxApprovalTime') return 10;
              if (key === 'minApprovalTime') return 1;
            }
          }]
        });

        const result = await complianceGraphService.generateComplianceReport('COMP001', {
          includeApprovalAnalysis: true
        });

        expect(result.approvalAnalysis).toBeDefined();
        expect(result.approvalAnalysis.averageApprovalTime).toBe(3.5);
      });
    });

    describe('generateDocumentComplianceReport', () => {
      it('should generate report for specific document', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: (key) => {
              if (key === 'document') return { properties: { id: 'DOC001', type: 'contract' } };
              if (key === 'complianceStatus') return 'compliant';
              if (key === 'approvalCount') return 3;
            }
          }]
        });

        const result = await complianceGraphService.generateDocumentComplianceReport('DOC001');

        expect(result.documentId).toBe('DOC001');
        expect(result.complianceStatus).toBe('compliant');
      });
    });

    describe('exportComplianceReport', () => {
      it('should export report in specified format', async () => {
        const reportData = {
          companyId: 'COMP001',
          summary: { totalDocuments: 100 }
        };

        const result = await complianceGraphService.exportComplianceReport(reportData, 'json');

        expect(result).toBeDefined();
        expect(result.format).toBe('json');
        expect(result.data).toBeDefined();
      });

      it('should support CSV export format', async () => {
        const reportData = {
          companyId: 'COMP001',
          statistics: { totalDocuments: 100 }
        };

        const result = await complianceGraphService.exportComplianceReport(reportData, 'csv');

        expect(result.format).toBe('csv');
      });
    });
  });

  describe('Compliance Workflow', () => {
    describe('initiateComplianceWorkflow', () => {
      it('should create a new compliance workflow in the graph', async () => {
        const workflowData = {
          documentId: 'DOC001',
          workflowType: 'standard_approval',
          requiredSteps: ['REVIEW', 'APPROVAL', 'SIGN_OFF'],
          deadline: new Date('2024-03-01')
        };

        graphDatabaseService.createNode.mockResolvedValue({
          id: 1,
          labels: ['ComplianceWorkflow'],
          properties: workflowData
        });

        const result = await complianceGraphService.initiateComplianceWorkflow(workflowData);

        expect(result.workflowId).toBeDefined();
        expect(result.status).toBe('initiated');
      });
    });

    describe('completeWorkflowStep', () => {
      it('should mark a workflow step as complete', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [{
            get: () => ({ properties: { step: 'REVIEW', status: 'completed' } })
          }]
        });

        const result = await complianceGraphService.completeWorkflowStep(
          'WORKFLOW001',
          'REVIEW',
          { actorId: 'USER001', completedAt: new Date() }
        );

        expect(result.stepCompleted).toBe('REVIEW');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Compliance Queries', () => {
    describe('getDocumentsByComplianceStatus', () => {
      it('should retrieve documents by compliance status', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            { get: () => ({ properties: { id: 'DOC001' } }) },
            { get: () => ({ properties: { id: 'DOC002' } }) }
          ]
        });

        const result = await complianceGraphService.getDocumentsByComplianceStatus(
          'COMP001',
          'pending'
        );

        expect(result).toHaveLength(2);
      });
    });

    describe('getActorComplianceHistory', () => {
      it('should retrieve compliance history for an actor', async () => {
        graphDatabaseService.runCypherQuery.mockResolvedValue({
          records: [
            {
              get: (key) => {
                if (key === 'action') return { properties: { action: 'APPROVED' } };
                if (key === 'document') return { properties: { id: 'DOC001' } };
              }
            }
          ]
        });

        const result = await complianceGraphService.getActorComplianceHistory('USER001');

        expect(result.actorId).toBe('USER001');
        expect(result.actions).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle graph database errors gracefully', async () => {
      graphDatabaseService.runCypherQuery.mockRejectedValue(new Error('Database error'));

      await expect(complianceGraphService.getComplianceTrail('DOC001'))
        .rejects.toThrow('Failed to retrieve compliance trail');
    });

    it('should handle missing document in trail tracking', async () => {
      graphDatabaseService.findNodes.mockResolvedValue([]);
      graphDatabaseService.createNode.mockRejectedValue(new Error('Node creation failed'));

      await expect(complianceGraphService.trackComplianceTrail({
        documentId: 'NONEXISTENT',
        action: 'APPROVED',
        actorId: 'USER001'
      })).rejects.toThrow();
    });

    it('should validate report date ranges', async () => {
      await expect(complianceGraphService.generateComplianceReport('COMP001', {
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      })).rejects.toThrow('Start date must be before end date');
    });
  });
});
