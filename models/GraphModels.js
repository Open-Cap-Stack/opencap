/**
 * Graph Models for Neo4j Database
 * 
 * [Feature] OCAE-403: Graph Database Models
 * Defines graph database models for compliance relationships,
 * network analysis, and relationship mapping
 */

const neo4jConnection = require('../db/neo4j');

class GraphModels {
  constructor() {
    this.neo4j = neo4jConnection;
  }

  /**
   * Company Graph Model
   * Represents companies and their relationships
   */
  async createCompany(companyData) {
    const properties = {
      id: companyData._id.toString(),
      name: companyData.name,
      industry: companyData.industry,
      size: companyData.size,
      status: companyData.status,
      createdAt: companyData.createdAt,
      ...companyData.additionalProperties
    };

    return await this.neo4j.createOrUpdateNode('Company', properties);
  }

  /**
   * User Graph Model
   * Represents users and their roles
   */
  async createUser(userData) {
    const properties = {
      id: userData._id.toString(),
      email: userData.email,
      role: userData.role,
      status: userData.status,
      createdAt: userData.createdAt,
      lastLogin: userData.lastLogin
    };

    return await this.neo4j.createOrUpdateNode('User', properties);
  }

  /**
   * Document Graph Model
   * Represents documents and their relationships
   */
  async createDocument(documentData) {
    const properties = {
      id: documentData._id.toString(),
      title: documentData.title,
      documentType: documentData.documentType,
      status: documentData.status,
      confidentialityLevel: documentData.confidentialityLevel,
      createdAt: documentData.createdAt,
      companyId: documentData.companyId.toString(),
      uploadedBy: documentData.uploadedBy.toString()
    };

    return await this.neo4j.createOrUpdateNode('Document', properties);
  }

  /**
   * Compliance Event Graph Model
   * Represents compliance events and checks
   */
  async createComplianceEvent(complianceData) {
    const properties = {
      id: complianceData._id.toString(),
      type: complianceData.type,
      status: complianceData.status,
      severity: complianceData.severity,
      description: complianceData.description,
      createdAt: complianceData.createdAt,
      companyId: complianceData.companyId.toString(),
      documentId: complianceData.documentId?.toString(),
      userId: complianceData.userId?.toString()
    };

    return await this.neo4j.createOrUpdateNode('ComplianceEvent', properties);
  }

  /**
   * Financial Transaction Graph Model
   * Represents financial transactions and flows
   */
  async createTransaction(transactionData) {
    const properties = {
      id: transactionData._id.toString(),
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency,
      status: transactionData.status,
      date: transactionData.date,
      description: transactionData.description,
      companyId: transactionData.companyId.toString(),
      fromEntity: transactionData.fromEntity?.toString(),
      toEntity: transactionData.toEntity?.toString()
    };

    return await this.neo4j.createOrUpdateNode('Transaction', properties);
  }

  /**
   * SPV Graph Model
   * Represents Special Purpose Vehicles
   */
  async createSPV(spvData) {
    const properties = {
      id: spvData._id.toString(),
      name: spvData.name,
      type: spvData.type,
      status: spvData.status,
      jurisdiction: spvData.jurisdiction,
      createdAt: spvData.createdAt,
      parentCompanyId: spvData.parentCompanyId.toString()
    };

    return await this.neo4j.createOrUpdateNode('SPV', properties);
  }

  /**
   * Stakeholder Graph Model
   * Represents stakeholders and investors
   */
  async createStakeholder(stakeholderData) {
    const properties = {
      id: stakeholderData._id.toString(),
      name: stakeholderData.name,
      type: stakeholderData.type,
      status: stakeholderData.status,
      investmentAmount: stakeholderData.investmentAmount,
      equity: stakeholderData.equity,
      createdAt: stakeholderData.createdAt,
      companyId: stakeholderData.companyId.toString()
    };

    return await this.neo4j.createOrUpdateNode('Stakeholder', properties);
  }

  /**
   * Relationship Creation Methods
   */

  /**
   * Create employment relationship
   */
  async createEmploymentRelationship(userId, companyId, role, startDate, endDate = null) {
    const properties = {
      role,
      startDate,
      endDate,
      status: endDate ? 'inactive' : 'active',
      createdAt: new Date()
    };

    return await this.neo4j.createRelationship(
      'User', userId, 'Company', companyId, 'WORKS_FOR', properties
    );
  }

