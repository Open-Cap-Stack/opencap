# Custom Report Builder API Documentation

## Overview

The Custom Report Builder Engine provides a flexible, user-defined reporting system with dynamic query building, aggregations, filtering, and scheduling capabilities. It integrates with ZeroDB for scalable data storage and supports multiple data sources.

**Issue**: #197 - Build Custom Report Builder Engine

---

## Base URL

```
/api/v1/reports/custom
```

---

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Create Custom Report

**POST** `/api/v1/reports/custom`

Creates a new custom report with specified fields, filters, and aggregations.

#### Request Body

```json
{
  "name": "Monthly Revenue Report",
  "description": "Track monthly revenue by stakeholder",
  "dataSources": ["transactions"],
  "fields": ["stakeholder_id", "transaction_date", "amount"],
  "filters": [
    {
      "field": "transaction_date",
      "operator": "greater_than_or_equal",
      "value": "2024-01-01",
      "dataType": "date",
      "logicalOperator": "AND"
    }
  ],
  "groupBy": ["stakeholder_id"],
  "aggregations": [
    {
      "field": "amount",
      "function": "SUM",
      "alias": "total_revenue"
    },
    {
      "field": "amount",
      "function": "AVG",
      "alias": "avg_transaction"
    }
  ],
  "sortBy": {
    "field": "total_revenue",
    "order": "DESC"
  },
  "limit": 100,
  "isPublic": false,
  "sharedWith": ["user-002", "user-003"],
  "schedule": {
    "enabled": true,
    "frequency": "monthly",
    "recipients": ["admin@company.com"]
  }
}
```

#### Response (201 Created)

```json
{
  "reportId": "report-12345",
  "name": "Monthly Revenue Report",
  "description": "Track monthly revenue by stakeholder",
  "companyId": "company-001",
  "createdBy": "user-001",
  "dataSources": ["transactions"],
  "fields": ["stakeholder_id", "transaction_date", "amount"],
  "filters": [...],
  "groupBy": ["stakeholder_id"],
  "aggregations": [...],
  "sortBy": {...},
  "limit": 100,
  "isPublic": false,
  "sharedWith": ["user-002", "user-003"],
  "schedule": {...},
  "status": "draft",
  "executionCount": 0,
  "createdAt": "2024-02-03T10:00:00Z",
  "updatedAt": "2024-02-03T10:00:00Z"
}
```

---

### 2. Get Custom Report

**GET** `/api/v1/reports/custom/:id`

Retrieves a specific custom report by ID.

#### Path Parameters

- `id` (required): Report ID

#### Response (200 OK)

```json
{
  "reportId": "report-12345",
  "name": "Monthly Revenue Report",
  "description": "Track monthly revenue by stakeholder",
  "companyId": "company-001",
  "createdBy": "user-001",
  "dataSources": ["transactions"],
  "fields": ["stakeholder_id", "transaction_date", "amount"],
  "filters": [...],
  "groupBy": ["stakeholder_id"],
  "aggregations": [...],
  "sortBy": {...},
  "limit": 100,
  "isPublic": false,
  "sharedWith": ["user-002", "user-003"],
  "schedule": {...},
  "status": "active",
  "executionCount": 15,
  "lastExecutedAt": "2024-02-03T09:00:00Z",
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-02-03T10:00:00Z"
}
```

---

### 3. List Custom Reports

**GET** `/api/v1/reports/custom`

Lists all custom reports accessible to the user.

#### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10, max: 100)
- `status` (optional): Filter by status (`active`, `archived`, `draft`)
- `companyId` (optional): Filter by company

#### Response (200 OK)

