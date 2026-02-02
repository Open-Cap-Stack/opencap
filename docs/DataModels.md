# OpenCap Data Models

**Version**: 2.0
**Date**: February 2, 2026
**Status**: Production
**Database**: ZeroDB (via AINative Studio)

This document describes the core data models used throughout the OpenCap platform, now stored in ZeroDB.

## Database Overview

OpenCap Stack uses ZeroDB as its primary database, providing:
- NoSQL table storage for all application data
- Vector search for semantic document search
- Memory management for agent context
- Event streaming for real-time updates
- File storage for document uploads

For ZeroDB API details, see [ZeroDB API Reference](./zerodb/API_REFERENCE.md).

---

## Models

## User Model
**Feature:** OCDI-102: Create User data model

The User model represents users in the OpenCap system with various roles and permissions.

### ZeroDB Table: `users`

### Schema Fields

| Field                | Type      | Required | Default   | Description                               |
|----------------------|-----------|----------|-----------|-------------------------------------------|
| userId               | string    | Yes      | -         | Unique identifier for the user            |
| firstName            | string    | Yes      | -         | User's first name                         |
| lastName             | string    | Yes      | -         | User's last name                          |
| displayName          | string    | No       | Generated | Full name (firstName + lastName)          |
| email                | string    | Yes      | -         | User's email address (unique)             |
| password             | string    | Yes      | -         | Hashed password                           |
| role                 | string    | Yes      | -         | User role (admin, manager, user, client)  |
| status               | string    | No       | 'pending' | Account status                            |
| companyId            | string    | No       | null      | Associated company ID                     |
| profile              | json      | No       | {}        | User profile information                  |
| lastLogin            | timestamp | No       | null      | Timestamp of last login                   |
| passwordResetToken   | string    | No       | null      | Token for password reset                  |
| passwordResetExpires | timestamp | No       | null      | Expiration time for password reset token  |
| createdAt            | timestamp | Auto     | Now       | Timestamp when user was created           |
| updatedAt            | timestamp | Auto     | Now       | Timestamp when user was last updated      |

### Profile Sub-Schema (JSON field)

| Field       | Type   | Default | Description                     |
|-------------|--------|---------|----------------------------------|
| bio         | string | ''      | User biography                   |
| avatar      | string | null    | URL to user's avatar/image       |
| phoneNumber | string | null    | User's contact phone number      |
| address     | object | {}      | User's address information       |

### Address Sub-Schema (nested in profile)

| Field    | Type   | Default | Description                  |
|----------|--------|---------|------------------------------|
| street   | string | null    | Street address               |
| city     | string | null    | City                         |
| state    | string | null    | State/province               |
| zipCode  | string | null    | Postal/ZIP code              |
| country  | string | null    | Country                      |

### ZeroDB Indexes

- `email` - Unique index for email lookups
- `userId` - Unique index for user ID lookups
- `companyId` - Index for company-based queries

### Usage Example

```javascript
const zerodbService = require('../services/zerodbService');

// Create a new user
const newUser = {
  userId: 'user123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  password: 'hashedPassword123',
  role: 'user',
  companyId: 'company123',
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Save the user to ZeroDB
await zerodbService.insertRow('users', newUser);

// Find a user by email
const users = await zerodbService.queryTable('users', {
  filter: { email: 'john@example.com' },
  limit: 1
});
const user = users.rows[0];

// Update user information
await zerodbService.updateRow('users', user.row_id, {
  status: 'active',
  updatedAt: new Date().toISOString()
});
```

### Security Considerations

- Passwords are stored in hashed format only (not encrypted or plaintext)
- Sensitive fields should be filtered when returning user data
- Role-based access control implemented via the `role` field

---

## Transaction Model
**Feature:** OCDI-103: Create Transaction data model

The Transaction model represents financial transactions within the OpenCap platform.

### ZeroDB Table: `transactions`

### Schema Fields