  /**
   * Create document ownership relationship
   */
  async createDocumentOwnership(userId, documentId, accessLevel = 'owner') {
    const properties = {
      accessLevel,
      createdAt: new Date()
    };

    return await this.neo4j.createRelationship(
      'User', userId, 'Document', documentId, 'OWNS', properties
    );
  }

  /**
   * Create document access relationship
   */
  async createDocumentAccess(userId, documentId, accessType, grantedBy, grantedAt) {
    const properties = {
      accessType,
      grantedBy,
      grantedAt,
      status: 'active'
    };

    return await this.neo4j.createRelationship(
      'User', userId, 'Document', documentId, 'HAS_ACCESS', properties
    );
  }

  /**
   * Create compliance relationship
   */
  async createComplianceRelationship(documentId, complianceEventId, complianceType, result) {
    const properties = {
      complianceType,
      result,
      checkedAt: new Date()
    };

    return await this.neo4j.createRelationship(
      'Document', documentId, 'ComplianceEvent', complianceEventId, 'SUBJECT_TO', properties
    );
  }

  /**
   * Create financial flow relationship
   */
  async createFinancialFlow(fromEntityId, toEntityId, transactionId, amount, currency) {
    const properties = {
      amount,
      currency,
      transactionId,
      createdAt: new Date()
    };

    return await this.neo4j.createRelationship(
      'Company', fromEntityId, 'Company', toEntityId, 'TRANSFERS_TO', properties
    );
  }

  /**
   * Create investment relationship
   */
  async createInvestmentRelationship(stakeholderId, companyId, amount, equity, investmentDate) {
    const properties = {
      amount,
      equity,
      investmentDate,
      status: 'active'
    };

    return await this.neo4j.createRelationship(
      'Stakeholder', stakeholderId, 'Company', companyId, 'INVESTS_IN', properties
    );
  }

  /**
   * Create SPV ownership relationship
   */
  async createSPVOwnership(parentCompanyId, spvId, ownershipPercentage) {
    const properties = {
      ownershipPercentage,
      createdAt: new Date()
    };

    return await this.neo4j.createRelationship(
      'Company', parentCompanyId, 'SPV', spvId, 'OWNS', properties
    );
  }

  /**
   * Compliance Analysis Methods
   */