```json
{
  "reports": [
    {
      "reportId": "report-12345",
      "name": "Monthly Revenue Report",
      "description": "Track monthly revenue by stakeholder",
      "status": "active",
      "executionCount": 15,
      "lastExecutedAt": "2024-02-03T09:00:00Z",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "reportId": "report-67890",
      "name": "Stakeholder Activity",
      "description": "Track stakeholder engagement",
      "status": "active",
      "executionCount": 42,
      "lastExecutedAt": "2024-02-03T08:30:00Z",
      "createdAt": "2024-01-15T14:00:00Z"
    }
  ],
  "totalCount": 25,
  "currentPage": 1,
  "totalPages": 3,
  "limit": 10
}
```

---

### 4. Update Custom Report

**PUT** `/api/v1/reports/custom/:id`

Updates an existing custom report. Only the creator or admin can update.

#### Path Parameters

- `id` (required): Report ID

#### Request Body

```json
{
  "name": "Updated Monthly Revenue Report",
  "description": "Updated description",
  "fields": ["stakeholder_id", "transaction_date", "amount", "category"],
  "status": "active"
}
```

#### Response (200 OK)

```json
{
  "reportId": "report-12345",
  "name": "Updated Monthly Revenue Report",
  "description": "Updated description",
  "fields": ["stakeholder_id", "transaction_date", "amount", "category"],
  "status": "active",
  "updatedAt": "2024-02-03T10:30:00Z"
}
```

---

### 5. Delete Custom Report

**DELETE** `/api/v1/reports/custom/:id`

Deletes a custom report. Only the creator or admin can delete.

#### Path Parameters

- `id` (required): Report ID

#### Response (200 OK)

```json
{
  "message": "Report deleted successfully"
}
```

---

### 6. Execute Custom Report

**POST** `/api/v1/reports/custom/:id/execute`

Executes a custom report and returns the results.

#### Path Parameters

- `id` (required): Report ID

#### Response (200 OK)

```json
{
  "reportId": "report-12345",
  "reportName": "Monthly Revenue Report",
  "executedAt": "2024-02-03T10:45:00Z",
  "rowCount": 15,
  "data": [
    {
      "stakeholder_id": "stake-001",
      "total_revenue": 125000.50,
      "avg_transaction": 8333.37
    },
    {
      "stakeholder_id": "stake-002",
      "total_revenue": 98500.00,
      "avg_transaction": 7500.00
    }
  ]
}
```

---

### 7. Get Data Sources

**GET** `/api/v1/reports/custom/data-sources`

Retrieves available data sources for report building.

#### Response (200 OK)

```json
{
  "dataSources": [
    {
      "name": "stakeholders",
      "displayName": "Stakeholders",
      "recordCount": 1523
    },
    {
      "name": "transactions",
      "displayName": "Transactions",
      "recordCount": 45821
    },
    {
      "name": "equity_grants",
      "displayName": "Equity Grants",
      "recordCount": 892
    },
    {
      "name": "financial_reports",
      "displayName": "Financial Reports",
      "recordCount": 156
    }
  ]
}
```

---

### 8. Get Available Fields

**GET** `/api/v1/reports/custom/fields`

Retrieves available fields for selected data sources.

#### Query Parameters

- `dataSource` (optional): Filter fields by specific data source

#### Response (200 OK)

Without `dataSource` parameter:

```json
{
  "fieldsByDataSource": {
    "stakeholders": [
      {
        "fieldId": "field-001",
        "dataSource": "stakeholders",
        "fieldName": "stakeholder_id",
        "displayName": "Stakeholder ID",
        "dataType": "string",
        "isFilterable": true,
        "isSortable": true,
        "isAggregatable": false,
        "isGroupable": true
      },
      {
        "fieldId": "field-002",
        "dataSource": "stakeholders",
        "fieldName": "name",
        "displayName": "Name",
        "dataType": "string",
        "isFilterable": true,
        "isSortable": true,
        "isAggregatable": false,
        "isGroupable": true
      }
    ],
    "transactions": [...]
  }
}
```

With `dataSource` parameter:

