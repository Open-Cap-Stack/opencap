# OpenCap Data Infrastructure
# Apache Spark Data Processing Models

**Version**: 1.0  
**Date**: March 15, 2025  
**Author**: Senior Development Team  
**Status**: Draft - For CTO Review  

## 1. Overview

This document outlines the data processing models used within the OpenCap Advanced Data Infrastructure, focusing on Apache Spark-based processing pipelines, ETL workflows, and integration with MinIO, MongoDB, and Neo4j.

## 2. Apache Spark Architecture

The OpenCap implementation uses a distributed Spark cluster for scalable data processing:

```
┌───────────────────────────────────────────────────────────────┐
│                     SPARK CLUSTER                             │
├─────────────────┬─────────────────────┬─────────────────────┤
│   DRIVER NODE   │    MASTER NODE      │    WORKER NODES     │
│                 │                     │                     │
│  - Job Control  │  - Resource Mgmt    │  - Task Execution   │
│  - DAG Planning │  - Node Management  │  - Data Processing  │
└─────────────────┴─────────────────────┴─────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                            │
├─────────────────┬─────────────────────┬─────────────────────┤
│      MINIO      │      MONGODB        │       NEO4J         │
│  Object Storage │   Document Store    │    Graph Database   │
└─────────────────┴─────────────────────┴─────────────────────┘
```

## 3. Core Processing Models

### 3.1 Batch Processing Model

Batch processing jobs follow a structured model with defined stages:

```scala
case class BatchProcessConfig(
  jobId: String,
  name: String,
  description: Option[String],
  owner: String,
  schedule: Option[String],
  input: InputConfig,
  transformations: Seq[TransformationConfig],
  output: OutputConfig,
  properties: Map[String, String] = Map.empty
)

case class InputConfig(
  source: String,
  format: String,
  options: Map[String, String] = Map.empty,
  schema: Option[StructType] = None,
  partitionBy: Seq[String] = Seq.empty,
  filter: Option[String] = None
)

case class TransformationConfig(
  id: String,
  transformationType: String,
  params: Map[String, Any] = Map.empty,
  description: Option[String] = None
)

case class OutputConfig(
  destination: String,
  format: String,
  mode: String = "overwrite",
  options: Map[String, String] = Map.empty,
  partitionBy: Seq[String] = Seq.empty
)
```

### 3.2 Streaming Processing Model

For real-time data processing, the following model is implemented:

```scala
case class StreamingProcessConfig(
  streamId: String,
  name: String,
  description: Option[String],
  source: StreamSourceConfig,
  processors: Seq[StreamProcessorConfig],
  sink: StreamSinkConfig,
  checkpointLocation: String,
  triggerInterval: Option[String],
  outputMode: String = "append",
  properties: Map[String, String] = Map.empty
)

case class StreamSourceConfig(
  sourceType: String,
  options: Map[String, String],
  schema: Option[StructType] = None,
  watermarkColumn: Option[String] = None,
  watermarkDelay: Option[String] = None
)

case class StreamProcessorConfig(
  id: String,
  processorType: String,
  params: Map[String, Any] = Map.empty
)

case class StreamSinkConfig(
  sinkType: String,
  options: Map[String, String],
  partitionBy: Seq[String] = Seq.empty
)
```

## 4. Data Schema Management

### 4.1 Schema Registry

The OpenCap infrastructure includes a Schema Registry for managing data schemas:

```json
{
  "schemaId": "transaction-data-v2",
  "namespace": "finance.transactions",
  "description": "Schema for financial transaction data",
  "version": 2,
  "format": "avro",
  "schema": {
    "type": "record",
    "name": "Transaction",
    "fields": [
      {"name": "transaction_id", "type": "string"},
      {"name": "customer_id", "type": "string"},
      {"name": "amount", "type": "double"},
      {"name": "currency", "type": "string"},
      {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
      {"name": "status", "type": "string", "default": "pending"},
      {"name": "category", "type": ["null", "string"], "default": null},
      {"name": "merchant", "type": ["null", "string"], "default": null},
      {"name": "location", "type": ["null", {"type": "record", "name": "Location", 
        "fields": [
          {"name": "latitude", "type": "double"},
          {"name": "longitude", "type": "double"}
        ]}], "default": null}
    ]
  },
  "compatibility": "BACKWARD",
  "created": "2025-01-15T10:30:00Z",
  "updated": "2025-03-01T14:45:00Z",
  "owner": "finance-team"
}
```

### 4.2 Schema Evolution Strategy

| Evolution Type | Strategy | Compatibility |
|----------------|----------|---------------|
| Add Field | Add with default value | BACKWARD |
| Remove Field | Not recommended | FORWARD |
| Rename Field | Two-step: Add + Remove | FULL |
| Change Type | Only widen (int→long) | BACKWARD |
| Add/Modify Constraints | Only loosen | BACKWARD |

## 5. ETL Pipeline Models

### 5.1 Extract Phase Models

Standard extractors interface with various data sources:

