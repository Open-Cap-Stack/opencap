# Document Data Model

## Overview

The Document model provides a comprehensive system for managing all types of documents within the OpenCap platform. This enhanced model supports advanced features including versioning, access control, metadata, relationships, and robust search capabilities.

## Model Schema

The Document schema includes the following key components:

### Document Identification

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | String | UUID-based unique identifier |
| `name` | String | Human-readable document name |

### File Information

| Field | Type | Description |
|-------|------|-------------|
| `originalFilename` | String | Original filename as uploaded |
| `mimeType` | String | MIME type of the document |
| `size` | Number | Size in bytes |
| `storageLocation` | String | Storage provider (local, s3, azure) |
| `storagePath` | String | Path within storage system |

### Document Organization

| Field | Type | Description |
|-------|------|-------------|
| `category` | String | Primary category for organization |
| `tags` | [String] | Array of searchable tags |
| `metadata` | Object | Flexible key-value data about the document |

### Ownership and Access

| Field | Type | Description |
|-------|------|-------------|
| `uploadedBy` | ObjectId | User who uploaded the document |
| `ownerCompany` | ObjectId | Company that owns the document |
| `accessControl` | Object | Defines view/edit/delete/admin permissions |

### Document Status

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Document lifecycle status (draft, active, archived, deleted) |
| `isTemplate` | Boolean | Whether this is a template document |
| `isLocked` | Boolean | Whether document is locked for editing |
| `lockedBy` | ObjectId | User who locked the document |
| `lockedUntil` | Date | When the lock expires |

### Versioning

| Field | Type | Description |
|-------|------|-------------|
| `version` | Number | Current version number |
| `versionHistory` | [Object] | History of previous versions |
| `changedBy` | ObjectId | User who last modified the document |

### Relationships

| Field | Type | Description |
|-------|------|-------------|
| `relationships` | [Object] | Connections to other documents |

## Usage Examples

### Creating a New Document

```javascript
const Document = require('../models/Document');

const newDoc = new Document({
  name: 'Financial Report Q1 2025',
  originalFilename: 'financial_report_q1_2025.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  category: 'financial',
  uploadedBy: userId,
  ownerCompany: companyId,
  status: 'active',
  metadata: {
    year: 2025,
    quarter: 'Q1',
    department: 'Finance'
  }
});

await newDoc.save();
```

### Document Versioning

The Document model automatically handles versioning. When content or metadata changes, it:

1. Increments the version number
2. Stores the previous version in history
3. Tracks who made the change and when

```javascript
// Load existing document
const doc = await Document.findById(documentId);

// Update content (automatically increments version)
doc.content = 'Updated content';
doc.changedBy = currentUserId;
await doc.save();

console.log(doc.version); // Incremented version number
console.log(doc.versionHistory); // Contains previous versions
```

### Access Control

Documents support fine-grained access control:

```javascript
// Define access control when creating a document
const doc = new Document({
  // ... other fields
  accessControl: {
    viewAccess: ['public'], // Anyone can view
    editAccess: [
      { entityType: 'user', entityId: user1.id },
      { entityType: 'team', entityId: team1.id }
    ],
    deleteAccess: [
      { entityType: 'role', entityId: 'admin' }
    ]
  }
});

// Check if a user has specific access
const canEdit = await doc.hasAccess(userId, 'edit', userTeams, userRoles);
```

### Document Relationships

Documents can be related to each other with typed relationships:

```javascript
// Create relationship between documents
const mainDoc = await Document.findById(mainDocId);
mainDoc.relationships.push({
  relatedDocument: appendixDocId,
  relationType: 'has-appendix',
  description: 'Appendix A containing supplementary data'
});
await mainDoc.save();

// Find related documents
const appendices = await Document.findRelatedDocumentsByType(mainDocId, 'has-appendix');
```

### Searching Documents

The Document model provides several search methods:

```javascript
// Search by tags
const taggedDocs = await Document.findByTags(['financial', 'quarterly']);

// Search by category
const legalDocs = await Document.findByCategory('legal');

// Search by metadata
const docs2025 = await Document.findByMetadata({ year: 2025 });

// Full-text search
const searchResults = await Document.search('financial report');
```

## Best Practices

1. **Categories and Tags**: Use consistent naming conventions for organization
2. **Metadata**: Structure metadata fields consistently within categories
3. **Access Control**: Default to more restrictive access when in doubt
4. **Versioning**: Use the built-in versioning rather than creating duplicate documents
5. **Relationships**: Create bidirectional relationships when appropriate

## Limitations

1. The `content` field is suitable for text documents but not for binary content
2. Full-text search requires proper text indexes to be created
3. Document locking is advisory only and should be enforced at the application level
