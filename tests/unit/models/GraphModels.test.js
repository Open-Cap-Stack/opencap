/**
 * Graph Models Test Suite
 * 
 * [Feature] OCAE-403: Graph Database Models Testing
 * Comprehensive test coverage for Neo4j graph models,
 * compliance relationships, and network analysis
 */

const GraphModels = require('../../../models/GraphModels');
const neo4jConnection = require('../../../db/neo4j');
const mongoose = require('mongoose');

// Mock Neo4j connection
jest.mock('../../../db/neo4j', () => ({
  createOrUpdateNode: jest.fn(),
  createRelationship: jest.fn(),
  executeRead: jest.fn(),
  executeWrite: jest.fn(),
  executeTransaction: jest.fn(),
  findNodes: jest.fn(),
  findRelationships: jest.fn(),
  getNeighbors: jest.fn(),
  shortestPath: jest.fn(),
  getNodeDegree: jest.fn(),
  detectCommunities: jest.fn(),
  deleteNode: jest.fn(),
  deleteRelationship: jest.fn(),
  getDatabaseStats: jest.fn(),
  healthCheck: jest.fn()
}));

describe('Graph Models', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock responses
    neo4jConnection.createOrUpdateNode.mockResolvedValue([{ n: { properties: {} } }]);
    neo4jConnection.createRelationship.mockResolvedValue([{ r: { properties: {} } }]);
    neo4jConnection.executeRead.mockResolvedValue([]);
    neo4jConnection.executeWrite.mockResolvedValue([]);
    neo4jConnection.healthCheck.mockResolvedValue({ status: 'healthy' });
  });

  describe('Node Creation', () => {
    describe('createCompany', () => {
      it('should create a company node with proper properties', async () => {
        const companyData = {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Company',
          industry: 'Technology',
          size: 'medium',
          status: 'active',
          createdAt: new Date(),
          additionalProperties: { region: 'North America' }
        };

        const result = await GraphModels.createCompany(companyData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'Company',
          expect.objectContaining({
            id: companyData._id.toString(),
            name: companyData.name,
            industry: companyData.industry,
            size: companyData.size,
            status: companyData.status,
            createdAt: companyData.createdAt,
            region: 'North America'
          })
        );
        expect(result).toBeDefined();
      });

      it('should handle missing optional properties', async () => {
        const companyData = {
          _id: new mongoose.Types.ObjectId(),
          name: 'Minimal Company',
          industry: 'Finance',
          size: 'small',
          status: 'active',
          createdAt: new Date()
        };

        await GraphModels.createCompany(companyData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'Company',
          expect.objectContaining({
            id: companyData._id.toString(),
            name: companyData.name,
            industry: companyData.industry,
            size: companyData.size,
            status: companyData.status,
            createdAt: companyData.createdAt
          })
        );
      });
    });

    describe('createUser', () => {
      it('should create a user node with proper properties', async () => {
        const userData = {
          _id: new mongoose.Types.ObjectId(),
          email: 'test@example.com',
          role: 'admin',
          status: 'active',
          createdAt: new Date(),
          lastLogin: new Date()
        };

        await GraphModels.createUser(userData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'User',
          expect.objectContaining({
            id: userData._id.toString(),
            email: userData.email,
            role: userData.role,
            status: userData.status,
            createdAt: userData.createdAt,
            lastLogin: userData.lastLogin
          })
        );
      });

      it('should handle missing lastLogin', async () => {
        const userData = {
          _id: new mongoose.Types.ObjectId(),
          email: 'test@example.com',
          role: 'user',
          status: 'active',
          createdAt: new Date()
        };

        await GraphModels.createUser(userData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'User',
          expect.objectContaining({
            id: userData._id.toString(),
            email: userData.email,
            role: userData.role,
            status: userData.status,
            createdAt: userData.createdAt,
            lastLogin: undefined
          })
        );
      });
    });

    describe('createDocument', () => {
      it('should create a document node with proper properties', async () => {
        const documentData = {
          _id: new mongoose.Types.ObjectId(),
          title: 'Test Document',
          documentType: 'financial',
          status: 'active',
          confidentialityLevel: 'high',
          createdAt: new Date(),
          companyId: new mongoose.Types.ObjectId(),
          uploadedBy: new mongoose.Types.ObjectId()
        };

        await GraphModels.createDocument(documentData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'Document',
          expect.objectContaining({
            id: documentData._id.toString(),
            title: documentData.title,
            documentType: documentData.documentType,
            status: documentData.status,
            confidentialityLevel: documentData.confidentialityLevel,
            createdAt: documentData.createdAt,
            companyId: documentData.companyId.toString(),
            uploadedBy: documentData.uploadedBy.toString()
          })
        );
      });
    });

    describe('createComplianceEvent', () => {
      it('should create a compliance event node', async () => {
        const complianceData = {
          _id: new mongoose.Types.ObjectId(),
          type: 'audit',
          status: 'completed',
          severity: 'medium',
          description: 'Compliance audit completed',
          createdAt: new Date(),
          companyId: new mongoose.Types.ObjectId(),
          documentId: new mongoose.Types.ObjectId(),
          userId: new mongoose.Types.ObjectId()
        };

        await GraphModels.createComplianceEvent(complianceData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'ComplianceEvent',
          expect.objectContaining({
            id: complianceData._id.toString(),
            type: complianceData.type,
            status: complianceData.status,
            severity: complianceData.severity,
            description: complianceData.description,
            createdAt: complianceData.createdAt,
            companyId: complianceData.companyId.toString(),
            documentId: complianceData.documentId.toString(),
            userId: complianceData.userId.toString()
          })
        );
      });
    });

    describe('createTransaction', () => {
      it('should create a transaction node', async () => {
        const transactionData = {
          _id: new mongoose.Types.ObjectId(),
          type: 'transfer',
          amount: 10000,
          currency: 'USD',
          status: 'completed',
          date: new Date(),
          description: 'Test transaction',
          companyId: new mongoose.Types.ObjectId(),
          fromEntity: new mongoose.Types.ObjectId(),
          toEntity: new mongoose.Types.ObjectId()
        };

        await GraphModels.createTransaction(transactionData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'Transaction',
          expect.objectContaining({
            id: transactionData._id.toString(),
            type: transactionData.type,
            amount: transactionData.amount,
            currency: transactionData.currency,
            status: transactionData.status,
            date: transactionData.date,
            description: transactionData.description,
            companyId: transactionData.companyId.toString(),
            fromEntity: transactionData.fromEntity.toString(),
            toEntity: transactionData.toEntity.toString()
          })
        );
      });
    });

    describe('createSPV', () => {
      it('should create an SPV node', async () => {
        const spvData = {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test SPV',
          type: 'investment',
          status: 'active',
          jurisdiction: 'Delaware',
          createdAt: new Date(),
          parentCompanyId: new mongoose.Types.ObjectId()
        };

        await GraphModels.createSPV(spvData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'SPV',
          expect.objectContaining({
            id: spvData._id.toString(),
            name: spvData.name,
            type: spvData.type,
            status: spvData.status,
            jurisdiction: spvData.jurisdiction,
            createdAt: spvData.createdAt,
            parentCompanyId: spvData.parentCompanyId.toString()
          })
        );
      });
    });

    describe('createStakeholder', () => {
      it('should create a stakeholder node', async () => {
        const stakeholderData = {
          _id: new mongoose.Types.ObjectId(),
          name: 'Test Investor',
          type: 'individual',
          status: 'active',
          investmentAmount: 50000,
          equity: 5.0,
          createdAt: new Date(),
          companyId: new mongoose.Types.ObjectId()
        };

        await GraphModels.createStakeholder(stakeholderData);

        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'Stakeholder',
          expect.objectContaining({
            id: stakeholderData._id.toString(),
            name: stakeholderData.name,
            type: stakeholderData.type,
            status: stakeholderData.status,
            investmentAmount: stakeholderData.investmentAmount,
            equity: stakeholderData.equity,
            createdAt: stakeholderData.createdAt,
            companyId: stakeholderData.companyId.toString()
          })
        );
      });
    });
  });

  describe('Relationship Creation', () => {
    describe('createEmploymentRelationship', () => {
      it('should create employment relationship between user and company', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const companyId = new mongoose.Types.ObjectId().toString();
        const role = 'developer';
        const startDate = new Date();

        await GraphModels.createEmploymentRelationship(userId, companyId, role, startDate);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'User',
          userId,
          'Company',
          companyId,
          'WORKS_FOR',
          expect.objectContaining({
            role,
            startDate,
            endDate: null,
            status: 'active',
            createdAt: expect.any(Date)
          })
        );
      });

      it('should create inactive employment relationship when endDate is provided', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const companyId = new mongoose.Types.ObjectId().toString();
        const role = 'developer';
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2023-12-31');

        await GraphModels.createEmploymentRelationship(userId, companyId, role, startDate, endDate);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'User',
          userId,
          'Company',
          companyId,
          'WORKS_FOR',
          expect.objectContaining({
            role,
            startDate,
            endDate,
            status: 'inactive',
            createdAt: expect.any(Date)
          })
        );
      });
    });

    describe('createDocumentOwnership', () => {
      it('should create document ownership relationship', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const documentId = new mongoose.Types.ObjectId().toString();
        const accessLevel = 'owner';

        await GraphModels.createDocumentOwnership(userId, documentId, accessLevel);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'User',
          userId,
          'Document',
          documentId,
          'OWNS',
          expect.objectContaining({
            accessLevel,
            createdAt: expect.any(Date)
          })
        );
      });
    });

    describe('createDocumentAccess', () => {
      it('should create document access relationship', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const documentId = new mongoose.Types.ObjectId().toString();
        const accessType = 'read';
        const grantedBy = new mongoose.Types.ObjectId().toString();
        const grantedAt = new Date();

        await GraphModels.createDocumentAccess(userId, documentId, accessType, grantedBy, grantedAt);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'User',
          userId,
          'Document',
          documentId,
          'HAS_ACCESS',
          expect.objectContaining({
            accessType,
            grantedBy,
            grantedAt,
            status: 'active'
          })
        );
      });
    });

    describe('createComplianceRelationship', () => {
      it('should create compliance relationship between document and compliance event', async () => {
        const documentId = new mongoose.Types.ObjectId().toString();
        const complianceEventId = new mongoose.Types.ObjectId().toString();
        const complianceType = 'audit';
        const result = 'passed';

        await GraphModels.createComplianceRelationship(documentId, complianceEventId, complianceType, result);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'Document',
          documentId,
          'ComplianceEvent',
          complianceEventId,
          'SUBJECT_TO',
          expect.objectContaining({
            complianceType,
            result,
            checkedAt: expect.any(Date)
          })
        );
      });
    });

    describe('createFinancialFlow', () => {
      it('should create financial flow relationship', async () => {
        const fromEntityId = new mongoose.Types.ObjectId().toString();
        const toEntityId = new mongoose.Types.ObjectId().toString();
        const transactionId = new mongoose.Types.ObjectId().toString();
        const amount = 25000;
        const currency = 'USD';

        await GraphModels.createFinancialFlow(fromEntityId, toEntityId, transactionId, amount, currency);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'Company',
          fromEntityId,
          'Company',
          toEntityId,
          'TRANSFERS_TO',
          expect.objectContaining({
            amount,
            currency,
            transactionId,
            createdAt: expect.any(Date)
          })
        );
      });
    });

    describe('createInvestmentRelationship', () => {
      it('should create investment relationship', async () => {
        const stakeholderId = new mongoose.Types.ObjectId().toString();
        const companyId = new mongoose.Types.ObjectId().toString();
        const amount = 100000;
        const equity = 10.0;
        const investmentDate = new Date();

        await GraphModels.createInvestmentRelationship(stakeholderId, companyId, amount, equity, investmentDate);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'Stakeholder',
          stakeholderId,
          'Company',
          companyId,
          'INVESTS_IN',
          expect.objectContaining({
            amount,
            equity,
            investmentDate,
            status: 'active'
          })
        );
      });
    });

    describe('createSPVOwnership', () => {
      it('should create SPV ownership relationship', async () => {
        const parentCompanyId = new mongoose.Types.ObjectId().toString();
        const spvId = new mongoose.Types.ObjectId().toString();
        const ownershipPercentage = 100;

        await GraphModels.createSPVOwnership(parentCompanyId, spvId, ownershipPercentage);

        expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
          'Company',
          parentCompanyId,
          'SPV',
          spvId,
          'OWNS',
          expect.objectContaining({
            ownershipPercentage,
            createdAt: expect.any(Date)
          })
        );
      });
    });
  });

  describe('Compliance Analysis', () => {
    describe('findComplianceViolations', () => {
      it('should find compliance violations for a company', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const severity = 'high';
        const mockViolations = [
          { d: { id: 'doc1', title: 'Document 1' }, ce: { id: 'ce1', severity: 'high', status: 'failed' } }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockViolations);

        const result = await GraphModels.findComplianceViolations(companyId, severity);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (c:Company {id: $companyId})'),
          { companyId, severity }
        );
        expect(result).toEqual(mockViolations);
      });

      it('should handle empty violations result', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        neo4jConnection.executeRead.mockResolvedValue([]);

        const result = await GraphModels.findComplianceViolations(companyId);

        expect(result).toEqual([]);
      });
    });

    describe('getComplianceTrail', () => {
      it('should get compliance trail for a document', async () => {
        const documentId = new mongoose.Types.ObjectId().toString();
        const mockTrail = [
          { 
            d: { id: documentId, title: 'Test Document' },
            ce: { id: 'ce1', type: 'audit', status: 'passed' },
            u: { id: 'user1', email: 'auditor@example.com' }
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockTrail);

        const result = await GraphModels.getComplianceTrail(documentId);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (d:Document {id: $documentId})'),
          { documentId }
        );
        expect(result).toEqual(mockTrail);
      });
    });

    describe('findDocumentsRequiringReview', () => {
      it('should find documents requiring compliance review', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const daysSinceLastReview = 30;
        const mockDocuments = [
          { d: { id: 'doc1', title: 'Document 1', createdAt: new Date() } },
          { d: { id: 'doc2', title: 'Document 2', createdAt: new Date() } }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockDocuments);

        const result = await GraphModels.findDocumentsRequiringReview(companyId, daysSinceLastReview);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (c:Company {id: $companyId})'),
          { companyId, daysSinceLastReview }
        );
        expect(result).toEqual(mockDocuments);
      });
    });
  });

  describe('Network Analysis', () => {
    describe('findConnectedCompanies', () => {
      it('should find companies connected through stakeholders', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const mockConnectedCompanies = [
          { 
            connected: { id: 'comp1', name: 'Connected Company 1' },
            s: { id: 'stakeholder1', name: 'Shared Investor' }
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockConnectedCompanies);

        const result = await GraphModels.findConnectedCompanies(companyId);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (c:Company {id: $companyId})'),
          { companyId }
        );
        expect(result).toEqual(mockConnectedCompanies);
      });
    });

    describe('analyzeDocumentAccessPatterns', () => {
      it('should analyze document access patterns', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const days = 30;
        const mockAccessPatterns = [
          { 
            d: { id: 'doc1', title: 'Document 1' },
            u: { id: 'user1', email: 'user1@example.com' },
            accessCount: 5
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockAccessPatterns);

        const result = await GraphModels.analyzeDocumentAccessPatterns(companyId, days);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (c:Company {id: $companyId})'),
          { companyId, days }
        );
        expect(result).toEqual(mockAccessPatterns);
      });
    });

    describe('findComplianceRisks', () => {
      it('should find potential compliance risks', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const mockRisks = [
          { 
            d: { id: 'doc1', title: 'Risk Document' },
            u: { id: 'user1', status: 'inactive' },
            riskType: 'unauthorized_access'
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockRisks);

        const result = await GraphModels.findComplianceRisks(companyId);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('MATCH (c:Company {id: $companyId})'),
          { companyId }
        );
        expect(result).toEqual(mockRisks);
      });
    });

    describe('calculateEntityCentrality', () => {
      it('should calculate entity centrality metrics', async () => {
        const entityType = 'User';
        const entityId = new mongoose.Types.ObjectId().toString();
        const mockCentrality = [
          { 
            totalConnections: 10,
            outgoingConnections: 6,
            incomingConnections: 4
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockCentrality);

        const result = await GraphModels.calculateEntityCentrality(entityType, entityId);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining(`MATCH (entity:${entityType} {id: $entityId})`),
          { entityId }
        );
        expect(result).toEqual(mockCentrality);
      });
    });

    describe('findCompliancePath', () => {
      it('should find shortest compliance path between entities', async () => {
        const fromEntityId = new mongoose.Types.ObjectId().toString();
        const toEntityId = new mongoose.Types.ObjectId().toString();
        const maxLength = 5;
        const mockPath = [
          { path: 'compliance-path-data' }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockPath);

        const result = await GraphModels.findCompliancePath(fromEntityId, toEntityId, maxLength);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('shortestPath'),
          { fromEntityId, toEntityId }
        );
        expect(result).toEqual(mockPath);
      });
    });
  });

  describe('Visualization Data', () => {
    describe('getComplianceNetworkVisualization', () => {
      it('should get compliance network visualization data', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const depth = 2;
        const mockVisualization = [
          { 
            nodes: [{ id: 'node1', type: 'Document' }],
            relationships: [['node1', 'SUBJECT_TO', 'node2']]
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockVisualization);

        const result = await GraphModels.getComplianceNetworkVisualization(companyId, depth);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining(`-[*1..${depth}]-`),
          { companyId }
        );
        expect(result).toEqual(mockVisualization);
      });
    });

    describe('getFinancialFlowVisualization', () => {
      it('should get financial flow visualization data', async () => {
        const companyId = new mongoose.Types.ObjectId().toString();
        const timeRange = 365;
        const mockFlowData = [
          { 
            c: { id: companyId, name: 'Main Company' },
            other: { id: 'other1', name: 'Other Company' },
            relationships: [{ type: 'TRANSFERS_TO', amount: 50000 }]
          }
        ];

        neo4jConnection.executeRead.mockResolvedValue(mockFlowData);

        const result = await GraphModels.getFinancialFlowVisualization(companyId, timeRange);

        expect(neo4jConnection.executeRead).toHaveBeenCalledWith(
          expect.stringContaining('-[:TRANSFERS_TO|RECEIVES_FROM]-'),
          { companyId, timeRange }
        );
        expect(result).toEqual(mockFlowData);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('syncFromMongoDB', () => {
      it('should sync MongoDB data to Neo4j', async () => {
        const mongoData = [
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Test Company',
            industry: 'Technology',
            size: 'medium',
            status: 'active',
            createdAt: new Date()
          }
        ];
        const modelType = 'Company';

        const result = await GraphModels.syncFromMongoDB(mongoData, modelType);

        expect(result).toHaveLength(1);
        expect(result[0]).toBeDefined();
        expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledWith(
          'Company',
          expect.objectContaining({
            id: mongoData[0]._id.toString(),
            name: mongoData[0].name,
            industry: mongoData[0].industry
          })
        );
      });

      it('should handle sync errors gracefully', async () => {
        const mongoData = [
          {
            _id: new mongoose.Types.ObjectId(),
            name: 'Test Company'
          }
        ];
        const modelType = 'Company';

        neo4jConnection.createOrUpdateNode.mockRejectedValue(new Error('Neo4j connection failed'));

        const result = await GraphModels.syncFromMongoDB(mongoData, modelType);

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('error');
        expect(result[0].error).toBe('Neo4j connection failed');
      });

      it('should reject unsupported model types', async () => {
        const mongoData = [{ _id: new mongoose.Types.ObjectId() }];
        const modelType = 'UnsupportedModel';

        await expect(GraphModels.syncFromMongoDB(mongoData, modelType))
          .rejects.toThrow('Unsupported model type: UnsupportedModel');
      });
    });

    describe('cleanupOrphanedNodes', () => {
      it('should clean up orphaned nodes', async () => {
        await GraphModels.cleanupOrphanedNodes();

        expect(neo4jConnection.executeWrite).toHaveBeenCalledWith(
          expect.stringContaining('WHERE size((n)--()) = 0')
        );
      });
    });

    describe('getDatabaseStatistics', () => {
      it('should get database statistics', async () => {
        const mockStats = {
          nodeCount: 100,
          relationshipCount: 200,
          labels: ['Company', 'User', 'Document'],
          relationshipTypes: ['WORKS_FOR', 'OWNS', 'HAS_ACCESS']
        };

        neo4jConnection.getDatabaseStats.mockResolvedValue(mockStats);

        const result = await GraphModels.getDatabaseStatistics();

        expect(neo4jConnection.getDatabaseStats).toHaveBeenCalled();
        expect(result).toEqual(mockStats);
      });
    });

    describe('healthCheck', () => {
      it('should perform health check', async () => {
        const mockHealth = { status: 'healthy', connected: true };
        neo4jConnection.healthCheck.mockResolvedValue(mockHealth);

        const result = await GraphModels.healthCheck();

        expect(neo4jConnection.healthCheck).toHaveBeenCalled();
        expect(result).toEqual(mockHealth);
      });

      it('should handle unhealthy status', async () => {
        const mockHealth = { status: 'unhealthy', connected: false, error: 'Connection failed' };
        neo4jConnection.healthCheck.mockResolvedValue(mockHealth);

        const result = await GraphModels.healthCheck();

        expect(result.status).toBe('unhealthy');
        expect(result.connected).toBe(false);
        expect(result.error).toBe('Connection failed');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Neo4j connection errors', async () => {
      const companyData = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Company',
        industry: 'Technology',
        size: 'medium',
        status: 'active',
        createdAt: new Date()
      };

      neo4jConnection.createOrUpdateNode.mockRejectedValue(new Error('Neo4j connection failed'));

      await expect(GraphModels.createCompany(companyData))
        .rejects.toThrow('Neo4j connection failed');
    });

    it('should handle query execution errors', async () => {
      const companyId = new mongoose.Types.ObjectId().toString();
      
      neo4jConnection.executeRead.mockRejectedValue(new Error('Query execution failed'));

      await expect(GraphModels.findComplianceViolations(companyId))
        .rejects.toThrow('Query execution failed');
    });

    it('should handle relationship creation errors', async () => {
      const userId = new mongoose.Types.ObjectId().toString();
      const companyId = new mongoose.Types.ObjectId().toString();
      
      neo4jConnection.createRelationship.mockRejectedValue(new Error('Relationship creation failed'));

      await expect(GraphModels.createEmploymentRelationship(userId, companyId, 'developer', new Date()))
        .rejects.toThrow('Relationship creation failed');
    });
  });

  describe('Integration Tests', () => {
    it('should create complete company graph structure', async () => {
      const companyData = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Integration Test Company',
        industry: 'Technology',
        size: 'medium',
        status: 'active',
        createdAt: new Date()
      };

      const userData = {
        _id: new mongoose.Types.ObjectId(),
        email: 'admin@integration.test',
        role: 'admin',
        status: 'active',
        createdAt: new Date()
      };

      // Create company and user nodes
      await GraphModels.createCompany(companyData);
      await GraphModels.createUser(userData);

      // Create employment relationship
      await GraphModels.createEmploymentRelationship(
        userData._id.toString(),
        companyData._id.toString(),
        'admin',
        new Date()
      );

      // Verify all operations were called
      expect(neo4jConnection.createOrUpdateNode).toHaveBeenCalledTimes(2);
      expect(neo4jConnection.createRelationship).toHaveBeenCalledTimes(1);
    });

    it('should handle complex compliance network creation', async () => {
      const companyId = new mongoose.Types.ObjectId().toString();
      const documentId = new mongoose.Types.ObjectId().toString();
      const complianceEventId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      // Create compliance relationship
      await GraphModels.createComplianceRelationship(
        documentId,
        complianceEventId,
        'audit',
        'passed'
      );

      // Create document access
      await GraphModels.createDocumentAccess(
        userId,
        documentId,
        'read',
        userId,
        new Date()
      );

      expect(neo4jConnection.createRelationship).toHaveBeenCalledTimes(2);
      expect(neo4jConnection.createRelationship).toHaveBeenCalledWith(
        'Document',
        documentId,
        'ComplianceEvent',
        complianceEventId,
        'SUBJECT_TO',
        expect.objectContaining({
          complianceType: 'audit',
          result: 'passed'
        })
      );
    });
  });
});