```scala
trait DataExtractor[T] {
  def extract(config: ExtractorConfig): Dataset[T]
}

case class ExtractorConfig(
  source: String,
  format: String,
  options: Map[String, String],
  filter: Option[String] = None,
  columns: Option[Seq[String]] = None,
  limit: Option[Int] = None
)
```

### 5.2 Transform Phase Models

Transformations are modeled as composable operations:

```scala
trait DataTransformer[I, O] {
  def transform(input: Dataset[I], config: TransformerConfig): Dataset[O]
}

case class TransformerConfig(
  transformationType: String,
  params: Map[String, Any] = Map.empty,
  validations: Seq[ValidationRule] = Seq.empty
)

case class ValidationRule(
  field: String,
  rule: String,
  level: String = "error",
  message: Option[String] = None
)
```

Common transformations include:

| Transformer | Description | Parameters |
|-------------|-------------|------------|
| CleansingTransformer | Cleans data | `nullReplacement`, `trimStrings` |
| EnrichmentTransformer | Enriches data | `lookupSource`, `lookupKeys` |
| AggregationTransformer | Aggregates data | `groupBy`, `aggregations` |
| JoinTransformer | Joins datasets | `rightDataset`, `joinType`, `joinColumns` |
| FilterTransformer | Filters records | `condition` |
| PivotTransformer | Pivots data | `groupBy`, `pivotColumn`, `values` |
| TypeConversionTransformer | Converts types | `typeMapping` |

### 5.3 Load Phase Models

Data loading is managed through consistent interfaces:

```scala
trait DataLoader {
  def load(data: Dataset[_], config: LoaderConfig): Unit
}

case class LoaderConfig(
  destination: String,
  format: String,
  mode: String = "overwrite",
  options: Map[String, String] = Map.empty,
  partitionBy: Seq[String] = Seq.empty,
  bucketBy: Option[BucketSpec] = None,
  sortBy: Seq[String] = Seq.empty
)

case class BucketSpec(
  numBuckets: Int,
  columns: Seq[String]
)
```

## 6. Common Data Processing Patterns

### 6.1 Document Processing Pipeline

For document analysis and feature extraction:

```
Raw Documents (MinIO)
       ↓
   Text Extraction
       ↓
   Document Chunking
       ↓
   Named Entity Recognition
       ↓
   Feature Extraction
       ↓
   Embedding Generation
       ↓
   Metadata Enrichment
       ↓
Store Results (MongoDB + Neo4j)
```

### 6.2 Transaction Analysis Pipeline

For financial transaction processing and analysis:

```
Transaction Stream
       ↓
   Schema Validation
       ↓
   Enrichment (Customer/Merchant)
       ↓
   Anomaly Detection
       ↓
   Categorization
       ↓
   Aggregation (by time/merchant)
       ↓
   Risk Scoring
       ↓
Store Results (PostgreSQL + MongoDB)
```

## 7. Data Quality Framework

### 7.1 Data Quality Rules

Rules are defined in a structured format:

```json
{
  "ruleId": "transaction-amount-rule",
  "description": "Validate transaction amounts are positive",
  "datasetId": "financial-transactions",
  "column": "amount",
  "rule": "value > 0",
  "severity": "error",
  "threshold": 0.99,
  "action": "drop",
  "notification": ["data-quality-team@opencap.org"]
}
```

### 7.2 Quality Monitoring Model

```scala
case class DataQualityReport(
  reportId: String,
  jobId: String,
  timestamp: java.time.Instant,
  datasetId: String,
  recordCount: Long,
  byteCount: Long,
  schemaValidation: SchemaValidationResult,
  columnStatistics: Map[String, ColumnStatistics],
  ruleResults: Seq[RuleExecutionResult],
  overallQualityScore: Double
)

case class SchemaValidationResult(
  valid: Boolean,
  errors: Seq[SchemaValidationError],
  conformanceRate: Double
)

case class ColumnStatistics(
  distinctCount: Long,
  nullCount: Long,
  min: Option[String],
  max: Option[String],
  mean: Option[Double],
  stdDev: Option[Double],
  uniqueRate: Double,
  completenessRate: Double,
  topValues: Seq[(String, Long)]
)

case class RuleExecutionResult(
  ruleId: String,
  passed: Boolean,
  failedRecords: Long,
  passRate: Double,
  details: Option[String]
)
```

## 8. Spark-Neo4j Integration

### 8.1 Graph ETL Model

```scala
case class GraphETLConfig(
  jobId: String,
  description: String,
  source: DataSourceConfig,
  graphMapping: GraphMappingConfig,
  neo4jConfig: Neo4jConfig,
  options: Map[String, String] = Map.empty
)

case class GraphMappingConfig(
  nodes: Seq[NodeMapping],
  relationships: Seq[RelationshipMapping]
)

case class NodeMapping(
  label: String,
  sourceDataframe: String,
  properties: Map[String, String],
  keyColumns: Seq[String]
)

case class RelationshipMapping(
  type: String,
  sourceDataframe: String,
  sourceNode: NodeReference,
  targetNode: NodeReference,
  properties: Map[String, String] = Map.empty
)

case class NodeReference(
  label: String,
  keyColumns: Map[String, String]
)
```