  /**
   * Find compliance violations
   */
  async findComplianceViolations(companyId, severity = 'high') {
    const query = `
      MATCH (c:Company {id: $companyId})-[:OWNS|MANAGES]->(d:Document)
      -[:SUBJECT_TO]->(ce:ComplianceEvent)
      WHERE ce.severity = $severity AND ce.status = 'failed'
      RETURN d, ce
      ORDER BY ce.createdAt DESC
    `;

    const parameters = { companyId, severity };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Get compliance trail for a document
   */
  async getComplianceTrail(documentId) {
    const query = `
      MATCH (d:Document {id: $documentId})
      -[:SUBJECT_TO]->(ce:ComplianceEvent)
      <-[:PERFORMED_BY]-(u:User)
      RETURN d, ce, u
      ORDER BY ce.createdAt DESC
    `;

    const parameters = { documentId };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Find documents requiring compliance review
   */
  async findDocumentsRequiringReview(companyId, daysSinceLastReview = 30) {
    const query = `
      MATCH (c:Company {id: $companyId})-[:OWNS|MANAGES]->(d:Document)
      WHERE NOT (d)-[:SUBJECT_TO]->(:ComplianceEvent {type: 'review'})
      OR datetime() - datetime(d.lastReviewDate) > duration({days: $daysSinceLastReview})
      RETURN d
      ORDER BY d.createdAt ASC
    `;

    const parameters = { companyId, daysSinceLastReview };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Network Analysis Methods
   */

  /**
   * Find connected companies through stakeholders
   */
  async findConnectedCompanies(companyId, maxDegrees = 2) {
    const query = `
      MATCH (c:Company {id: $companyId})
      -[:RECEIVES_INVESTMENT_FROM]->(s:Stakeholder)
      -[:INVESTS_IN]->(connected:Company)
      WHERE connected.id <> $companyId
      RETURN connected, s
      LIMIT 50
    `;

    const parameters = { companyId };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Analyze document access patterns
   */
  async analyzeDocumentAccessPatterns(companyId, days = 30) {
    const query = `
      MATCH (c:Company {id: $companyId})-[:OWNS|MANAGES]->(d:Document)
      <-[:HAS_ACCESS]-(u:User)
      WHERE datetime() - datetime(d.lastAccessDate) <= duration({days: $days})
      RETURN d, u, count(*) as accessCount
      ORDER BY accessCount DESC
    `;

    const parameters = { companyId, days };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Find potential compliance risks through relationships
   */
  async findComplianceRisks(companyId) {
    const query = `
      MATCH (c:Company {id: $companyId})
      -[:OWNS|MANAGES]->(d:Document)
      -[:HAS_ACCESS]<-(u:User)
      WHERE u.status = 'inactive' OR u.role = 'external'
      RETURN d, u, 'unauthorized_access' as riskType
      
      UNION
      
      MATCH (c:Company {id: $companyId})
      -[:OWNS|MANAGES]->(d:Document)
      WHERE d.confidentialityLevel = 'high' 
      AND size((d)<-[:HAS_ACCESS]-()) > 10
      RETURN d, null as u, 'over_shared' as riskType
    `;

    const parameters = { companyId };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Calculate entity centrality (influence measure)
   */
  async calculateEntityCentrality(entityType, entityId) {
    const query = `
      MATCH (entity:${entityType} {id: $entityId})
      RETURN 
        size((entity)--()) as totalConnections,
        size((entity)-->()) as outgoingConnections,
        size((entity)<--()) as incomingConnections
    `;

    const parameters = { entityId };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Find shortest compliance path between entities
   */
  async findCompliancePath(fromEntityId, toEntityId, maxLength = 5) {
    const query = `
      MATCH (from {id: $fromEntityId}), (to {id: $toEntityId})
      MATCH path = shortestPath((from)-[*1..${maxLength}]-(to))
      WHERE ALL(r in relationships(path) WHERE type(r) IN ['SUBJECT_TO', 'OWNS', 'MANAGES', 'HAS_ACCESS'])
      RETURN path
    `;

    const parameters = { fromEntityId, toEntityId };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Visualization Data Methods
   */

  /**
   * Get compliance network visualization data
   */
  async getComplianceNetworkVisualization(companyId, depth = 2) {
    const query = `
      MATCH (c:Company {id: $companyId})
      -[*1..${depth}]-(connected)
      WHERE labels(connected)[0] IN ['Document', 'ComplianceEvent', 'User']
      RETURN collect(DISTINCT connected) as nodes, 
             collect(DISTINCT [startNode(r), type(r), endNode(r)]) as relationships
    `;

    const parameters = { companyId };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Get financial flow visualization data
   */
  async getFinancialFlowVisualization(companyId, timeRange = 365) {
    const query = `
      MATCH (c:Company {id: $companyId})
      -[:TRANSFERS_TO|RECEIVES_FROM]-(other:Company)
      WHERE datetime() - datetime(other.createdAt) <= duration({days: $timeRange})
      RETURN c, other, collect(r) as relationships
    `;

    const parameters = { companyId, timeRange };
    return await this.neo4j.executeRead(query, parameters);
  }

  /**
   * Utility Methods
   */

  /**
   * Sync MongoDB data to Neo4j
   */
  async syncFromMongoDB(mongoData, modelType) {
    const syncMethods = {
      'Company': this.createCompany.bind(this),
      'User': this.createUser.bind(this),
      'Document': this.createDocument.bind(this),
      'ComplianceEvent': this.createComplianceEvent.bind(this),
      'Transaction': this.createTransaction.bind(this),
      'SPV': this.createSPV.bind(this),
      'Stakeholder': this.createStakeholder.bind(this)
    };

    const syncMethod = syncMethods[modelType];
    if (!syncMethod) {
      throw new Error(`Unsupported model type: ${modelType}`);
    }

    const results = [];
    for (const data of mongoData) {
      try {
        const result = await syncMethod(data);
        results.push(result);
      } catch (error) {
        console.error(`Failed to sync ${modelType}:`, error);
        results.push({ error: error.message, data: data._id });
      }
    }

    return results;
  }

  /**
   * Clean up orphaned nodes
   */
  async cleanupOrphanedNodes() {
    const query = `
      MATCH (n)
      WHERE size((n)--()) = 0
      DELETE n
    `;

    return await this.neo4j.executeWrite(query);
  }

  /**
   * Get database statistics
   */
  async getDatabaseStatistics() {
    return await this.neo4j.getDatabaseStats();
  }

  /**
   * Health check
   */
  async healthCheck() {
    return await this.neo4j.healthCheck();
  }
}

module.exports = new GraphModels();