| Field                | Type      | Required | Default   | Description                                    |
|----------------------|-----------|----------|-----------|------------------------------------------------|
| transactionId        | string    | Yes      | -         | Unique identifier for the transaction          |
| userId               | string    | Yes      | -         | ID of the user associated with the transaction |
| companyId            | string    | No       | null      | ID of the company for the transaction          |
| amount               | number    | Yes      | -         | Transaction amount (positive number)           |
| currency             | string    | Yes      | -         | ISO currency code (USD, EUR, etc.)             |
| type                 | string    | Yes      | -         | Transaction type (payment, deposit, etc.)      |
| status               | string    | Yes      | -         | Current transaction status                     |
| description          | string    | No       | null      | Optional description of the transaction        |
| metadata             | json      | No       | {}        | Additional transaction data                    |
| fees                 | json      | No       | {}        | Transaction fee details                        |
| processedAt          | timestamp | No       | null      | Date when the transaction was processed        |
| createdAt            | timestamp | Auto     | Now       | Date when the transaction was created          |
| updatedAt            | timestamp | Auto     | Now       | Date when the transaction was last updated     |

### Fees Sub-Schema (JSON field)

| Field         | Type   | Default | Description              |
|---------------|--------|---------|--------------------------|
| processingFee | number | 0       | Processing fee amount    |
| platformFee   | number | 0       | Platform fee amount      |
| taxAmount     | number | 0       | Tax amount               |
| otherFees     | number | 0       | Any other applicable fees|

### ZeroDB Indexes

- `transactionId` - Unique index for transaction IDs
- `userId` - Index for user-based queries
- `companyId` - Index for company-based queries
- `status` - Index for filtering transactions by status
- `createdAt` - Index for chronological sorting

### Usage Example

```javascript
const zerodbService = require('../services/zerodbService');

// Create a new transaction
const newTransaction = {
  transactionId: 'txn12345',
  userId: 'user123',
  companyId: 'company123',
  amount: 500.75,
  currency: 'USD',
  type: 'payment',
  status: 'pending',
  description: 'Monthly subscription payment',
  fees: {
    processingFee: 15.00,
    platformFee: 5.00,
    taxAmount: 2.50
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Save the transaction to ZeroDB
await zerodbService.insertRow('transactions', newTransaction);

// Query transactions by status
const pendingTransactions = await zerodbService.queryTable('transactions', {
  filter: { status: 'pending' },
  sort: 'createdAt',
  order: 'desc',
  limit: 100
});

// Update transaction status
await zerodbService.updateRow('transactions', rowId, {
  status: 'completed',
  processedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
```

### Validation

- Amount must be a positive number
- Currency must be a valid ISO currency code
- Transaction ID must be unique
- Required fields: transactionId, userId, amount, currency, type, status

---

## Company Model

The Company model represents organizations within the OpenCap platform.

### ZeroDB Table: `companies`

### Schema Fields

| Field           | Type      | Required | Default | Description                        |
|-----------------|-----------|----------|---------|------------------------------------|
| companyId       | string    | Yes      | -       | Unique identifier for the company  |
| name            | string    | Yes      | -       | Company name                       |
| type            | string    | Yes      | -       | Company type (C-Corp, LLC, etc.)   |
| incorporationDate | timestamp | No    | null    | Date of incorporation              |
| jurisdiction    | string    | No       | null    | Legal jurisdiction                 |
| address         | json      | No       | {}      | Company address                    |
| metadata        | json      | No       | {}      | Additional company data            |
| createdAt       | timestamp | Auto     | Now     | Timestamp when created             |
| updatedAt       | timestamp | Auto     | Now     | Timestamp when last updated        |

---

## Share Class Model

The Share Class model represents different classes of shares for companies.

### ZeroDB Table: `share_classes`

### Schema Fields

| Field            | Type      | Required | Default | Description                          |
|------------------|-----------|----------|---------|--------------------------------------|
| shareClassId     | string    | Yes      | -       | Unique identifier for share class    |
| companyId        | string    | Yes      | -       | Associated company ID                |
| name             | string    | Yes      | -       | Share class name (Common, Preferred) |
| authorizedShares | number    | Yes      | -       | Total authorized shares              |
| issuedShares     | number    | No       | 0       | Currently issued shares              |
| pricePerShare    | number    | No       | null    | Current price per share              |
| votingRights     | boolean   | No       | true    | Whether shares have voting rights    |
| preferences      | json      | No       | {}      | Liquidation preferences, etc.        |
| createdAt        | timestamp | Auto     | Now     | Timestamp when created               |
| updatedAt        | timestamp | Auto     | Now     | Timestamp when last updated          |

