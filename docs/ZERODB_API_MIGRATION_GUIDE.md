# ZeroDB API Migration Guide - OpenCapStack

## Document Information

**Created:** 2026-02-01
**Status:** Official Development Guide
**Purpose:** Complete reference for migrating MongoDB operations to ZeroDB APIs
**Audience:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Authentication Setup](#authentication-setup)
4. [Project Initialization](#project-initialization)
5. [Migration Patterns](#migration-patterns)
6. [Code Examples](#code-examples)
7. [Testing Strategy](#testing-strategy)
8. [Troubleshooting](#troubleshooting)
9. [API Reference Quick Links](#api-reference-quick-links)

---

## Overview

This guide provides step-by-step instructions for migrating OpenCapStack from MongoDB/Mongoose to ZeroDB APIs. It includes practical code examples, migration patterns, and best practices.

### Why ZeroDB?

- **Unified Database**: Relational + Vector + Events + Files in one system
- **Built-in Vector Search**: Native semantic search capabilities
- **AI-Ready**: Agent memory, RLHF collection, embeddings
- **Modern Architecture**: RESTful APIs with comprehensive tooling
- **Cost Effective**: Single database system reduces infrastructure complexity

### Migration Approach

We're using a **phased migration** strategy:
1. ✅ **Phase 0**: Setup and Configuration (Complete)
2. **Phase 1**: Parallel Running (MongoDB + ZeroDB)
3. **Phase 2**: Gradual Model Migration
4. **Phase 3**: Controller Updates
5. **Phase 4**: Testing and Validation
6. **Phase 5**: MongoDB Deprecation

---

## Prerequisites

### 1. Environment Setup

Ensure your `.env` file contains:

```bash
# AINATIVE / ZERODB CREDENTIALS
AINATIVE_USERNAME="admin@ainative.studio"
AINATIVE_PASSWORD="H%dJcjSwLZIe1%9u"
AINATIVE_API_URL="https://api.ainative.studio/"
AINATIVE_API_TOKEN="kLPiP0bzgKJ0CnNYVt1wq3qxbs2QgDeF2XwyUnxBEOM"

# ZeroDB Configuration
ZERODB_API_KEY="kLPiP0bzgKJ0CnNYVt1wq3qxbs2QgDeF2XwyUnxBEOM"
ZERODB_BASE_URL="https://api.ainative.studio/api/v1"
ZERODB_PROJECT_ID=""  # Set after creating project

# Feature Flags
ENABLE_ZERODB=true
ENABLE_MONGODB_FALLBACK=true
MIGRATION_MODE=parallel
```

### 2. Install Dependencies

```bash
npm install axios dotenv
```

### 3. Verify ZeroDB Service

Check that `services/zerodbService.js` is properly configured.

---

## Authentication Setup

### Step 1: Register User (One-time)

```bash
curl -X POST "https://api.ainative.studio/v1/public/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ainative.studio",
    "password": "H%dJcjSwLZIe1%9u",
    "name": "OpenCapStack Admin"
  }'
```

### Step 2: Login and Get Access Token

```bash
curl -X POST "https://api.ainative.studio/v1/public/auth/login-json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ainative.studio",
    "password": "H%dJcjSwLZIe1%9u"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Step 3: Verify Authentication

```bash
curl -X GET "https://api.ainative.studio/v1/public/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Project Initialization

### Create ZeroDB Project

**Important:** Do this ONCE per environment (dev, staging, production)

```bash
curl -X POST "https://api.ainative.studio/v1/public/projects" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenCapStack",
    "description": "Cap table management platform",
    "tier": "pro",
    "database_enabled": true
  }'
```

**Response:**
```json
{
  "id": "proj_opencapstack_123",
  "name": "OpenCapStack",
  "tier": "pro",
  "status": "active",
  "database_enabled": true,
  "vector_dimensions": 1536,
  "created_at": "2026-02-01T00:00:00Z"
}
```

**Action Required:** Update `.env` with the project ID:
```bash
ZERODB_PROJECT_ID="proj_opencapstack_123"
```

---

## Migration Patterns

### Pattern 1: Simple CRUD Operations

#### MongoDB/Mongoose (OLD)

```javascript
const User = require('../models/User');

// Create
const user = await User.create({
  userId: 'user_123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'admin'
});

// Read
const users = await User.find({ role: 'admin' });
const oneUser = await User.findOne({ email: 'john@example.com' });

// Update
await User.updateOne(
  { userId: 'user_123' },
  { $set: { firstName: 'Jane' } }
);

// Delete
await User.deleteOne({ userId: 'user_123' });
```

#### ZeroDB (NEW)

```javascript
const zerodbService = require('../services/zerodbService');

// Initialize service
await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);

// Create
const user = await zerodbService.insertRows('users', [{
  userId: 'user_123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'admin'
}]);

// Read
const users = await zerodbService.queryTable('users', {
  filter: { role: 'admin' }
});

const oneUser = await zerodbService.queryTable('users', {
  filter: { email: 'john@example.com' },
  limit: 1
});

// Update
await zerodbService.updateRows('users', {
  filter: { userId: 'user_123' },
  update: { firstName: 'Jane' }
});

// Delete
await zerodbService.deleteRows('users', {
  filter: { userId: 'user_123' }
});
```

---

### Pattern 2: MongoDB Query Operators

ZeroDB supports MongoDB-style query operators:

#### Comparison Operators

```javascript
// MongoDB
await User.find({ age: { $gte: 18 } });

// ZeroDB
await zerodbService.queryTable('users', {
  filter: { age: { $gte: 18 } }
});
```

#### Logical Operators

```javascript
// MongoDB
await User.find({
  $or: [
    { role: 'admin' },
    { role: 'manager' }
  ]
});

// ZeroDB
await zerodbService.queryTable('users', {
  filter: {
    $or: [
      { role: 'admin' },
      { role: 'manager' }
    ]
  }
});
```

#### Array Operators

```javascript
// MongoDB
await User.find({ tags: { $in: ['premium', 'vip'] } });

// ZeroDB
await zerodbService.queryTable('users', {
  filter: { tags: { $in: ['premium', 'vip'] } }
});
```

**Supported Operators:**
- `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$and`, `$or`, `$not`
- `$regex`, `$exists`

---

### Pattern 3: Pagination

```javascript
// MongoDB
const page = 2;
const limit = 20;
const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit)
  .sort({ createdAt: -1 });

// ZeroDB
const users = await zerodbService.queryTable('users', {
  skip: (page - 1) * limit,
  limit: limit,
  sort: { createdAt: -1 }
});
```

---

### Pattern 4: Sorting

```javascript
// MongoDB
await User.find().sort({ lastName: 1, firstName: 1 });

// ZeroDB
await zerodbService.queryTable('users', {
  sort: { lastName: 1, firstName: 1 }
});
```

---

### Pattern 5: Field Projection

```javascript
// MongoDB
await User.find().select('firstName lastName email');

// ZeroDB
await zerodbService.queryTable('users', {
  projection: { firstName: 1, lastName: 1, email: 1 }
});
```

---

### Pattern 6: Bulk Operations

```javascript
// MongoDB
await User.bulkWrite([
  { insertOne: { document: { userId: '1', name: 'John' } } },
  { insertOne: { document: { userId: '2', name: 'Jane' } } }
]);

// ZeroDB
await zerodbService.insertRows('users', [
  { userId: '1', name: 'John' },
  { userId: '2', name: 'Jane' }
]);
```

---

## Code Examples

### Example 1: User Controller Migration

**Before: `controllers/userController.js` (MongoDB)**

```javascript
const User = require('../models/User');

exports.getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    const filter = role ? { role } : {};

    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOneAndUpdate(
      { userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

**After: `controllers/userController.js` (ZeroDB)**

```javascript
const zerodbService = require('../services/zerodbService');

// Initialize once
let initialized = false;
const ensureInitialized = async () => {
  if (!initialized) {
    await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);
    initialized = true;
  }
};

exports.getUsers = async (req, res) => {
  try {
    await ensureInitialized();

    const { role, page = 1, limit = 20 } = req.query;

    const filter = role ? { role } : {};
    const skip = (page - 1) * parseInt(limit);

    const result = await zerodbService.queryTable('users', {
      filter,
      skip,
      limit: parseInt(limit),
      sort: { createdAt: -1 }
    });

    // Get total count
    const totalResult = await zerodbService.queryTable('users', {
      filter,
      projection: { _id: 1 }  // Minimal projection for count
    });
    const total = totalResult.length;

    res.json({
      users: result,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('ZeroDB Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    await ensureInitialized();

    const users = await zerodbService.insertRows('users', [req.body]);
    res.status(201).json(users[0]);
  } catch (error) {
    console.error('ZeroDB Error:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    await ensureInitialized();

    const { userId } = req.params;

    // Check if user exists
    const existing = await zerodbService.queryTable('users', {
      filter: { userId },
      limit: 1
    });

    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update
    await zerodbService.updateRows('users', {
      filter: { userId },
      update: req.body
    });

    // Fetch updated user
    const updated = await zerodbService.queryTable('users', {
      filter: { userId },
      limit: 1
    });

    res.json(updated[0]);
  } catch (error) {
    console.error('ZeroDB Error:', error);
    res.status(400).json({ error: error.message });
  }
};
```

---

### Example 2: Table Schema Creation

**Create tables BEFORE migrating data:**

```javascript
// scripts/createZeroDBTables.js

const zerodbService = require('../services/zerodbService');

async function createTables() {
  await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);

  // Users table
  await zerodbService.createTable('users', {
    userId: { type: 'string', required: true, unique: true },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    email: { type: 'string', required: true, unique: true },
    password: { type: 'string', required: true },
    role: { type: 'string', enum: ['admin', 'manager', 'user', 'client'] },
    isActive: { type: 'boolean', default: true },
    emailVerified: { type: 'boolean', default: false },
    createdAt: { type: 'date', default: 'now' },
    updatedAt: { type: 'date', default: 'now' }
  });

  // Companies table
  await zerodbService.createTable('companies', {
    companyId: { type: 'string', required: true, unique: true },
    companyName: { type: 'string', required: true },
    ein: { type: 'string' },
    incorporationState: { type: 'string' },
    incorporationDate: { type: 'date' },
    companyType: { type: 'string', enum: ['C-Corp', 'S-Corp', 'LLC', 'Partnership'] },
    authorizedShares: { type: 'number' },
    createdBy: { type: 'string' },
    createdAt: { type: 'date', default: 'now' },
    updatedAt: { type: 'date', default: 'now' }
  });

  // Stakeholders table
  await zerodbService.createTable('stakeholders', {
    stakeholderId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    firstName: { type: 'string', required: true },
    lastName: { type: 'string', required: true },
    email: { type: 'string', required: true },
    stakeholderType: { type: 'string', enum: ['founder', 'employee', 'investor', 'advisor'] },
    isActive: { type: 'boolean', default: true },
    taxId: { type: 'string' },
    address: { type: 'object' },
    createdAt: { type: 'date', default: 'now' },
    updatedAt: { type: 'date', default: 'now' }
  });

  // Transactions table
  await zerodbService.createTable('transactions', {
    transactionId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    stakeholderId: { type: 'string', required: true },
    transactionType: { type: 'string', required: true },
    shares: { type: 'number', required: true },
    pricePerShare: { type: 'number' },
    transactionDate: { type: 'date', required: true },
    status: { type: 'string', enum: ['pending', 'completed', 'cancelled'], default: 'pending' },
    metadata: { type: 'object' },
    createdAt: { type: 'date', default: 'now' },
    updatedAt: { type: 'date', default: 'now' }
  });

  console.log('✅ All tables created successfully');
}

createTables().catch(console.error);
```

**Run the script:**
```bash
node scripts/createZeroDBTables.js
```

---

### Example 3: Data Migration Script

```javascript
// scripts/migrateDataToZeroDB.js

const mongoose = require('mongoose');
const zerodbService = require('../services/zerodbService');
const User = require('../models/User');

async function migrateUsers() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);

  // Initialize ZeroDB
  await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);

  console.log('Starting user migration...');

  const batchSize = 100;
  let skip = 0;
  let migrated = 0;

  while (true) {
    // Fetch batch from MongoDB
    const users = await User.find()
      .skip(skip)
      .limit(batchSize)
      .lean();

    if (users.length === 0) break;

    // Transform data if needed
    const transformed = users.map(user => ({
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    // Insert into ZeroDB
    await zerodbService.insertRows('users', transformed);

    migrated += users.length;
    console.log(`Migrated ${migrated} users...`);

    skip += batchSize;
  }

  console.log(`✅ Migration complete: ${migrated} users migrated`);

  await mongoose.disconnect();
}

migrateUsers().catch(console.error);
```

---

### Example 4: Vector Search Integration

**Add semantic search to documents:**

```javascript
// controllers/documentController.js

const zerodbService = require('../services/zerodbService');

exports.searchDocuments = async (req, res) => {
  try {
    await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);

    const { query, limit = 10 } = req.body;

    // Perform semantic search using ZeroDB embeddings
    const results = await zerodbService.semanticSearch(query, {
      namespace: 'documents',
      limit: parseInt(limit),
      threshold: 0.7,
      filter_metadata: {
        companyId: req.user.companyId  // Filter by user's company
      }
    });

    res.json({
      query,
      results: results.map(r => ({
        documentId: r.metadata.documentId,
        title: r.metadata.title,
        excerpt: r.text.substring(0, 200),
        relevanceScore: r.score,
        uploadedAt: r.metadata.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Semantic Search Error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);

    const { documentId, title, content, companyId } = req.body;

    // 1. Store document metadata in table
    await zerodbService.insertRows('documents', [{
      documentId,
      title,
      companyId,
      uploadedBy: req.user.userId,
      uploadedAt: new Date().toISOString()
    }]);

    // 2. Generate and store embeddings for semantic search
    await zerodbService.embedAndStore([content], {
      metadata: {
        documentId,
        title,
        companyId,
        uploadedAt: new Date().toISOString()
      },
      namespace: 'documents'
    });

    res.status(201).json({ message: 'Document uploaded and indexed' });
  } catch (error) {
    console.error('Document Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

---

## Testing Strategy

### Unit Tests

**Test ZeroDB operations in isolation:**

```javascript
// tests/services/zerodbService.test.js

const zerodbService = require('../../services/zerodbService');

describe('ZeroDB Service', () => {
  beforeAll(async () => {
    await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);
  });

  describe('CRUD Operations', () => {
    test('should create a row', async () => {
      const result = await zerodbService.insertRows('test_table', [{
        testId: 'test_123',
        name: 'Test Record'
      }]);

      expect(result).toHaveLength(1);
      expect(result[0].testId).toBe('test_123');
    });

    test('should query rows', async () => {
      const result = await zerodbService.queryTable('test_table', {
        filter: { testId: 'test_123' }
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Record');
    });

    test('should update a row', async () => {
      await zerodbService.updateRows('test_table', {
        filter: { testId: 'test_123' },
        update: { name: 'Updated Record' }
      });

      const result = await zerodbService.queryTable('test_table', {
        filter: { testId: 'test_123' }
      });

      expect(result[0].name).toBe('Updated Record');
    });

    test('should delete a row', async () => {
      await zerodbService.deleteRows('test_table', {
        filter: { testId: 'test_123' }
      });

      const result = await zerodbService.queryTable('test_table', {
        filter: { testId: 'test_123' }
      });

      expect(result).toHaveLength(0);
    });
  });
});
```

### Integration Tests

**Test controllers with ZeroDB:**

```javascript
// tests/integration/userController.test.js

const request = require('supertest');
const app = require('../../app');

describe('User Controller (ZeroDB)', () => {
  let authToken;

  beforeAll(async () => {
    // Get auth token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpass123'
      });

    authToken = response.body.token;
  });

  test('GET /api/users should return users from ZeroDB', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('users');
    expect(Array.isArray(response.body.users)).toBe(true);
  });

  test('POST /api/users should create user in ZeroDB', async () => {
    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: 'test_user_new',
        firstName: 'New',
        lastName: 'User',
        email: 'newuser@example.com',
        role: 'user'
      })
      .expect(201);

    expect(response.body.userId).toBe('test_user_new');
  });
});
```

---

## Troubleshooting

### Issue 1: Authentication Errors

**Symptom:** 401 Unauthorized responses

**Solution:**
```javascript
// Check token validity
const response = await fetch('https://api.ainative.studio/v1/public/auth/me', {
  headers: {
    'Authorization': `Bearer ${process.env.AINATIVE_API_TOKEN}`
  }
});

if (response.status === 401) {
  console.error('Token expired or invalid - need to refresh');
  // Implement token refresh logic
}
```

### Issue 2: Table Not Found

**Symptom:** Error: "Table 'users' does not exist"

**Solution:**
```bash
# Run table creation script
node scripts/createZeroDBTables.js

# Or create table via API
curl -X POST "https://api.ainative.studio/v1/public/zerodb/${PROJECT_ID}/database/tables" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "users",
    "schema": {...}
  }'
```

### Issue 3: Rate Limiting

**Symptom:** 429 Too Many Requests

**Solution:**
```javascript
// Implement retry with exponential backoff
async function zerodbWithRetry(operation, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Issue 4: Data Type Mismatches

**Symptom:** Validation errors when inserting data

**Solution:**
```javascript
// Transform MongoDB data types to ZeroDB format
function transformMongoToZeroDB(mongoDoc) {
  return {
    ...mongoDoc,
    // Convert ObjectId to string
    _id: mongoDoc._id?.toString(),
    // Convert Date objects to ISO strings
    createdAt: mongoDoc.createdAt?.toISOString(),
    updatedAt: mongoDoc.updatedAt?.toISOString(),
    // Ensure numbers are numbers
    age: parseInt(mongoDoc.age),
    // Clean undefined values
    ...Object.fromEntries(
      Object.entries(mongoDoc).filter(([_, v]) => v !== undefined)
    )
  };
}
```

### Issue 5: Vector Dimension Mismatch

**Symptom:** Error: "Vector dimension mismatch"

**Solution:**
```javascript
// Ensure embeddings match project dimensions (default: 1536)
const projectInfo = await zerodbService.getProjectInfo();
const expectedDimensions = projectInfo.vector_dimensions;

if (embedding.length !== expectedDimensions) {
  console.error(`Expected ${expectedDimensions} dimensions, got ${embedding.length}`);
  // Use correct embedding model or pad/truncate vector
}
```

---

## API Reference Quick Links

### Authentication
- **Register:** `POST /v1/public/auth/register`
- **Login:** `POST /v1/public/auth/login-json`
- **Get Current User:** `GET /v1/public/auth/me`
- **Refresh Token:** `POST /v1/public/auth/refresh`

### Projects
- **List Projects:** `GET /v1/public/projects`
- **Create Project:** `POST /v1/public/projects`
- **Get Project:** `GET /v1/public/projects/{project_id}`
- **Get Usage:** `GET /v1/public/projects/{project_id}/usage`

### Tables (NoSQL)
- **Create Table:** `POST /v1/public/zerodb/{project_id}/database/tables`
- **List Tables:** `GET /v1/public/zerodb/{project_id}/database/tables`
- **Insert Rows:** `POST /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows`
- **Query Rows:** `POST /v1/public/zerodb/{project_id}/database/tables/{table_name}/query`
- **Update Rows:** `PUT /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/bulk`
- **Delete Rows:** `DELETE /v1/public/zerodb/{project_id}/database/tables/{table_name}/rows/bulk`

### Vectors
- **Upsert Vectors:** `POST /v1/public/zerodb/{project_id}/database/vectors/upsert`
- **Search Vectors:** `POST /v1/public/zerodb/{project_id}/database/vectors/search`
- **List Vectors:** `GET /v1/public/zerodb/{project_id}/database/vectors`
- **Delete Vector:** `DELETE /v1/public/zerodb/{project_id}/database/vectors/{vector_id}`
- **Vector Stats:** `GET /v1/public/zerodb/{project_id}/database/vectors/stats`

### Embeddings
- **Generate Embeddings:** `POST /v1/public/zerodb/{project_id}/embeddings/generate`
- **Embed and Store:** `POST /v1/public/zerodb/{project_id}/embeddings/embed-and-store`
- **Semantic Search:** `POST /v1/public/zerodb/{project_id}/embeddings/search`
- **List Models:** `GET /v1/public/zerodb/{project_id}/embeddings/models`

### Memory (Agent Memory)
- **Create Memory:** `POST /v1/public/zerodb/{project_id}/database/memory`
- **Search Memory:** `POST /v1/public/zerodb/{project_id}/database/memory/search`
- **List Memories:** `GET /v1/public/zerodb/{project_id}/database/memory`
- **Update Memory:** `PUT /v1/public/zerodb/{project_id}/database/memory/{memory_id}`

### Events (Pub/Sub)
- **Publish Event:** `POST /v1/public/zerodb/{project_id}/database/events`
- **List Events:** `GET /v1/public/zerodb/{project_id}/database/events`
- **Batch Publish:** `POST /v1/public/zerodb/{project_id}/database/events/batch`
- **Create Subscription:** `POST /v1/public/zerodb/{project_id}/database/events/subscriptions`

### Files
- **Upload File:** `POST /v1/public/zerodb/{project_id}/database/files`
- **List Files:** `GET /v1/public/zerodb/{project_id}/database/files`
- **Download File:** `GET /v1/public/zerodb/{project_id}/database/files/{file_id}/download`
- **Generate Presigned URL:** `POST /v1/public/zerodb/{project_id}/database/files/{file_id}/presigned-url`
- **Delete File:** `DELETE /v1/public/zerodb/{project_id}/database/files/{file_id}`

### PostgreSQL (Optional)
- **Provision Instance:** `POST /v1/public/projects/{project_id}/postgres`
- **Get Status:** `GET /v1/public/projects/{project_id}/postgres`
- **Execute Query:** `POST /v1/public/projects/{project_id}/database/postgres/query`
- **List Tables:** `GET /v1/public/projects/{project_id}/database/postgres/tables`

---

## Best Practices

### 1. Always Initialize Once

```javascript
let zerodbInitialized = false;

async function ensureZeroDBInit() {
  if (!zerodbInitialized) {
    await zerodbService.initialize(process.env.AINATIVE_API_TOKEN);
    zerodbInitialized = true;
  }
}
```

### 2. Handle Errors Gracefully

```javascript
try {
  const result = await zerodbService.queryTable('users', filter);
  return result;
} catch (error) {
  console.error('ZeroDB Error:', {
    message: error.message,
    code: error.code,
    response: error.response?.data
  });

  // Fallback to MongoDB if in parallel mode
  if (process.env.MIGRATION_MODE === 'parallel') {
    console.log('Falling back to MongoDB...');
    return await User.find(filter);
  }

  throw error;
}
```

### 3. Use Batch Operations

```javascript
// ❌ Bad: Individual inserts
for (const user of users) {
  await zerodbService.insertRows('users', [user]);
}

// ✅ Good: Batch insert
await zerodbService.insertRows('users', users);
```

### 4. Index Properly

```javascript
// Create indexes on frequently queried fields
await zerodbService.createTable('users', {
  userId: { type: 'string', required: true, unique: true },
  email: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', indexed: true },  // Add index
  role: { type: 'string', indexed: true },       // Add index
  createdAt: { type: 'date', indexed: true }     // Add index
});
```

### 5. Monitor Performance

```javascript
async function queryWithTiming(operation, name) {
  const start = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - start;
    console.log(`${name} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`${name} failed after ${duration}ms:`, error.message);
    throw error;
  }
}

// Usage
const users = await queryWithTiming(
  () => zerodbService.queryTable('users', filter),
  'User Query'
);
```

---

## Migration Checklist

Use this checklist for each model migration:

### Pre-Migration
- [ ] Review model schema and relationships
- [ ] Create ZeroDB table with appropriate schema
- [ ] Add indexes for performance
- [ ] Write migration script
- [ ] Test migration script on sample data

### Migration
- [ ] Run migration script
- [ ] Verify data integrity (count, sample records)
- [ ] Update controller to use ZeroDB service
- [ ] Update routes if needed
- [ ] Update tests

### Post-Migration
- [ ] Run integration tests
- [ ] Performance testing
- [ ] Monitor error logs
- [ ] Document any issues or gotchas
- [ ] Update API documentation

### Validation
- [ ] Compare MongoDB vs ZeroDB record counts
- [ ] Spot-check 10+ random records for data accuracy
- [ ] Test all CRUD operations
- [ ] Test pagination and sorting
- [ ] Test complex queries with filters

---

## Support and Resources

### Documentation
- **Full API Reference:** See the complete AINative API reference document
- **OpenAPI Spec:** https://api.ainative.studio/v1/openapi.json
- **Migration Plan:** `docs/ZERODB_MIGRATION_PLAN.md`
- **Compliance Analysis:** `docs/DATABASE_COMPLIANCE_ANALYSIS.md`

### Getting Help
- **API Issues:** Check ZeroDB service logs
- **Migration Issues:** Review migration script output
- **Performance Issues:** Check query logs and indexes

### Tools
- **API Testing:** Use Postman or cURL with examples from this guide
- **Monitoring:** Check project usage at `/v1/public/projects/{project_id}/usage`
- **Logs:** Enable debug logging with `LOG_LEVEL=debug` in `.env`

---

**Document Version:** 1.0
**Last Updated:** 2026-02-01
**Status:** Official Development Guide
**Next Review:** After Phase 1 migration completion
