# OpenCap Data Infrastructure
# MinIO Object Storage Data Models

**Version**: 1.0  
**Date**: March 15, 2025  
**Author**: Senior Development Team  
**Status**: Draft - For CTO Review  

## MinIO Object Storage Models

MinIO provides object storage for documents, media, large datasets, and model artifacts. This document outlines the bucket structure, access patterns, and metadata schemas for MinIO objects within the OpenCap system.

### Bucket Strategy

The MinIO implementation follows a tiered storage approach with specialized buckets for different data types and access patterns:

```
┌─────────────────────────────────────────────┐
│              MINIO STORAGE                  │
├─────────────┬─────────────┬─────────────────┤
│  HOT DATA   │  WARM DATA  │   COLD DATA     │
│ (< 30 days) │ (30-365 days)│ (> 365 days)   │
├─────────────┴─────────────┴─────────────────┤
│             BUCKET CATEGORIES               │
├─────────────┬─────────────┬─────────────────┤
│  DOCUMENTS  │  DATASETS   │  MODEL ARTIFACTS │
├─────────────┼─────────────┼─────────────────┤
│  ANALYTICS  │  BACKUPS    │  TEMPORARY       │
└─────────────┴─────────────┴─────────────────┘
```

### 1. Document Buckets

#### 1.1 Primary Document Buckets

| Bucket Name | Description | Lifecycle Policy | Security | 
|-------------|-------------|------------------|----------|
| `documents-current` | Active documents in use (hot tier) | Move to warm after 30 days of no access | Server-side encryption, versioning enabled |
| `documents-archive` | Historical documents (warm tier) | Move to cold after 365 days of no access | Server-side encryption, versioning enabled |
| `documents-legal-hold` | Documents under legal retention | No automatic expiration | Server-side encryption, immutable objects |

#### 1.2 Document Object Naming Convention

```
documents-{tier}/{organization-id}/{document-type}/{YYYY}/{MM}/{DD}/{document-id}-{version}.{extension}
```

Example: `documents-current/org-12345/contract/2025/03/15/doc-abcde-v2.pdf`

#### 1.3 Document Metadata Schema

```json
{
  "system": {
    "contentType": "application/pdf",
    "contentLength": 1048576,
    "createdAt": "2025-03-15T10:30:00Z",
    "lastModified": "2025-03-15T10:30:00Z",
    "etag": "a1b2c3d4e5f6",
    "version": "v2",
    "checksum": {
      "md5": "d41d8cd98f00b204e9800998ecf8427e",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  },
  "business": {
    "documentId": "doc-abcde",
    "organizationId": "org-12345",
    "documentType": "contract",
    "title": "Service Agreement - ACME Corp",
    "status": "approved",
    "confidentiality": "high",
    "retentionPeriod": "7-years",
    "expirationDate": "2032-03-15",
    "author": "user-12345",
    "tags": ["contract", "service", "approved", "2025"]
  },
  "security": {
    "accessControl": ["org-12345-admin", "org-12345-legal"],
    "encryptionType": "AES-256",
    "classification": "confidential"
  },
  "compliance": {
    "regulatoryFrameworks": ["GDPR", "SOX"],
    "retentionPolicy": "REG-7Y",
    "dataSubjects": ["customers"],
    "personalDataCategories": ["contact_info", "financial"]
  },
  "relationships": [
    {
      "documentId": "doc-fghij",
      "relationshipType": "supersedes"
    },
    {
      "documentId": "doc-klmno",
      "relationshipType": "references"
    }
  ],
  "processing": {
    "ocrStatus": "completed",
    "ocrConfidence": 0.98,
    "extractedTextSize": 15240,
    "entityExtractionStatus": "completed",
    "classificationResults": {
      "documentCategory": "legal",
      "confidence": 0.96
    }
  }
}
```

### 2. Dataset Buckets

#### 2.1 Primary Dataset Buckets