```json
{
  "fields": [
    {
      "fieldId": "field-101",
      "dataSource": "transactions",
      "fieldName": "transaction_id",
      "displayName": "Transaction ID",
      "dataType": "string",
      "isFilterable": true,
      "isSortable": true,
      "isAggregatable": false,
      "isGroupable": true
    },
    {
      "fieldId": "field-102",
      "dataSource": "transactions",
      "fieldName": "amount",
      "displayName": "Amount",
      "dataType": "currency",
      "isFilterable": true,
      "isSortable": true,
      "isAggregatable": true,
      "allowedAggregations": ["SUM", "AVG", "COUNT", "MIN", "MAX"],
      "isGroupable": false,
      "format": "$0,0.00"
    }
  ]
}
```

---

### 9. Preview Report

**POST** `/api/v1/reports/custom/preview`

Previews report results without saving the report configuration.

#### Request Body

```json
{
  "dataSources": ["transactions"],
  "fields": ["stakeholder_id", "amount"],
  "filters": [
    {
      "field": "amount",
      "operator": "greater_than",
      "value": 1000,
      "dataType": "number",
      "logicalOperator": "AND"
    }
  ],
  "groupBy": ["stakeholder_id"],
  "aggregations": [
    {
      "field": "amount",
      "function": "SUM",
      "alias": "total_amount"
    }
  ],
  "limit": 10
}
```

#### Response (200 OK)

```json
{
  "preview": true,
  "rowCount": 10,
  "data": [
    {
      "stakeholder_id": "stake-001",
      "total_amount": 125000.50
    },
    {
      "stakeholder_id": "stake-002",
      "total_amount": 98500.00
    }
  ]
}
```

Note: Preview results are limited to a maximum of 50 rows.

---

## Data Models

### Custom Report

```typescript
{
  reportId: string;           // Unique identifier
  name: string;               // Report name (required, max 255 chars)
  description?: string;       // Report description (max 1000 chars)
  companyId: string;          // Company identifier
  createdBy: string;          // User who created the report
  dataSources: string[];      // Array of data source names
  fields: string[];           // Array of field names to include
  filters?: FilterObject[];   // Array of filter conditions
  groupBy?: string[];         // Fields to group by
  aggregations?: Aggregation[]; // Aggregation functions
  sortBy?: SortConfig;        // Sort configuration
  limit?: number;             // Max rows to return (default: 100, max: 10000)
  isPublic: boolean;          // Whether report is public (default: false)
  sharedWith?: string[];      // User IDs with access
  schedule?: ScheduleConfig;  // Schedule configuration
  status: 'active' | 'archived' | 'draft'; // Report status
  executionCount: number;     // Number of times executed
  lastExecutedAt?: Date;      // Last execution timestamp
  metadata?: Map<string, any>; // Additional metadata
  createdAt: Date;            // Creation timestamp
  updatedAt: Date;            // Last update timestamp
}
```

### Filter Operators

- `equals` - Exact match
- `not_equals` - Not equal to
- `greater_than` - Greater than
- `greater_than_or_equal` - Greater than or equal to
- `less_than` - Less than
- `less_than_or_equal` - Less than or equal to
- `contains` - String contains (case-insensitive)
- `not_contains` - String does not contain
- `starts_with` - String starts with
- `ends_with` - String ends with
- `in` - Value in array
- `not_in` - Value not in array
- `is_null` - Value is null
- `is_not_null` - Value is not null
- `between` - Value between two values

### Aggregation Functions

- `SUM` - Sum of values
- `AVG` - Average of values
- `COUNT` - Count of rows
- `MIN` - Minimum value
- `MAX` - Maximum value
- `DISTINCT_COUNT` - Count of distinct values

### Data Types

- `string` - Text values
- `number` - Numeric values
- `date` - Date/timestamp values
- `boolean` - True/false values
- `currency` - Monetary values
- `percentage` - Percentage values

---

## Error Responses

### 400 Bad Request

```json
{
  "message": "Invalid report configuration",
  "errors": [
    "At least one data source is required",
    "At least one field is required"
  ]
}
```

### 401 Unauthorized

```json
{
  "message": "User not authenticated"
}
```

