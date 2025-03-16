# OpenCap Data Infrastructure
# AI Flow Pipeline Models

**Version**: 1.0  
**Date**: March 15, 2025  
**Author**: Senior Development Team  
**Status**: Draft - For CTO Review  

## AI Flow Pipeline Architecture

This document specifies the data models for the custom AI Flow pipeline system within the OpenCap Advanced Data Infrastructure. The AI Flow system provides a flexible, configurable framework for defining, executing, and monitoring AI/ML workflows.

### 1. Core Concepts

The AI Flow pipeline system is built around these key concepts:

1. **Pipeline**: A directed acyclic graph (DAG) of operations to be performed
2. **Node**: An individual processing step within a pipeline
3. **Connector**: Defines how data flows between nodes
4. **Trigger**: Event that initiates pipeline execution
5. **Context**: Execution environment and runtime variables

### 2. Pipeline Definition Schema

#### 2.1 Pipeline Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AI Flow Pipeline Definition",
  "type": "object",
  "required": ["pipelineId", "name", "version", "nodes", "connections"],
  "properties": {
    "pipelineId": {
      "type": "string",
      "description": "Unique identifier for the pipeline"
    },
    "name": {
      "type": "string",
      "description": "Human-readable name for the pipeline"
    },
    "version": {
      "type": "string",
      "description": "Version of the pipeline definition"
    },
    "description": {
      "type": "string",
      "description": "Detailed description of the pipeline purpose"
    },
    "owner": {
      "type": "string",
      "description": "User or service that owns this pipeline"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Tags for categorizing the pipeline"
    },
    "nodes": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/Node"
      },
      "description": "Processing nodes in the pipeline"
    },
    "connections": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/Connection"
      },
      "description": "Connections between nodes defining the flow"
    },
    "triggers": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/Trigger"
      },
      "description": "Events that can trigger pipeline execution"
    },
    "environment": {
      "type": "object",
      "description": "Environment variables and configuration",
      "additionalProperties": true
    },
    "timeout": {
      "type": "integer",
      "description": "Maximum execution time in seconds"
    },
    "retryPolicy": {
      "$ref": "#/definitions/RetryPolicy",
      "description": "Policy for handling retries on failure"
    },
    "monitoring": {
      "$ref": "#/definitions/Monitoring",
      "description": "Monitoring configuration for the pipeline"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the pipeline was created"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "When the pipeline was last updated"
    }
  },
  "definitions": {
    "Node": {
      "type": "object",
      "required": ["nodeId", "type", "config"],
      "properties": {
        "nodeId": {
          "type": "string",
          "description": "Unique identifier for this node within the pipeline"
        },
        "name": {
          "type": "string",
          "description": "Human-readable name"
        },
        "type": {
          "type": "string",
          "description": "The type of node (determines behavior)"
        },
        "config": {
          "type": "object",
          "description": "Node-specific configuration",
          "additionalProperties": true
        },
        "retryPolicy": {
          "$ref": "#/definitions/RetryPolicy",
          "description": "Node-specific retry policy"
        },
        "timeout": {
          "type": "integer",
          "description": "Node-specific timeout in seconds"
        },
        "condition": {
          "type": "string",
          "description": "Condition expression to determine if node should execute"
        },
        "position": {
          "type": "object",
          "properties": {
            "x": {"type": "number"},
            "y": {"type": "number"}
          },
          "description": "Visual position in pipeline editor"
        }
      }
    },
    "Connection": {
      "type": "object",
      "required": ["sourceNodeId", "targetNodeId"],
      "properties": {
        "sourceNodeId": {
          "type": "string",
          "description": "Source node identifier"
        },
        "targetNodeId": {
          "type": "string",
          "description": "Target node identifier"
        },
        "sourceOutput": {
          "type": "string",
          "description": "Specific output port from source node"
        },
        "targetInput": {
          "type": "string",
          "description": "Specific input port on target node"
        },
        "transformation": {
          "type": "string",
          "description": "Optional transformation to apply to data on this connection"
        },
        "condition": {
          "type": "string",
          "description": "Condition determining if data flows through this connection"
        }
      }
    },
    "Trigger": {
      "type": "object",
      "required": ["triggerId", "type", "config"],
      "properties": {
        "triggerId": {
          "type": "string",
          "description": "Unique identifier for this trigger"
        },
        "name": {
          "type": "string",
          "description": "Human-readable name"
        },
        "type": {
          "type": "string",
          "enum": ["schedule", "event", "api", "data", "manual"],
          "description": "Type of trigger"
        },
        "config": {
          "type": "object",
          "description": "Trigger-specific configuration",
          "additionalProperties": true
        },
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Whether this trigger is enabled"
        }
      }
    },
    "RetryPolicy": {
      "type": "object",
      "properties": {
        "maxRetries": {
          "type": "integer",
          "description": "Maximum number of retry attempts"
        },
        "initialDelay": {
          "type": "integer",
          "description": "Initial delay before first retry in seconds"
        },
        "maxDelay": {
          "type": "integer",
          "description": "Maximum delay between retries in seconds"
        },
        "backoffFactor": {
          "type": "number",
          "description": "Multiplier for exponential backoff"
        },
        "retryableErrors": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "List of error types that should trigger retry"
        }
      }
    },
    "Monitoring": {
      "type": "object",
      "properties": {
        "metrics": {
          "type": "array",
          "items": {
            "type": "string"
          },
          "description": "Metrics to collect during execution"
        },
        "logLevel": {
          "type": "string",
          "enum": ["debug", "info", "warn", "error"],
          "description": "Log level for pipeline execution"
        },
        "alerting": {
          "type": "object",
          "properties": {
            "onFailure": {
              "type": "boolean",
              "description": "Send alerts on pipeline failure"
            },
            "onSuccess": {
              "type": "boolean",
              "description": "Send alerts on pipeline success"
            },
            "onTimeout": {
              "type": "boolean",
              "description": "Send alerts on pipeline timeout"
            },
            "recipients": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "Alert recipients"
            }
          }
        }
      }
    }
  }
}
```

### 3. Node Types

The AI Flow system supports a variety of node types for different processing needs:

#### 3.1 Data Ingestion Nodes

| Node Type | Description | Configuration Properties |
|-----------|-------------|--------------------------|
| `document_loader` | Loads documents from MinIO | `bucket`, `prefix`, `fileTypes`, `recursive`, `batchSize` |
| `database_reader` | Reads data from database | `connectionString`, `query`, `parameters`, `limit` |
| `api_consumer` | Fetches data from APIs | `url`, `method`, `headers`, `authentication`, `parameters` |
| `event_listener` | Listens for events | `eventSource`, `eventTypes`, `filters` |
| `file_watcher` | Monitors file system changes | `directory`, `patterns`, `recursive`, `pollInterval` |

#### 3.2 Processing Nodes

| Node Type | Description | Configuration Properties |
|-----------|-------------|--------------------------|
| `text_extractor` | Extracts text from documents | `extractionMethod`, `languages`, `ocrEnabled`, `outputFormat` |
| `text_splitter` | Splits text into chunks | `chunkSize`, `overlap`, `splitBy` |
| `entity_extractor` | Extracts named entities | `entityTypes`, `model`, `confidence` |
| `classifier` | Classifies content | `model`, `categories`, `threshold`, `multiLabel` |
| `embedding_generator` | Generates embeddings | `model`, `dimensions`, `batchSize`, `useGPU` |
| `transformer` | Applies data transformations | `transformations`, `schema`, `validationRules` |
| `aggregator` | Aggregates data | `groupBy`, `aggregations`, `windowSize` |
| `filter` | Filters data based on criteria | `conditions`, `operator` |
| `join` | Joins multiple data streams | `joinType`, `keys`, `conflictResolution` |

#### 3.3. Machine Learning Nodes

| Node Type | Description | Configuration Properties |
|-----------|-------------|--------------------------|
| `model_trainer` | Trains ML models | `algorithm`, `hyperparameters`, `validationStrategy`, `outputModel` |
| `model_predictor` | Makes predictions using models | `modelId`, `inputFields`, `outputFields`, `batchSize` |
| `model_evaluator` | Evaluates model performance | `metrics`, `testDataset`, `outputReport` |
| `vector_search` | Performs vector similarity search | `index`, `query`, `k`, `filters`, `metric` |
| `anomaly_detector` | Detects anomalies in data | `algorithm`, `sensitivityLevel`, `features` |

#### 3.4 Output Nodes

| Node Type | Description | Configuration Properties |
|-----------|-------------|--------------------------|
| `database_writer` | Writes data to database | `connectionString`, `table`, `mode`, `batchSize` |
| `file_writer` | Writes data to files | `bucket`, `path`, `format`, `compression`, `partitioning` |
| `api_publisher` | Sends data to external API | `url`, `method`, `headers`, `authentication`, `batchSize` |
| `notification_sender` | Sends notifications | `channels`, `template`, `recipients`, `importance` |
| `cache_writer` | Caches results | `key`, `ttl`, `serializationFormat` |

### 4. Trigger Types

#### 4.1 Schedule Trigger

```json
{
  "triggerId": "daily-processing",
  "type": "schedule",
  "name": "Daily Processing",
  "config": {
    "schedule": "0 0 * * *",
    "timezone": "UTC"
  }
}
```

#### 4.2 Event Trigger

```json
{
  "triggerId": "new-document-trigger",
  "type": "event",
  "name": "New Document Uploaded",
  "config": {
    "eventSource": "minio",
    "eventTypes": ["s3:ObjectCreated:*"],
    "bucket": "documents-current",
    "prefix": "org-*/",
    "suffix": ".pdf"
  }
}
```

#### 4.3 API Trigger

```json
{
  "triggerId": "api-trigger",
  "type": "api",
  "name": "On-Demand Processing",
  "config": {
    "endpoint": "/api/v1/pipelines/{pipelineId}/execute",
    "method": "POST",
    "authentication": "jwt",
    "rateLimit": {
      "limit": 100,
      "window": "1h"
    }
  }
}
```

### 5. MongoDB Schema for AI Flow

#### 5.1 Pipeline Definition Collection

```javascript
const PipelineDefinitionSchema = new Schema({
  pipelineId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  version: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  owner: {
    type: String,
    required: true,
    index: true
  },
  tags: [{
    type: String,
    index: true
  }],
  definition: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'deprecated', 'archived'],
    default: 'draft',
    index: true
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

// Compound index for name + version
PipelineDefinitionSchema.index({ name: 1, version: 1 }, { unique: true });
```

#### 5.2 Pipeline Execution Collection

```javascript
const PipelineExecutionSchema = new Schema({
  executionId: {
    type: String,
    required: true,
    unique: true
  },
  pipelineId: {
    type: String,
    required: true,
    index: true
  },
  pipelineVersion: {
    type: String,
    required: true
  },
  triggerId: {
    type: String,
    index: true
  },
  triggerType: {
    type: String,
    enum: ['schedule', 'event', 'api', 'data', 'manual'],
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'succeeded', 'failed', 'cancelled', 'timeout'],
    default: 'pending',
    index: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number
  },
  input: {
    type: Object
  },
  output: {
    type: Object
  },
  error: {
    message: String,
    stack: String,
    code: String
  },
  metrics: {
    type: Object
  },
  nodeExecutions: [{
    nodeId: String,
    status: {
      type: String,
      enum: ['pending', 'running', 'succeeded', 'failed', 'skipped', 'cancelled']
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    input: Object,
    output: Object,
    error: {
      message: String,
      stack: String,
      code: String
    },
    metrics: Object,
    retries: Number
  }],
  createdBy: {
    type: String,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for common queries
PipelineExecutionSchema.index({ pipelineId: 1, status: 1, createdAt: -1 });
PipelineExecutionSchema.index({ createdBy: 1, createdAt: -1 });
```

### 6. Example AI Flow Pipeline

#### 6.1 Document Processing Pipeline

```json
{
  "pipelineId": "doc-processing-pipeline-001",
  "name": "Document Processing Pipeline",
  "version": "1.0.0",
  "description": "Processes documents from MinIO, extracts text, generates embeddings, and stores in MongoDB",
  "owner": "ai-team",
  "tags": ["document", "embedding", "nlp"],
  
  "nodes": [
    {
      "nodeId": "document-loader",
      "name": "Document Loader",
      "type": "document_loader",
      "config": {
        "bucket": "documents-current",
        "prefix": "org-${organizationId}/",
        "fileTypes": ["pdf", "docx", "txt"],
        "recursive": true,
        "batchSize": 10
      }
    },
    {
      "nodeId": "text-extractor",
      "name": "Text Extraction",
      "type": "text_extractor",
      "config": {
        "extractionMethod": "pdftotext",
        "languages": ["en"],
        "ocrEnabled": true,
        "outputFormat": "text"
      }
    },
    {
      "nodeId": "text-splitter",
      "name": "Text Splitting",
      "type": "text_splitter",
      "config": {
        "chunkSize": 1000,
        "overlap": 200,
        "splitBy": "paragraph"
      }
    },
    {
      "nodeId": "embedding-generator",
      "name": "Embedding Generation",
      "type": "embedding_generator",
      "config": {
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "dimensions": 384,
        "batchSize": 32,
        "useGPU": true
      }
    },
    {
      "nodeId": "metadata-extractor",
      "name": "Metadata Extraction",
      "type": "entity_extractor",
      "config": {
        "entityTypes": ["person", "organization", "date", "location"],
        "model": "en_core_web_lg",
        "confidence": 0.7
      }
    },
    {
      "nodeId": "document-classifier",
      "name": "Document Classification",
      "type": "classifier",
      "config": {
        "model": "document-classifier-v1",
        "categories": ["contract", "invoice", "report", "correspondence"],
        "threshold": 0.6,
        "multiLabel": false
      }
    },
    {
      "nodeId": "database-writer",
      "name": "MongoDB Writer",
      "type": "database_writer",
      "config": {
        "connectionString": "${MONGODB_URI}",
        "database": "opencap",
        "collection": "documentEmbeddings",
        "mode": "upsert",
        "uniqueKey": ["documentId", "chunkId"]
      }
    },
    {
      "nodeId": "graph-updater",
      "name": "Neo4j Graph Updater",
      "type": "database_writer",
      "config": {
        "connectionString": "${NEO4J_URI}",
        "query": "MERGE (d:Document {id: $documentId}) SET d.title = $title, d.type = $documentType, d.status = $status, d.updatedAt = datetime() WITH d MERGE (o:Organization {id: $organizationId}) MERGE (o)-[:OWNS]->(d)",
        "batchSize": 10
      }
    },
    {
      "nodeId": "notification-sender",
      "name": "Notification Sender",
      "type": "notification_sender",
      "config": {
        "channels": ["email", "in-app"],
        "template": "document-processed",
        "recipients": ["${ownerEmail}", "${adminEmail}"],
        "importance": "normal"
      }
    }
  ],
  
  "connections": [
    {
      "sourceNodeId": "document-loader",
      "targetNodeId": "text-extractor"
    },
    {
      "sourceNodeId": "text-extractor",
      "targetNodeId": "text-splitter"
    },
    {
      "sourceNodeId": "text-splitter",
      "targetNodeId": "embedding-generator"
    },
    {
      "sourceNodeId": "text-extractor",
      "targetNodeId": "metadata-extractor"
    },
    {
      "sourceNodeId": "text-extractor",
      "targetNodeId": "document-classifier"
    },
    {
      "sourceNodeId": "embedding-generator",
      "targetNodeId": "database-writer"
    },
    {
      "sourceNodeId": "metadata-extractor",
      "targetNodeId": "database-writer"
    },
    {
      "sourceNodeId": "document-classifier",
      "targetNodeId": "database-writer"
    },
    {
      "sourceNodeId": "metadata-extractor",
      "targetNodeId": "graph-updater"
    },
    {
      "sourceNodeId": "document-classifier",
      "targetNodeId": "graph-updater"
    },
    {
      "sourceNodeId": "database-writer",
      "targetNodeId": "notification-sender"
    }
  ],
  
  "triggers": [
    {
      "triggerId": "document-upload-trigger",
      "type": "event",
      "name": "New Document Uploaded",
      "config": {
        "eventSource": "minio",
        "eventTypes": ["s3:ObjectCreated:*"],
        "bucket": "documents-current",
        "prefix": "org-*/",
        "suffix": ".pdf"
      }
    },
    {
      "triggerId": "scheduled-processing",
      "type": "schedule",
      "name": "Daily Reprocessing",
      "config": {
        "schedule": "0 2 * * *",
        "timezone": "UTC"
      }
    },
    {
      "triggerId": "manual-trigger",
      "type": "api",
      "name": "Manual Processing",
      "config": {
        "endpoint": "/api/v1/pipelines/doc-processing/execute",
        "method": "POST",
        "authentication": "jwt"
      }
    }
  ],
  
  "environment": {
    "MONGODB_URI": "${env.MONGODB_URI}",
    "NEO4J_URI": "${env.NEO4J_URI}",
    "MODEL_PATH": "models-registry/document-classifier/v1"
  },
  
  "timeout": 3600,
  
  "retryPolicy": {
    "maxRetries": 3,
    "initialDelay": 10,
    "maxDelay": 300,
    "backoffFactor": 2,
    "retryableErrors": ["ConnectionError", "TimeoutError"]
  },
  
  "monitoring": {
    "metrics": ["duration", "documentCount", "errorRate", "processingRate"],
    "logLevel": "info",
    "alerting": {
      "onFailure": true,
      "onSuccess": false,
      "onTimeout": true,
      "recipients": ["ai-team@opencap.org"]
    }
  },
  
  "createdAt": "2025-02-15T10:00:00Z",
  "updatedAt": "2025-03-10T14:30:00Z"
}
```

### 7. Integration with Airflow

While the AI Flow system provides its own pipeline definition and execution framework, it integrates with Apache Airflow for scheduling, monitoring, and orchestration of complex workflows. Airflow DAGs are generated from AI Flow pipeline definitions, allowing:

1. Consistent monitoring across all pipelines
2. Integration with existing Airflow deployment
3. Advanced scheduling capabilities
4. Dependency management for complex workflows

Example Airflow DAG generated from an AI Flow pipeline:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from opencap.airflow.operators import AIFlowPipelineOperator

default_args = {
    'owner': 'ai-team',
    'depends_on_past': False,
    'start_date': datetime(2025, 3, 1),
    'email': ['ai-team@opencap.org'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
}

dag = DAG(
    'doc_processing_pipeline_001',
    default_args=default_args,
    description='Document Processing Pipeline',
    schedule_interval='0 2 * * *',
    catchup=False,
    tags=['document', 'embedding', 'nlp'],
)

run_pipeline = AIFlowPipelineOperator(
    task_id='run_doc_processing_pipeline',
    pipeline_id='doc-processing-pipeline-001',
    trigger_id='scheduled-processing',
    input_data={'batchSize': 50},
    dag=dag,
)

notify_completion = PythonOperator(
    task_id='notify_completion',
    python_callable=lambda **context: print("Pipeline execution completed"),
    dag=dag,
)

run_pipeline >> notify_completion
```

### 8. UI Components

The AI Flow system includes UI components for pipeline design, monitoring, and management. These components are built using React and D3.js for the frontend, with the following key features:

1. **Pipeline Designer**: Visual drag-and-drop interface for creating and editing pipelines
2. **Pipeline Monitor**: Real-time monitoring of pipeline executions with detailed status and metrics
3. **Node Library**: Catalog of available node types with documentation and examples
4. **Execution History**: Searchable history of pipeline executions with filtering and sorting
5. **Testing Console**: Interface for testing pipelines with sample data before deployment

### 9. Security Considerations

The AI Flow system implements comprehensive security measures:

1. **Authentication and Authorization**: All pipeline definitions and executions are associated with specific users or service accounts, with role-based access control
2. **Secrets Management**: Sensitive configuration values (API keys, credentials) are stored in a secure vault and injected at runtime
3. **Input Validation**: All inputs are validated against schemas to prevent injection attacks
4. **Access Control**: Fine-grained control over which users can view, edit, execute, or delete pipelines
5. **Audit Logging**: Comprehensive audit trail of all pipeline changes and executions

### 10. Error Handling and Resilience

The AI Flow system is designed for resilience with the following error handling strategies:

1. **Retries**: Configurable retry policies at both pipeline and node levels
2. **Dead Letter Queues**: Failed data is captured for later analysis and reprocessing
3. **Circuit Breakers**: Prevent cascading failures by automatically disabling problematic nodes
4. **Fallbacks**: Define alternative paths for when primary processing fails
5. **Monitoring and Alerting**: Real-time monitoring with automated alerts for failures

---

This document outlines the comprehensive data models for the AI Flow pipeline system within the OpenCap Advanced Data Infrastructure. The models are designed to support flexible, configurable AI workflows while ensuring security, monitoring, and integration with other components of the infrastructure.