| Bucket Name | Description | Lifecycle Policy | Security |
|-------------|-------------|------------------|----------|
| `datasets-raw` | Original unprocessed datasets | No automatic expiration | Server-side encryption |
| `datasets-processed` | Cleaned and transformed datasets | Delete after 90 days if not referenced | Server-side encryption |
| `datasets-features` | Extracted features for ML | Delete after 90 days if not referenced | Server-side encryption |

#### 2.2 Dataset Object Naming Convention

```
datasets-{type}/{project-id}/{dataset-name}/{version}/{partition}.{format}
```

Example: `datasets-processed/project-abc/customer-transactions/v1/2025-03.parquet`

#### 2.3 Dataset Metadata Schema

```json
{
  "system": {
    "contentType": "application/parquet",
    "contentLength": 104857600,
    "createdAt": "2025-03-15T10:30:00Z",
    "lastModified": "2025-03-15T10:30:00Z",
    "etag": "a1b2c3d4e5f6",
    "version": "v1",
    "format": "parquet",
    "compression": "gzip"
  },
  "dataset": {
    "datasetId": "dataset-12345",
    "projectId": "project-abc",
    "name": "customer-transactions",
    "description": "Processed customer transaction data",
    "version": "v1",
    "partitionKey": "date",
    "timeRange": {
      "start": "2025-03-01",
      "end": "2025-03-31"
    },
    "schema": {
      "fields": [
        {"name": "transaction_id", "type": "string", "nullable": false},
        {"name": "customer_id", "type": "string", "nullable": false},
        {"name": "amount", "type": "double", "nullable": false},
        {"name": "currency", "type": "string", "nullable": false},
        {"name": "timestamp", "type": "timestamp", "nullable": false},
        {"name": "category", "type": "string", "nullable": true},
        {"name": "merchant", "type": "string", "nullable": true}
      ]
    },
    "statistics": {
      "rowCount": 1250000,
      "sizeBytes": 104857600,
      "nullCount": {
        "category": 12500,
        "merchant": 25000
      },
      "minMax": {
        "amount": {"min": 0.01, "max": 25000.00},
        "timestamp": {"min": "2025-03-01T00:00:00Z", "max": "2025-03-31T23:59:59Z"}
      }
    },
    "tags": ["transactions", "customers", "financial", "2025-03"]
  },
  "processing": {
    "sourceDatasetId": "dataset-raw-12345",
    "processingPipeline": "pipeline-abc",
    "processingTimestamp": "2025-03-15T10:15:00Z",
    "transformations": [
      {"type": "filter", "parameters": {"column": "status", "operator": "=", "value": "completed"}},
      {"type": "enrich", "parameters": {"source": "category_lookup"}},
      {"type": "anonymize", "parameters": {"columns": ["customer_name"]}}
    ]
  },
  "security": {
    "accessControl": ["role-data-scientist", "project-abc-members"],
    "encryptionType": "AES-256",
    "classification": "internal"
  },
  "compliance": {
    "dataSource": "transaction-system",
    "piiRemoved": true,
    "anonymizationMethod": "tokenization",
    "retentionPolicy": "DATA-90D"
  },
  "usage": {
    "models": ["model-customer-segmentation-v1", "model-fraud-detection-v2"],
    "analyses": ["analysis-2025-q1-spending-patterns"]
  }
}
```

### 3. Model Artifacts Buckets

#### 3.1 Primary Model Artifacts Buckets

| Bucket Name | Description | Lifecycle Policy | Security |
|-------------|-------------|------------------|----------|
| `models-registry` | Saved model artifacts | Retain current + previous version | Server-side encryption |
| `models-staging` | Models under evaluation | Delete after 30 days if not promoted | Server-side encryption |
| `models-archive` | Historical model versions | Move to cold storage after 180 days | Server-side encryption |

#### 3.2 Model Artifact Object Naming Convention

```
models-{stage}/{model-name}/{version}/{artifact-type}.{extension}
```

Example: `models-registry/customer-churn-predictor/v1.2/model.pkl`

#### 3.3 Model Artifact Metadata Schema