### 403 Forbidden

```json
{
  "message": "Access denied to this report"
}
```

### 404 Not Found

```json
{
  "message": "Report not found"
}
```

### 500 Internal Server Error

```json
{
  "message": "Report execution failed: <error details>"
}
```

---

## Security Features

### SQL Injection Protection

The query builder implements comprehensive SQL injection protection:

- **Field Name Validation**: All field names are validated against a whitelist
- **Pattern Blocking**: Dangerous SQL patterns are blocked (e.g., `UNION`, `DROP`, `--`)
- **Value Sanitization**: All input values are sanitized based on data type
- **Regex Escaping**: Special regex characters are escaped in string filters
- **Type Enforcement**: Strict type checking for all filter values

### Access Control

- Reports have three access levels:
  1. **Private**: Only creator can access
  2. **Shared**: Creator + users in `sharedWith` list
  3. **Public**: All users in the company
- Admin users have access to all reports
- Only creator or admin can update/delete reports

---

## Rate Limiting

- Standard API rate limit: 100 requests per 15 minutes
- Report execution is subject to additional limits based on complexity
- Preview requests are limited to 50 rows maximum

---

## Examples

### Example 1: Simple Report

Create a basic report listing all stakeholders:

```bash
curl -X POST https://api.example.com/api/v1/reports/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "All Stakeholders",
    "dataSources": ["stakeholders"],
    "fields": ["name", "email", "type", "status"]
  }'
```

### Example 2: Aggregated Report

Create a report with aggregations:

```bash
curl -X POST https://api.example.com/api/v1/reports/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Revenue by Stakeholder",
    "dataSources": ["transactions"],
    "fields": ["stakeholder_id"],
    "groupBy": ["stakeholder_id"],
    "aggregations": [
      {"field": "amount", "function": "SUM", "alias": "total_revenue"},
      {"field": "amount", "function": "COUNT", "alias": "transaction_count"}
    ],
    "sortBy": {"field": "total_revenue", "order": "DESC"},
    "limit": 50
  }'
```

### Example 3: Filtered Report

Create a report with complex filters:

```bash
curl -X POST https://api.example.com/api/v1/reports/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 High-Value Transactions",
    "dataSources": ["transactions"],
    "fields": ["transaction_id", "stakeholder_id", "amount", "date"],
    "filters": [
      {
        "field": "date",
        "operator": "between",
        "value": ["2024-01-01", "2024-03-31"],
        "dataType": "date",
        "logicalOperator": "AND"
      },
      {
        "field": "amount",
        "operator": "greater_than_or_equal",
        "value": 10000,
        "dataType": "number",
        "logicalOperator": "AND"
      }
    ],
    "sortBy": {"field": "amount", "order": "DESC"}
  }'
```

### Example 4: Scheduled Report

Create a report with email scheduling:

```bash
curl -X POST https://api.example.com/api/v1/reports/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly Revenue Summary",
    "dataSources": ["transactions"],
    "fields": ["month"],
    "groupBy": ["month"],
    "aggregations": [
      {"field": "amount", "function": "SUM", "alias": "monthly_revenue"}
    ],
    "schedule": {
      "enabled": true,
      "frequency": "monthly",
      "recipients": ["finance@company.com", "cfo@company.com"]
    }
  }'
```

---

## Best Practices

1. **Start with Preview**: Always test your report configuration with the preview endpoint before saving
2. **Limit Data**: Use appropriate `limit` values to prevent performance issues
3. **Optimize Filters**: Apply filters early to reduce data processing
4. **Use Aggregations**: Leverage aggregations for summary reports instead of processing large datasets
5. **Schedule Wisely**: Only enable scheduling for reports that need regular execution
6. **Share Appropriately**: Only share reports with users who need access
7. **Monitor Execution**: Track `executionCount` and `lastExecutedAt` to optimize report usage

---

## Support

For issues or questions:
- GitHub Issue: #197
- Contact: support@example.com