### 8.2 Example Graph ETL Configuration

```json
{
  "jobId": "customer-transaction-graph",
  "description": "Load customer transactions into Neo4j graph",
  "source": {
    "format": "parquet",
    "path": "s3a://datasets-processed/transactions/",
    "options": {
      "mergeSchema": "true"
    }
  },
  "graphMapping": {
    "nodes": [
      {
        "label": "Customer",
        "sourceDataframe": "customers",
        "properties": {
          "id": "customer_id",
          "name": "customer_name",
          "email": "email",
          "segment": "segment",
          "createdAt": "created_at"
        },
        "keyColumns": ["customer_id"]
      },
      {
        "label": "Merchant",
        "sourceDataframe": "transactions",
        "properties": {
          "id": "merchant_id",
          "name": "merchant_name",
          "category": "merchant_category",
          "location": "merchant_location"
        },
        "keyColumns": ["merchant_id"]
      }
    ],
    "relationships": [
      {
        "type": "TRANSACTED_WITH",
        "sourceDataframe": "transactions",
        "sourceNode": {
          "label": "Customer",
          "keyColumns": {"customer_id": "customer_id"}
        },
        "targetNode": {
          "label": "Merchant",
          "keyColumns": {"merchant_id": "merchant_id"}
        },
        "properties": {
          "amount": "amount",
          "currency": "currency",
          "timestamp": "transaction_time",
          "transactionId": "transaction_id"
        }
      }
    ]
  },
  "neo4jConfig": {
    "url": "bolt://neo4j:7687",
    "database": "opencap",
    "batchSize": 1000
  }
}
```

## 9. Performance Optimization

### 9.1 Data Partitioning Strategies

| Data Type | Partition Key | Pattern | Bucket Count |
|-----------|---------------|---------|--------------|
| Transaction | date, org_id | date=YYYY-MM/org=* | 100 buckets |
| Document | org_id, doc_type | org=*/type=* | 50 buckets |
| User Activity | date, user_id | date=YYYY-MM-DD | 200 buckets |
| Analytics | date, metric | date=YYYY-MM/metric=* | 100 buckets |

### 9.2 Caching Strategy

```scala
case class CachingStrategy(
  datasetId: String,
  storageLevel: StorageLevel,
  ttl: Option[Duration],
  repartition: Option[RepartitionSpec],
  priority: Int = 5,
  precompute: Boolean = false
)

case class RepartitionSpec(
  numPartitions: Option[Int] = None,
  partitionExpression: Option[String] = None
)
```

### 9.3 Resource Allocation Model

```json
{
  "jobId": "transaction-analytics-daily",
  "resourceProfile": {
    "executorInstances": 5,
    "executorCores": 4,
    "executorMemory": "16g",
    "driverMemory": "8g",
    "shuffleMemoryFraction": 0.2,
    "storageFraction": 0.6,
    "offHeapSize": "4g",
    "dynamicAllocation": {
      "enabled": true,
      "minExecutors": 2,
      "maxExecutors": 10,
      "initialExecutors": 5
    }
  },
  "priorityClass": "medium",
  "queue": "analytics",
  "timeout": "2h"
}
```

## 10. Integration with Airflow

Apache Airflow orchestrates Spark jobs using DAGs with the following model:

```python
spark_job_operator = SparkSubmitOperator(
    task_id='process_transactions',
    application='${SPARK_HOME}/jobs/transaction_processing.py',
    name='transaction-daily-processing',
    conn_id='spark_default',
    conf={
        'spark.driver.memory': '4g',
        'spark.executor.memory': '2g',
        'spark.executor.cores': '2',
        'spark.dynamicAllocation.enabled': 'true',
        'spark.shuffle.service.enabled': 'true'
    },
    application_args=[
        '--date', '{{ ds }}',
        '--input', 's3a://datasets-raw/transactions/{{ ds[:4] }}/{{ ds[5:7] }}/{{ ds[8:] }}',
        '--output', 's3a://datasets-processed/transactions/{{ ds }}',
        '--config', '/configs/transaction_config.json'
    ],
    dag=dag
)
```

## 11. Security Considerations

The data processing framework implements security measures:

1. **Data Encryption**: All data in motion and at rest is encrypted
2. **Access Control**: Fine-grained access controls for datasets and jobs
3. **Data Masking**: Sensitive data is automatically masked based on column tags
4. **Audit Logging**: All data access is logged for compliance
5. **Data Lineage**: Full tracking of data transformations for regulatory needs

---

This document outlines the key aspects of the data processing models used within the OpenCap Data Infrastructure. The models are designed to integrate with the other components of the infrastructure, including MinIO for object storage, MongoDB for document storage, Neo4j for graph data, and the custom AI Flow system for AI pipelines.
