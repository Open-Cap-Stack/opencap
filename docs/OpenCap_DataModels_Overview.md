# OpenCap Data Infrastructure
# Data Models Specification

**Version**: 1.0  
**Date**: March 15, 2025  
**Author**: Senior Development Team  
**Status**: Draft - For CTO Review  

## Table of Contents

1. [Introduction](#introduction)
2. [Data Model Architecture](#data-model-architecture)
3. [PostgreSQL Relational Models](#postgresql-relational-models)
4. [MongoDB Document Models](#mongodb-document-models)
5. [Neo4j Graph Models](#neo4j-graph-models)
6. [MinIO Object Storage](#minio-object-storage)
7. [AI Flow Pipeline Models](#ai-flow-pipeline-models)
8. [Data Processing Models](#data-processing-models)

## Introduction

This document defines the data models required for the OpenCap Data Infrastructure implementation as outlined in the PRD and Sprint Plan. The models are designed to support advanced AI capabilities, relationship analytics, and compliance requirements for banking and financial services.

The data models follow established best practices:
- Clear separation of concerns across different database technologies
- Well-defined relationships between entities
- Appropriate indexing strategies
- Compliance with security and audit requirements
- Support for versioning and historical tracking

## Data Model Architecture

The OpenCap data infrastructure uses a polyglot persistence approach with multiple specialized databases:

![Data Model Architecture](https://placeholder-for-architecture-diagram.com)

1. **PostgreSQL**: Structured transactional data with strong consistency requirements
2. **MongoDB**: Semi-structured document data with flexible schema requirements
3. **Neo4j**: Relationship-focused data for graph analytics and network modeling
4. **MinIO**: Object storage for documents, binary data, and large datasets
5. **Redis**: Caching layer for performance optimization

Each database technology is selected based on its strengths for specific data access patterns. This document specifies how data is modeled in each system and how synchronization occurs between systems.

## PostgreSQL Relational Models

PostgreSQL handles structured transactional data where consistency, relationships, and ACID compliance are critical.

### User Model

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### Authentication Model

```sql
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    device_info JSONB,
    ip_address VARCHAR(50),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
```

### Organization Model

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_users_org_id ON organization_users(organization_id);
CREATE INDEX idx_organization_users_user_id ON organization_users(user_id);
```

### Transaction Model

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source_id UUID,
    destination_id UUID,
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_source_id ON transactions(source_id);
CREATE INDEX idx_transactions_destination_id ON transactions(destination_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

### Feature Store Models

```sql
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    data_type VARCHAR(50) NOT NULL,
    feature_group VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB
);

CREATE TABLE feature_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES features(id),
    entity_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    value_numeric DOUBLE PRECISION,
    value_text TEXT,
    value_boolean BOOLEAN,
    value_timestamp TIMESTAMP WITH TIME ZONE,
    value_json JSONB,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feature_values_feature_id ON feature_values(feature_id);
CREATE INDEX idx_feature_values_entity ON feature_values(entity_type, entity_id);
CREATE INDEX idx_feature_values_valid_time ON feature_values(valid_from, valid_to);
```

### Audit Log Model

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
```

## MongoDB Document Models

MongoDB handles flexible schema data where rapid iteration, complex nested structures, and document-oriented access patterns are needed.

### Document Model

```javascript
const DocumentSchema = new Schema({
  documentId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['contract', 'statement', 'report', 'form', 'other'],
    index: true
  },
  content: {
    type: String
  },
  metadata: {
    author: String,
    createdDate: Date,
    modifiedDate: Date,
    version: Number,
    status: {
      type: String,
      enum: ['draft', 'review', 'approved', 'published', 'archived'],
      default: 'draft'
    },
    tags: [String],
    customFields: Schema.Types.Mixed
  },
  ownerId: {
    type: String,
    required: true,
    index: true
  },
  accessControl: {
    visibility: {
      type: String,
      enum: ['private', 'shared', 'public'],
      default: 'private'
    },
    accessList: [{
      userId: String,
      accessLevel: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read'
      },
      grantedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  storage: {
    objectId: String, // Reference to MinIO object
    bucket: String,
    size: Number,
    mimeType: String,
    checksum: String
  },
  relationships: [{
    documentId: String,
    relationshipType: {
      type: String,
      enum: ['references', 'supersedes', 'includes', 'attachmentTo', 'other']
    },
    metadata: Schema.Types.Mixed
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  strict: false
});

// Indexes
DocumentSchema.index({ 'metadata.tags': 1 });
DocumentSchema.index({ 'metadata.customFields.fieldName': 1 });
DocumentSchema.index({ 'storage.objectId': 1 });
DocumentSchema.index({ 'relationships.documentId': 1 });
DocumentSchema.index({ createdAt: 1 });
DocumentSchema.index({ updatedAt: 1 });
```

### Document Embedding Model

```javascript
const DocumentEmbeddingSchema = new Schema({
  embeddingId: {
    type: String,
    required: true,
    unique: true
  },
  documentId: {
    type: String,
    required: true,
    index: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  embeddingType: {
    type: String,
    required: true,
    enum: ['document', 'paragraph', 'sentence', 'custom'],
    index: true
  },
  embeddingModel: {
    type: String,
    required: true
  },
  embeddingVersion: {
    type: String,
    required: true
  },
  metadata: {
    textFragment: String,
    position: Number,
    confidence: Number,
    customFields: Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
DocumentEmbeddingSchema.index({ 'embeddingType': 1, 'embeddingModel': 1 });
DocumentEmbeddingSchema.index({ 'metadata.position': 1 });
```

### AI Model Registry

```javascript
const ModelSchema = new Schema({
  modelId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['embedding', 'classification', 'generation', 'regression', 'other'],
    index: true
  },
  framework: {
    type: String,
    required: true,
    enum: ['tensorflow', 'pytorch', 'scikit-learn', 'huggingface', 'custom'],
    index: true
  },
  artifacts: {
    mainArtifact: {
      objectId: String, // Reference to MinIO object
      bucket: String,
      path: String,
      size: Number,
      checksum: String
    },
    additionalArtifacts: [{
      name: String,
      objectId: String,
      bucket: String,
      path: String,
      size: Number,
      checksum: String
    }]
  },
  metrics: {
    trainingMetrics: {
      accuracy: Number,
      loss: Number,
      f1: Number,
      precision: Number,
      recall: Number,
      customMetrics: Schema.Types.Mixed
    },
    validationMetrics: {
      accuracy: Number,
      loss: Number,
      f1: Number,
      precision: Number,
      recall: Number,
      customMetrics: Schema.Types.Mixed
    },
    inferenceMetrics: {
      latency: Number,
      throughput: Number,
      customMetrics: Schema.Types.Mixed
    }
  },
  parameters: {
    hyperparameters: Schema.Types.Mixed,
    architecture: Schema.Types.Mixed
  },
  training: {
    datasetId: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    environment: Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['in_development', 'training', 'evaluation', 'production', 'deprecated', 'archived'],
    default: 'in_development',
    index: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
ModelSchema.index({ 'name': 1, 'version': 1 }, { unique: true });
ModelSchema.index({ 'status': 1, 'type': 1 });
ModelSchema.index({ 'framework': 1 });
ModelSchema.index({ 'createdAt': 1 });
```

## Neo4j Graph Models

Neo4j handles relationship-focused data where connections between entities, network analysis, and path finding are primary use cases.

### Node Labels and Properties

#### Person Node
```cypher
CREATE (p:Person {
  id: 'person-uuid',
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'client',
  status: 'active',
  createdAt: datetime(),
  metadata: '{customField1: "value1", customField2: "value2"}'
})
```

#### Organization Node
```cypher
CREATE (o:Organization {
  id: 'org-uuid',
  name: 'ACME Corporation',
  type: 'client',
  industry: 'finance',
  status: 'active',
  createdAt: datetime(),
  metadata: '{size: "enterprise", region: "north_america"}'
})
```

#### Document Node
```cypher
CREATE (d:Document {
  id: 'doc-uuid',
  title: 'Loan Agreement',
  documentType: 'contract',
  status: 'approved',
  createdAt: datetime(),
  updatedAt: datetime(),
  version: 2,
  contentHash: 'sha256-hash',
  objectId: 'minio-object-id',
  metadata: '{sensitivity: "high", retention: "7_years"}'
})
```

#### Transaction Node
```cypher
CREATE (t:Transaction {
  id: 'transaction-uuid',
  type: 'payment',
  amount: 5000.00,
  currency: 'USD',
  status: 'completed',
  timestamp: datetime(),
  reference: 'REF123456',
  metadata: '{channel: "web", authCode: "AUTH789"}'
})
```

#### ComplianceRule Node
```cypher
CREATE (c:ComplianceRule {
  id: 'rule-uuid',
  name: 'KYC Verification',
  category: 'identity_verification',
  jurisdiction: 'US',
  effectiveDate: date('2024-01-01'),
  expirationDate: date('2025-12-31'),
  severity: 'high',
  description: 'Customer identity must be verified using two forms of government ID',
  metadata: '{regulatoryReference: "31 CFR 1020.220"}'
})
```

### Relationship Types and Properties

#### OWNS Relationship
```cypher
CREATE (p:Person {id: 'person-uuid'})-[:OWNS {
  since: datetime(),
  accessLevel: 'owner',
  metadata: '{transferrable: true}'
}]->(d:Document {id: 'doc-uuid'})
```

#### MEMBER_OF Relationship
```cypher
CREATE (p:Person {id: 'person-uuid'})-[:MEMBER_OF {
  role: 'director',
  since: datetime(),
  status: 'active',
  metadata: '{department: "finance"}'
}]->(o:Organization {id: 'org-uuid'})
```

#### EXECUTED Relationship
```cypher
CREATE (p:Person {id: 'person-uuid'})-[:EXECUTED {
  timestamp: datetime(),
  location: 'New York',
  deviceId: 'device-uuid',
  ipAddress: '192.168.1.1',
  metadata: '{userAgent: "Chrome/92.0.4515.131"}'
}]->(t:Transaction {id: 'transaction-uuid'})
```

#### REFERENCED_IN Relationship
```cypher
CREATE (d1:Document {id: 'doc1-uuid'})-[:REFERENCED_IN {
  context: 'supporting_document',
  page: 5,
  paragraph: 3,
  timestamp: datetime(),
  metadata: '{citationType: "footnote"}'
}]->(d2:Document {id: 'doc2-uuid'})
```

#### COMPLIES_WITH Relationship
```cypher
CREATE (d:Document {id: 'doc-uuid'})-[:COMPLIES_WITH {
  verifiedAt: datetime(),
  verifiedBy: 'person-uuid',
  status: 'compliant',
  evidence: 'evidence-uuid',
  metadata: '{automatedCheck: true, confidence: 0.95}'
}]->(c:ComplianceRule {id: 'rule-uuid'})
```

### Graph Constraints and Indexes

```cypher
// Unique constraints
CREATE CONSTRAINT person_id_unique FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT organization_id_unique FOR (o:Organization) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT document_id_unique FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT transaction_id_unique FOR (t:Transaction) REQUIRE t.id IS UNIQUE;
CREATE CONSTRAINT compliance_rule_id_unique FOR (c:ComplianceRule) REQUIRE c.id IS UNIQUE;

// Indexes for performance
CREATE INDEX person_email_index FOR (p:Person) ON (p.email);
CREATE INDEX document_type_index FOR (d:Document) ON (d.documentType);
CREATE INDEX transaction_status_index FOR (t:Transaction) ON (t.status);
CREATE INDEX document_status_index FOR (d:Document) ON (d.status);
```

## Remaining Models

For the complete set of data models including MinIO Object Storage, AI Flow Pipeline Models, and Data Processing Models, please refer to the additional data model specification documents:

- [OpenCap_DataModels_ObjectStorage.md](./OpenCap_DataModels_ObjectStorage.md)
- [OpenCap_DataModels_AIFlow.md](./OpenCap_DataModels_AIFlow.md)
- [OpenCap_DataModels_Processing.md](./OpenCap_DataModels_Processing.md)

These models follow Semantic Seed Venture Studio's Coding Standards V2.0 and incorporate best practices for each database technology while ensuring interoperability across the entire data infrastructure.