```json
{
  "system": {
    "contentType": "application/octet-stream",
    "contentLength": 52428800,
    "createdAt": "2025-03-15T10:30:00Z",
    "lastModified": "2025-03-15T10:30:00Z",
    "etag": "a1b2c3d4e5f6",
    "version": "v1.2",
    "checksum": {
      "md5": "d41d8cd98f00b204e9800998ecf8427e",
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  },
  "model": {
    "modelId": "model-12345",
    "name": "customer-churn-predictor",
    "version": "v1.2",
    "type": "classification",
    "framework": "scikit-learn",
    "frameworkVersion": "1.3.0",
    "pythonVersion": "3.10.12",
    "algorithm": "RandomForestClassifier",
    "description": "Predicts customer churn probability based on transaction patterns",
    "author": "user-12345",
    "trainingDataset": "dataset-12345",
    "features": [
      "transaction_frequency_30d",
      "average_transaction_value_90d",
      "product_diversity_score",
      "days_since_last_activity",
      "support_contact_count_90d"
    ],
    "target": "churn_next_90d",
    "hyperparameters": {
      "n_estimators": 100,
      "max_depth": 10,
      "min_samples_split": 5,
      "min_samples_leaf": 2,
      "bootstrap": true
    },
    "artifacts": [
      {"name": "model.pkl", "description": "Serialized model", "contentType": "application/octet-stream"},
      {"name": "feature_importance.json", "description": "Feature importance values", "contentType": "application/json"},
      {"name": "preprocessing_pipeline.pkl", "description": "Feature preprocessing pipeline", "contentType": "application/octet-stream"}
    ]
  },
  "performance": {
    "metrics": {
      "accuracy": 0.89,
      "precision": 0.87,
      "recall": 0.92,
      "f1": 0.89,
      "auc": 0.94,
      "confusionMatrix": [
        [950, 50],
        [80, 920]
      ]
    },
    "validationMethod": "5-fold cross-validation",
    "validationDataset": "dataset-validation-12345",
    "trainingTime": 1250,
    "inferenceLatency": {
      "average": 15,
      "p95": 22,
      "p99": 35
    }
  },
  "deployment": {
    "status": "production",
    "deployedAt": "2025-03-15T15:00:00Z",
    "deployedBy": "user-12345",
    "endpoint": "api/v1/models/customer-churn-predictor/predict",
    "monitoringEnabled": true,
    "batchSize": 100,
    "concurrentRequests": 10
  },
  "governance": {
    "approvals": [
      {"approver": "user-23456", "role": "data_science_lead", "timestamp": "2025-03-14T16:30:00Z"},
      {"approver": "user-34567", "role": "compliance_officer", "timestamp": "2025-03-15T09:15:00Z"}
    ],
    "modelCard": "model-cards/customer-churn-predictor-v1.2.md",
    "biasAssessment": "bias-reports/customer-churn-predictor-v1.2.pdf",
    "reviews": [
      {"reviewer": "user-45678", "comments": "Performance improved over v1.1", "rating": 4.5, "timestamp": "2025-03-14T11:20:00Z"}
    ]
  },
  "security": {
    "accessControl": ["role-data-scientist", "role-model-deployer"],
    "encryptionType": "AES-256",
    "classification": "internal"
  }
}
```

### 4. Analytics and Temporary Buckets

#### 4.1 Analytics Buckets

| Bucket Name | Description | Lifecycle Policy | Security |
|-------------|-------------|------------------|----------|
| `analytics-reports` | Generated analytics reports | Move to archive after 90 days | Server-side encryption |
| `analytics-visualizations` | Visualization data and exports | Delete after 30 days | Server-side encryption |
| `analytics-notebooks` | Jupyter notebooks and analysis code | No automatic expiration | Server-side encryption |

#### 4.2 Temporary and Backup Buckets

| Bucket Name | Description | Lifecycle Policy | Security |
|-------------|-------------|------------------|----------|
| `temp-uploads` | Temporary storage for uploads | Delete after 24 hours | Server-side encryption |
| `temp-exports` | Temporary storage for exports | Delete after 7 days | Server-side encryption |
| `backups-daily` | Daily backups of critical data | Retain for 30 days | Server-side encryption |
| `backups-monthly` | Monthly backups of all data | Retain for 1 year | Server-side encryption |

