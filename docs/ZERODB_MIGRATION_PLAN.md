# ZeroDB Migration Plan - OpenCapStack

## Migration Overview

**Objective**: Migrate all database operations from MongoDB to ZeroDB APIs
**Timeline**: 6-8 weeks
**Effort**: 90-130 hours
**Risk Level**: Medium (Phased approach)

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Migration Phases](#migration-phases)
3. [Schema Mapping](#schema-mapping)
4. [Code Changes Required](#code-changes-required)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Monitoring & Validation](#monitoring--validation)

---

## Pre-Migration Checklist

### Prerequisites

- [ ] ZeroDB account and project created
- [ ] API credentials obtained
- [ ] Development environment set up
- [ ] Test project in ZeroDB initialized
- [ ] Team trained on ZeroDB APIs
- [ ] Backup of production MongoDB data
- [ ] Migration scripts repository created
- [ ] Staging environment ready

### Environment Setup

```bash
# Add to .env
ZERODB_API_KEY=your_api_key_here
ZERODB_PROJECT_ID=opencap_project_id
ZERODB_BASE_URL=https://api.ainative.studio/api/v1

# Remove (after migration complete)
# MONGODB_URI=mongodb://mongo:27017/opencap
```

---

## Migration Phases

### Phase 1: Foundation (Week 1-2)

#### Objectives:
- Set up ZeroDB infrastructure
- Create table schemas
- Implement base service layer

#### Tasks:

**1.1 ZeroDB Initialization**
```javascript
// scripts/migration/01-init-zerodb-project.js
const zerodbService = require('../../services/zerodbService');

async function initializeProject() {
  await zerodbService.initialize(process.env.ZERODB_API_KEY);
  console.log('ZeroDB project initialized:', zerodbService.projectId);
}
```

**1.2 Create Table Schemas**
```javascript
// scripts/migration/02-create-tables.js
const schemas = require('./schemas');

async function createAllTables() {
  // Create tables in dependency order
  await zerodbService.createTable('users', schemas.userSchema);
  await zerodbService.createTable('companies', schemas.companySchema);
  await zerodbService.createTable('stakeholders', schemas.stakeholderSchema);
  // ... all other tables
}
```

**1.3 Schema Definitions**
```javascript
// scripts/migration/schemas/userSchema.js
module.exports = {
  fields: {
    userId: { type: 'STRING', required: true, unique: true },
    firstName: { type: 'STRING', required: true },
    lastName: { type: 'STRING', required: true },
    email: { type: 'STRING', required: true, unique: true },
    password: { type: 'STRING', required: true },
    role: { type: 'STRING', required: true },
    permissions: { type: 'ARRAY', items: 'STRING' },
    createdAt: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    updatedAt: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  },
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['userId'], unique: true },
    { fields: ['role'] }
  ]
};
```

#### Deliverables:
- ✅ ZeroDB project initialized
- ✅ All table schemas defined
- ✅ Base tables created
- ✅ Service layer extended

---

### Phase 2: Data Migration (Week 2-3)

#### Objectives:
- Migrate existing MongoDB data to ZeroDB
- Validate data integrity
- Maintain data sync during transition

#### Tasks:

**2.1 Data Export from MongoDB**
```javascript
// scripts/migration/03-export-mongo-data.js
const mongoose = require('mongoose');
const fs = require('fs');

async function exportCollection(modelName, Model) {
  const data = await Model.find({}).lean();
  fs.writeFileSync(
    `./migration-data/${modelName}.json`,
    JSON.stringify(data, null, 2)
  );
  console.log(`Exported ${data.length} ${modelName} records`);
}
```

**2.2 Data Import to ZeroDB**
```javascript
// scripts/migration/04-import-to-zerodb.js
async function importCollection(tableName, data) {
  const transformed = data.map(transformMongoToZeroDB);

  for (const record of transformed) {
    await zerodbService.insertRow(tableName, record);
  }

  console.log(`Imported ${data.length} records to ${tableName}`);
}
```

**2.3 Data Transformation**
```javascript
// scripts/migration/transformers/userTransformer.js
function transformMongoToZeroDB(mongoDoc) {
  return {
    userId: mongoDoc.userId,
    firstName: mongoDoc.firstName,
    lastName: mongoDoc.lastName,
    email: mongoDoc.email,
    password: mongoDoc.password,
    role: mongoDoc.role,
    permissions: JSON.stringify(mongoDoc.permissions || []),
    createdAt: mongoDoc.createdAt,
    updatedAt: mongoDoc.updatedAt
  };
}
```

**2.4 Data Validation**
```javascript
// scripts/migration/05-validate-data.js
async function validateMigration(tableName, mongoModel) {
  const mongoCount = await mongoModel.countDocuments();
  const zerodbData = await zerodbService.queryTable(tableName, { limit: 10000 });
  const zerodbCount = zerodbData.length;

  console.log(`${tableName}: MongoDB=${mongoCount}, ZeroDB=${zerodbCount}`);

  if (mongoCount !== zerodbCount) {
    throw new Error(`Count mismatch for ${tableName}`);
  }
}
```

#### Deliverables:
- ✅ All data exported from MongoDB
- ✅ All data imported to ZeroDB
- ✅ Data integrity validated
- ✅ Transformation scripts documented

---

### Phase 3: Code Migration (Week 3-5)

#### Objectives:
- Replace Mongoose models with ZeroDB adapters
- Update controllers to use ZeroDB APIs
- Maintain backward compatibility during transition

#### Tasks:

**3.1 Create ZeroDB Model Adapters**
```javascript
// models/adapters/UserAdapter.js
class UserAdapter {
  constructor(zerodbService) {
    this.db = zerodbService;
    this.tableName = 'users';
  }

  async find(query = {}) {
    return await this.db.queryTable(this.tableName, { filter: query });
  }

  async findOne(query) {
    const results = await this.db.queryTable(this.tableName, {
      filter: query,
      limit: 1
    });
    return results[0] || null;
  }

  async findById(id) {
    return await this.findOne({ userId: id });
  }

  async create(data) {
    return await this.db.insertRow(this.tableName, data);
  }

  async updateOne(query, update) {
    return await this.db.updateRows(this.tableName, query, update);
  }

  async deleteOne(query) {
    return await this.db.deleteRows(this.tableName, query);
  }
}

module.exports = UserAdapter;
```

**3.2 Update Controllers (Example)**
```javascript
// BEFORE (controllers/authController.js):
const User = require('../models/User');
const user = await User.findOne({ email });

// AFTER:
const UserAdapter = require('../models/adapters/UserAdapter');
const zerodbService = require('../services/zerodbService');
const userAdapter = new UserAdapter(zerodbService);
const user = await userAdapter.findOne({ email });
```

**3.3 Migration Pattern for Each Controller**
1. Import ZeroDB adapter instead of Mongoose model
2. Replace `Model.find()` with `adapter.find()`
3. Replace `Model.create()` with `adapter.create()`
4. Replace `Model.updateOne()` with `adapter.updateOne()`
5. Replace `Model.deleteOne()` with `adapter.deleteOne()`
6. Test each controller individually

**3.4 Model Migration Order (Dependency-Based)**
```
1. User (no dependencies)
2. Company (depends on User)
3. Stakeholder (depends on Company)
4. ShareClass (depends on Company)
5. Transaction (depends on Stakeholder, ShareClass)
6. Document (depends on Company)
7. SPV (depends on Company)
8. SPVAsset (depends on SPV)
9. FinancialMetrics (depends on Company)
10. [Continue for all 30+ models]
```

#### Deliverables:
- ✅ All model adapters created
- ✅ All controllers updated
- ✅ Unit tests passing
- ✅ Integration tests passing

---

### Phase 4: Vector Operations (Week 5-6)

#### Objectives:
- Implement document embedding generation
- Store vectors in ZeroDB
- Add semantic search capabilities

#### Tasks:

**4.1 Document Embedding Service**
```javascript
// services/embeddingService.js
const { OpenAI } = require('openai');
const openai = new OpenAI();

class EmbeddingService {
  async generateEmbedding(text) {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536
    });
    return response.data[0].embedding;
  }

  async embedDocument(documentId, content) {
    const embedding = await this.generateEmbedding(content);

    await zerodbService.upsertVector(
      embedding,
      'documents',
      { documentId, type: 'document' },
      content,
      'opencap-documents'
    );

    return embedding;
  }
}

module.exports = new EmbeddingService();
```

**4.2 Semantic Search Implementation**
```javascript
// controllers/documentController.js
async function searchDocumentsSemantic(req, res) {
  const { query, limit = 10 } = req.body;

  // Generate query embedding
  const queryEmbedding = await embeddingService.generateEmbedding(query);

  // Search similar vectors
  const results = await zerodbService.searchVectors(
    queryEmbedding,
    limit,
    'documents'
  );

  // Fetch full documents
  const documents = await Promise.all(
    results.map(r => documentAdapter.findById(r.metadata.documentId))
  );

  res.json({
    query,
    results: documents,
    scores: results.map(r => r.similarity)
  });
}
```

#### Deliverables:
- ✅ Embedding generation working
- ✅ Vectors stored in ZeroDB
- ✅ Semantic search endpoints functional
- ✅ Performance benchmarks documented

---

### Phase 5: Advanced Features (Week 6-7)

#### Objectives:
- Implement agent memory
- Add RLHF data collection
- Enable event streaming

#### Tasks:

**5.1 Agent Memory**
```javascript
// services/agentMemoryService.js
class AgentMemoryService {
  async storeMemory(agentId, sessionId, role, content, metadata = {}) {
    return await zerodbService.storeMemory(
      agentId,
      sessionId,
      role,
      content,
      metadata
    );
  }

  async getContext(agentId, sessionId, limit = 10) {
    return await zerodbService.listMemory(
      agentId,
      sessionId,
      null,
      0,
      limit
    );
  }
}
```

**5.2 RLHF Collection**
```javascript
// middleware/rlhfCollector.js
async function collectRLHF(req, res, next) {
  const originalSend = res.send;

  res.send = function(data) {
    // Log interaction for RLHF
    zerodbService.logRLHF(
      req.body.prompt,
      data,
      req.session.id,
      null, // Reward score set later by user feedback
      ''
    );

    originalSend.call(this, data);
  };

  next();
}
```

**5.3 Event Streaming**
```javascript
// services/eventService.js
async function publishFinancialEvent(eventType, data) {
  await zerodbService.publishEvent('financial-events', {
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  });
}
```

#### Deliverables:
- ✅ Agent memory functional
- ✅ RLHF collection enabled
- ✅ Event streaming working
- ✅ Real-time updates implemented

---

### Phase 6: MongoDB Removal (Week 7-8)

#### Objectives:
- Remove MongoDB dependencies
- Update deployment configs
- Final testing and validation

#### Tasks:

**6.1 Remove MongoDB Dependencies**
```bash
# package.json
npm uninstall mongodb mongoose mongodb-memory-server

# Remove files
rm -rf db/mongoConnection.js
rm -rf utils/mongoDbConnection.js
rm -rf test-init-scripts/mongo/
```

**6.2 Update Docker Compose**
```yaml
# docker-compose.yml
# REMOVE:
services:
  mongo:
    image: mongo:6.0
    # ...

# KEEP: Only application service with ZeroDB env vars
services:
  app:
    environment:
      - ZERODB_API_KEY=${ZERODB_API_KEY}
      - ZERODB_PROJECT_ID=${ZERODB_PROJECT_ID}
```

**6.3 Update Deployment**
```bash
# Remove Kubernetes MongoDB deployment
rm deployment/kubernetes/mongodb.yaml

# Update terraform
# Remove MongoDB resources from deployment/terraform/main.tf
```

#### Deliverables:
- ✅ MongoDB completely removed
- ✅ Deployment configs updated
- ✅ All tests passing
- ✅ Production ready

---

## Schema Mapping

### User Model Example

**MongoDB (Mongoose)**:
```javascript
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'user', 'client'] },
  permissions: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

**ZeroDB**:
```javascript
const userSchema = {
  fields: {
    userId: { type: 'STRING', required: true, unique: true },
    firstName: { type: 'STRING', required: true },
    lastName: { type: 'STRING', required: true },
    email: { type: 'STRING', required: true, unique: true },
    password: { type: 'STRING', required: true },
    role: { type: 'STRING', required: true },
    permissions: { type: 'JSON' }, // or ARRAY of STRING
    createdAt: { type: 'TIMESTAMP', default: 'NOW()' },
    updatedAt: { type: 'TIMESTAMP', default: 'NOW()' }
  },
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['userId'], unique: true },
    { fields: ['role'] }
  ]
};
```

### Type Mapping

| Mongoose | ZeroDB |
|----------|--------|
| String | STRING |
| Number | NUMBER or INTEGER |
| Boolean | BOOLEAN |
| Date | TIMESTAMP |
| ObjectId | STRING (UUID) |
| Array | JSON or ARRAY |
| Mixed/Object | JSON |
| Buffer | BLOB |

---

## Code Changes Required

### Summary of Changes

| Component | Files to Change | Estimated Hours |
|-----------|----------------|-----------------|
| Models | 30+ files | 20-30h |
| Controllers | 29+ files | 30-40h |
| Services | 5 files | 5-10h |
| Tests | 50+ files | 15-20h |
| Config | 10 files | 5-10h |
| Deployment | 8 files | 5-10h |
| **TOTAL** | **130+ files** | **90-130h** |

### Critical Files

**Must Change**:
1. `db.js` - Database connection
2. All files in `models/` - Model definitions
3. All files in `controllers/` - Business logic
4. `package.json` - Dependencies
5. `docker-compose.yml` - Container setup
6. `.env.example` - Environment template

**Should Update**:
1. `README.md` - Setup instructions
2. `docs/` - All database documentation
3. Test files - Database fixtures
4. CI/CD configs - Test database setup

---

## Testing Strategy

### Test Phases

**1. Unit Tests**
```javascript
// tests/adapters/userAdapter.test.js
describe('UserAdapter', () => {
  it('should create user in ZeroDB', async () => {
    const user = await userAdapter.create({
      userId: 'test-123',
      email: 'test@example.com',
      // ...
    });
    expect(user).toBeDefined();
    expect(user.userId).toBe('test-123');
  });
});
```

**2. Integration Tests**
```javascript
// tests/integration/auth.test.js
describe('Authentication with ZeroDB', () => {
  it('should authenticate user from ZeroDB', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

**3. End-to-End Tests**
```javascript
// e2e/user-journey.spec.js
test('Complete user journey with ZeroDB', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

### Test Coverage Requirements

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Response time < 200ms
- **Load Tests**: 1000 concurrent users

---

## Rollback Plan

### If Migration Fails

**1. Immediate Rollback (< 1 hour)**
```bash
# Revert to MongoDB
git checkout main
docker-compose down
docker-compose up -d mongo
npm install
npm start
```

**2. Data Restoration**
```bash
# Restore MongoDB from backup
mongorestore --uri="mongodb://localhost:27017/opencap" ./backup/
```

**3. Rollback Triggers**
- Data loss detected
- Performance degradation > 50%
- Critical functionality broken
- Unable to resolve issues within 4 hours

### Rollback Testing

- [ ] Test rollback procedure in staging
- [ ] Document rollback steps
- [ ] Assign rollback decision maker
- [ ] Set rollback criteria

---

## Monitoring & Validation

### Key Metrics to Monitor

**Performance**:
- Query response time
- API latency
- Throughput (requests/second)
- Error rate

**Data Integrity**:
- Record count consistency
- Data validation errors
- Referential integrity
- Transaction success rate

**System Health**:
- API availability
- ZeroDB connection status
- Memory usage
- CPU usage

### Validation Checkpoints

**After Each Phase**:
1. Run data validation scripts
2. Execute full test suite
3. Check performance benchmarks
4. Review error logs
5. User acceptance testing

**Before Production**:
1. Load testing (1000+ concurrent users)
2. Stress testing (2x expected load)
3. Security audit
4. Performance benchmarks
5. Stakeholder approval

---

## Success Criteria

### Technical Metrics

- [ ] 100% of data migrated successfully
- [ ] 0% data loss
- [ ] All tests passing (unit, integration, E2E)
- [ ] Performance within 10% of MongoDB baseline
- [ ] Zero MongoDB dependencies remaining
- [ ] Vector search operational
- [ ] Agent memory functional
- [ ] RLHF collection enabled

### Business Metrics

- [ ] No production downtime
- [ ] User experience unchanged or improved
- [ ] Support tickets < 5 migration-related
- [ ] Team trained on ZeroDB
- [ ] Documentation complete
- [ ] Stakeholder approval obtained

---

## Team Assignments

### Roles & Responsibilities

**Migration Lead**: Overall coordination, risk management
**Backend Developer 1**: Model adapters, controllers
**Backend Developer 2**: Data migration scripts, validation
**DevOps Engineer**: Deployment updates, infrastructure
**QA Engineer**: Test suite updates, validation
**Technical Writer**: Documentation updates

---

## Timeline & Milestones

| Week | Milestone | Deliverables |
|------|-----------|--------------|
| 1 | Foundation | ZeroDB setup, schemas defined |
| 2 | Data Migration | All data in ZeroDB |
| 3-4 | Code Migration | 50% controllers updated |
| 5 | Code Complete | 100% controllers updated |
| 6 | Advanced Features | Vectors, memory, RLHF |
| 7 | MongoDB Removal | Clean system, tests passing |
| 8 | Production Deploy | Live on ZeroDB |

---

## Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss | Low | Critical | Backups, validation scripts |
| Performance issues | Medium | High | Load testing, optimization |
| Integration bugs | High | Medium | Comprehensive testing |
| Team learning curve | Medium | Low | Training, documentation |
| Timeline overrun | Medium | Medium | Buffer time, phased approach |

---

## Budget & Resources

### Estimated Costs

**Development**: 90-130 hours × hourly rate
**ZeroDB**: Subscription costs (if applicable)
**Infrastructure**: Staging environment
**Testing**: Load testing tools
**Buffer**: 20% contingency

**Total Estimated Cost**: $15,000 - $25,000 (based on $150/hour rate)

---

## Post-Migration

### Optimization Opportunities

After successful migration:

1. **Performance Tuning**
   - Index optimization
   - Query optimization
   - Caching strategies

2. **Feature Development**
   - Advanced semantic search
   - AI-powered recommendations
   - Real-time analytics dashboard
   - Quantum-enhanced insights

3. **Monitoring & Observability**
   - Set up dashboards
   - Alert thresholds
   - Performance tracking

---

## Conclusion

This migration plan provides a comprehensive roadmap for migrating OpenCapStack from MongoDB to ZeroDB. The phased approach minimizes risk while enabling a smooth transition.

**Key Success Factors**:
1. Thorough testing at each phase
2. Clear communication with stakeholders
3. Proper backup and rollback procedures
4. Team training and documentation
5. Continuous monitoring and validation

**Next Steps**:
1. Review and approve this plan
2. Allocate resources and budget
3. Set up ZeroDB test environment
4. Begin Phase 1: Foundation

---

**Document Version**: 1.0
**Last Updated**: 2026-02-01
**Status**: Ready for Approval
**Owner**: Development Team