---

## Document Model

The Document model represents documents stored within the OpenCap platform.

### ZeroDB Table: `documents`

### Schema Fields

| Field        | Type      | Required | Default | Description                        |
|--------------|-----------|----------|---------|------------------------------------|
| documentId   | string    | Yes      | -       | Unique identifier for the document |
| companyId    | string    | Yes      | -       | Associated company ID              |
| name         | string    | Yes      | -       | Document name                      |
| type         | string    | Yes      | -       | Document type                      |
| fileKey      | string    | Yes      | -       | S3/storage file key                |
| contentType  | string    | No       | null    | MIME type                          |
| sizeBytes    | number    | No       | null    | File size in bytes                 |
| metadata     | json      | No       | {}      | Additional document metadata       |
| uploadedBy   | string    | Yes      | -       | User ID who uploaded               |
| createdAt    | timestamp | Auto     | Now     | Timestamp when created             |
| updatedAt    | timestamp | Auto     | Now     | Timestamp when last updated        |

### Vector Embeddings

Documents can have associated vector embeddings stored in ZeroDB's vector storage for semantic search capabilities:

```javascript
// Store document embedding for semantic search
await zerodbService.upsertVector(
  embedding,           // Array of floats
  'documents',         // Namespace
  { documentId, type }, // Metadata
  documentContent,     // Original text
  'opencap-documents'  // Source
);

// Search for similar documents
const results = await zerodbService.searchVectors(
  queryEmbedding,
  10,          // Limit
  'documents'  // Namespace
);
```

---

## Financial Report Model

The Financial Report model represents financial reports generated within the OpenCap platform.

### ZeroDB Table: `financial_reports`

### Schema Fields

| Field        | Type      | Required | Default | Description                        |
|--------------|-----------|----------|---------|------------------------------------|
| reportId     | string    | Yes      | -       | Unique identifier for the report   |
| companyId    | string    | Yes      | -       | Associated company ID              |
| type         | string    | Yes      | -       | Report type (quarterly, annual)    |
| period       | string    | Yes      | -       | Reporting period                   |
| data         | json      | Yes      | -       | Report data                        |
| status       | string    | No       | 'draft' | Report status                      |
| generatedBy  | string    | Yes      | -       | User ID who generated              |
| createdAt    | timestamp | Auto     | Now     | Timestamp when created             |
| updatedAt    | timestamp | Auto     | Now     | Timestamp when last updated        |

---

## Stakeholder Model

The Stakeholder model represents shareholders and investors.

### ZeroDB Table: `stakeholders`

### Schema Fields

| Field          | Type      | Required | Default | Description                         |
|----------------|-----------|----------|---------|-------------------------------------|
| stakeholderId  | string    | Yes      | -       | Unique identifier for stakeholder   |
| companyId      | string    | Yes      | -       | Associated company ID               |
| userId         | string    | No       | null    | Associated user ID (if registered)  |
| name           | string    | Yes      | -       | Stakeholder name                    |
| email          | string    | Yes      | -       | Contact email                       |
| type           | string    | Yes      | -       | Stakeholder type (investor, founder)|
| shares         | json      | No       | []      | Share holdings                      |
| vestingSchedule| json      | No       | null    | Vesting schedule details            |
| createdAt      | timestamp | Auto     | Now     | Timestamp when created              |
| updatedAt      | timestamp | Auto     | Now     | Timestamp when last updated         |

---

## Type Mapping Reference

When migrating from other databases to ZeroDB, use this type mapping:

| Source Type (e.g., Mongoose) | ZeroDB Type |
|------------------------------|-------------|
| String                       | string      |
| Number                       | number      |
| Boolean                      | boolean     |
| Date                         | timestamp   |
| ObjectId                     | string (UUID)|
| Array                        | json        |
| Mixed/Object                 | json        |
| Buffer                       | blob        |

---

## Related Documentation

- [ZeroDB API Reference](./zerodb/API_REFERENCE.md)
- [ZeroDB Migration Guide](./zerodb/MIGRATION_GUIDE.md)
- [API Documentation](./API_Documentation_Sprint1.md)

---

**Document Version**: 2.0
**Last Updated**: 2026-02-02
**Database**: ZeroDB (via AINative Studio)