### 5. MinIO Policies and Access Control

#### 5.1 Access Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::documents-current/${aws:username}/*",
        "arn:aws:s3:::temp-uploads/${aws:username}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::models-registry/*"
      ]
    }
  ]
}
```

#### 5.2 Bucket Policy for Compliance

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": [
        "s3:DeleteObject",
        "s3:DeleteObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::documents-legal-hold/*"
      ]
    },
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::account-id:role/compliance-auditor"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::documents-legal-hold",
        "arn:aws:s3:::documents-legal-hold/*"
      ]
    }
  ]
}
```

### 6. Integration with Other Services

#### 6.1 MongoDB Integration

MongoDB stores metadata references to MinIO objects, allowing for quick queries without accessing the objects themselves. The storage field in MongoDB document models contains the MinIO object references:

```javascript
storage: {
  objectId: String,     // MinIO object key
  bucket: String,       // MinIO bucket name
  version: String,      // MinIO object version ID
  size: Number,         // Size in bytes
  mimeType: String,     // MIME type
  checksum: String      // MD5/SHA256 hash
}
```

#### 6.2 Neo4j Integration

Neo4j references MinIO objects through document nodes that include object storage properties:

```cypher
CREATE (d:Document {
  id: 'doc-uuid',
  title: 'Loan Agreement',
  objectId: 'documents-current/org-12345/contract/2025/03/15/doc-abcde-v2.pdf',
  bucket: 'documents-current',
  contentHash: 'sha256-hash'
})
```

#### 6.3 Spark Integration

Apache Spark can directly read and write to MinIO using the S3A connector with configurations:

```properties
spark.hadoop.fs.s3a.endpoint=http://minio:9000
spark.hadoop.fs.s3a.access.key=${MINIO_ACCESS_KEY}
spark.hadoop.fs.s3a.secret.key=${MINIO_SECRET_KEY}
spark.hadoop.fs.s3a.path.style.access=true
spark.hadoop.fs.s3a.impl=org.apache.hadoop.fs.s3a.S3AFileSystem
```

### 7. Document Processing Workflow

The following diagram illustrates the document processing workflow involving MinIO:

```
┌───────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Upload   │     │  Document   │     │   Storage    │     │  Processing │     │   Database   │
│  Client   │────▶│   Service   │────▶│    MinIO     │────▶│   Pipeline  │────▶│   MongoDB    │
└───────────┘     └─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                          │                                        │                   │
                          │                                        │                   │
                          ▼                                        ▼                   ▼
                  ┌─────────────┐                         ┌─────────────┐     ┌──────────────┐
                  │  Metadata   │                         │  Text/Data  │     │    Neo4j     │
                  │ Extraction  │                         │ Extraction  │────▶│   GraphDB    │
                  └─────────────┘                         └─────────────┘     └──────────────┘
                          │                                        │
                          │                                        │
                          ▼                                        ▼
                  ┌─────────────┐                         ┌─────────────┐
                  │    Tags     │                         │ AI Analysis │
                  │ Generation  │                         │   Service   │
                  └─────────────┘                         └─────────────┘
```

### 8. Versioning and Lifecycle Management

For files requiring versioning (such as documents and models), MinIO's object versioning is enabled, allowing:

1. **Point-in-time recovery**: Access to all versions of an object
2. **Audit trails**: Complete history of object modifications
3. **Recovery from unintended deletions**: Deleted objects are marked with a delete marker
4. **Compliance requirements**: Maintaining document history for regulatory compliance

Lifecycle management automatically transitions objects between tiers based on access patterns and retention policies, optimizing storage costs while maintaining compliance with retention requirements.

---

This document outlines the comprehensive data model for MinIO object storage within the OpenCap Advanced Data Infrastructure. The model is designed to support secure document management, dataset storage, model artifact management, and analytics while ensuring compliance with regulatory requirements.
