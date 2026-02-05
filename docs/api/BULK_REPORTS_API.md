# Bulk Reports API Documentation

**Issue**: #238 - Implement Bulk Reports Endpoint

## Overview

The Bulk Reports API provides endpoints for generating multiple reports asynchronously. Jobs are queued and processed in the background, allowing users to generate large batches of reports without blocking.

## Base URL

```
/api/v1/reports/bulk
```

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### 1. Generate Bulk Reports

Create a bulk report generation job.

**Endpoint**: `POST /api/v1/reports/bulk`

**Request Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "reports": [
    {
      "reportType": "financial",
      "format": "pdf",
      "parameters": {
        "year": 2025,
        "quarter": "Q4"
      }
    },
    {
      "reportType": "equity",
      "format": "csv",
      "parameters": {
        "asOf": "2025-12-31"
      }
    },
    {
      "reportType": "compliance",
      "format": "xlsx",
      "parameters": {
        "includeHistorical": true
      }
    }
  ]
}
```

**Request Body Fields**:
- `reports` (array, required): Array of report configurations (1-50 reports)
  - `reportType` (string, required): Type of report
    - Valid values: `financial`, `equity`, `compliance`, `investor`, `operational`, `custom`
  - `format` (string, required): Output format
    - Valid values: `pdf`, `csv`, `xlsx`, `json`
  - `parameters` (object, optional): Report-specific parameters

**Success Response** (202 Accepted):
```json
{
  "success": true,
  "message": "Bulk report generation job created",
  "data": {
    "jobId": "JOB-BULK-A1B2C3D4",
    "status": "queued",
    "totalReports": 3,
    "completedReports": 0,
    "failedReports": 0,
    "estimatedCompletionTime": "2026-02-05T10:05:00Z",
    "createdAt": "2026-02-05T10:00:00Z"
  }
}
```

**Error Responses**:

400 Bad Request - Missing or invalid reports array:
```json
{
  "success": false,
  "error": "Invalid request: reports array is required"
}
```

400 Bad Request - Empty reports array:
```json
{
  "success": false,
  "error": "At least one report is required"
}
```

400 Bad Request - Too many reports:
```json
{
  "success": false,
  "error": "Maximum 50 reports allowed per bulk request"
}
```

400 Bad Request - Invalid report configuration:
```json
{
  "success": false,
  "error": "Report 1: Missing required field: reportType"
}
```

400 Bad Request - Invalid format:
```json
{
  "success": false,
  "error": "Report 2: Invalid format: txt. Allowed formats: pdf, csv, xlsx, json"
}
```

401 Unauthorized:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Example cURL**:
```bash
curl -X POST https://api.example.com/api/v1/reports/bulk \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "reports": [
      {
        "reportType": "financial",
        "format": "pdf",
        "parameters": {"year": 2025}
      },
      {
        "reportType": "equity",
        "format": "csv"
      }
    ]
  }'
```

---

### 2. Get Bulk Job Status

Get the status and progress of a bulk report generation job.

**Endpoint**: `GET /api/v1/reports/bulk/:jobId`

**Path Parameters**:
- `jobId` (string, required): The bulk job ID (e.g., `JOB-BULK-A1B2C3D4`)

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "jobId": "JOB-BULK-A1B2C3D4",
    "status": "processing",
    "totalReports": 5,
    "completedReports": 3,
    "failedReports": 1,
    "progress": 60,
    "reports": [
      {
        "reportType": "financial",
        "format": "pdf",
        "status": "completed",
        "reportId": "RPT-12345678",
        "downloadUrl": "/api/v1/reports/RPT-12345678",
        "completedAt": "2026-02-05T10:01:00Z"
      },
      {
        "reportType": "equity",
        "format": "csv",
        "status": "completed",
        "reportId": "RPT-87654321",
        "downloadUrl": "/api/v1/reports/RPT-87654321",
        "completedAt": "2026-02-05T10:01:30Z"
      },
      {
        "reportType": "compliance",
        "format": "xlsx",
        "status": "completed",
        "reportId": "RPT-11223344",
        "downloadUrl": "/api/v1/reports/RPT-11223344",
        "completedAt": "2026-02-05T10:02:00Z"
      },
      {
        "reportType": "investor",
        "format": "pdf",
        "status": "failed",
        "error": "Data not found",
        "completedAt": "2026-02-05T10:02:15Z"
      },
      {
        "reportType": "operational",
        "format": "json",
        "status": "pending"
      }
    ],
    "createdAt": "2026-02-05T10:00:00Z",
    "startedAt": "2026-02-05T10:00:30Z"
  }
}
```

**Response Fields**:
- `status`: Job status (`queued`, `processing`, `completed`, `failed`, `cancelled`)
- `progress`: Progress percentage (0-100)
- `reports`: Array of individual report statuses
  - `status`: Report status (`pending`, `processing`, `completed`, `failed`)
  - `reportId`: Generated report ID (when completed)
  - `downloadUrl`: URL to download the report (when completed)
  - `error`: Error message (when failed)

**Error Responses**:

404 Not Found:
```json
{
  "success": false,
  "error": "Job not found"
}
```

403 Forbidden (trying to access another user's job):
```json
{
  "success": false,
  "error": "Unauthorized access to job"
}
```

**Example cURL**:
```bash
curl -X GET https://api.example.com/api/v1/reports/bulk/JOB-BULK-A1B2C3D4 \
  -H "Authorization: Bearer your-jwt-token"
```

---

### 3. Cancel Bulk Job

Cancel a queued or processing bulk job.

**Endpoint**: `DELETE /api/v1/reports/bulk/:jobId`

**Path Parameters**:
- `jobId` (string, required): The bulk job ID

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Bulk job cancelled successfully",
  "data": {
    "jobId": "JOB-BULK-A1B2C3D4",
    "status": "cancelled",
    "totalReports": 5,
    "completedReports": 2,
    "failedReports": 0,
    "cancelledReports": 3,
    "cancelledAt": "2026-02-05T10:05:00Z"
  }
}
```

**Error Responses**:

400 Bad Request (job already completed):
```json
{
  "success": false,
  "error": "Cannot cancel a completed job"
}
```

404 Not Found:
```json
{
  "success": false,
  "error": "Job not found"
}
```

403 Forbidden:
```json
{
  "success": false,
  "error": "Unauthorized access to job"
}
```

**Example cURL**:
```bash
curl -X DELETE https://api.example.com/api/v1/reports/bulk/JOB-BULK-A1B2C3D4 \
  -H "Authorization: Bearer your-jwt-token"
```

---

### 4. Get User Bulk Jobs

Get all bulk jobs for the authenticated user.

**Endpoint**: `GET /api/v1/reports/bulk`

**Query Parameters**:
- `status` (string, optional): Filter by job status
  - Valid values: `queued`, `processing`, `completed`, `failed`, `cancelled`

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "jobId": "JOB-BULK-001",
      "status": "completed",
      "totalReports": 3,
      "completedReports": 3,
      "failedReports": 0,
      "createdAt": "2026-02-05T09:00:00Z",
      "completedAt": "2026-02-05T09:02:00Z"
    },
    {
      "jobId": "JOB-BULK-002",
      "status": "processing",
      "totalReports": 5,
      "completedReports": 2,
      "failedReports": 0,
      "createdAt": "2026-02-05T10:00:00Z",
      "startedAt": "2026-02-05T10:00:30Z"
    },
    {
      "jobId": "JOB-BULK-003",
      "status": "queued",
      "totalReports": 2,
      "completedReports": 0,
      "failedReports": 0,
      "createdAt": "2026-02-05T10:30:00Z",
      "estimatedCompletionTime": "2026-02-05T10:31:00Z"
    }
  ],
  "count": 3
}
```

**Example cURL**:
```bash
# Get all jobs
curl -X GET https://api.example.com/api/v1/reports/bulk \
  -H "Authorization: Bearer your-jwt-token"

# Get only completed jobs
curl -X GET https://api.example.com/api/v1/reports/bulk?status=completed \
  -H "Authorization: Bearer your-jwt-token"
```

---

## Job Lifecycle

1. **Queued**: Job created and waiting to be processed
2. **Processing**: Job is actively generating reports
3. **Completed**: All reports generated successfully (or with partial failures)
4. **Failed**: All reports failed to generate
5. **Cancelled**: Job was cancelled by user

## Rate Limits

- Maximum 50 reports per bulk job
- Standard API rate limits apply (see global rate limiting documentation)

## Best Practices

1. **Polling**: Poll job status every 5-10 seconds to check progress
2. **Error Handling**: Check individual report statuses for partial failures
3. **Cancellation**: Cancel jobs if they're no longer needed to free up resources
4. **Report Types**: Ensure report types match your subscription/permissions
5. **Parameters**: Validate parameters before submitting to avoid failures

## Example Workflows

### Workflow 1: Generate Monthly Reports

```javascript
// 1. Create bulk job
const response = await fetch('/api/v1/reports/bulk', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reports: [
      { reportType: 'financial', format: 'pdf', parameters: { month: 'January' } },
      { reportType: 'equity', format: 'csv', parameters: { month: 'January' } },
      { reportType: 'compliance', format: 'xlsx', parameters: { month: 'January' } }
    ]
  })
});

const { data: { jobId } } = await response.json();

// 2. Poll for completion
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/v1/reports/bulk/${jobId}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });

  const { data } = await statusResponse.json();

  if (data.status === 'completed') {
    // Download reports
    data.reports
      .filter(r => r.status === 'completed')
      .forEach(r => {
        window.open(r.downloadUrl, '_blank');
      });
  } else if (data.status === 'processing' || data.status === 'queued') {
    // Continue polling
    setTimeout(pollStatus, 5000);
  }
};

pollStatus();
```

### Workflow 2: Cancel Long-Running Job

```javascript
// Cancel job if it's taking too long
const cancelJob = async (jobId) => {
  const response = await fetch(`/api/v1/reports/bulk/${jobId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  });

  const result = await response.json();
  console.log(`Cancelled ${result.data.cancelledReports} pending reports`);
};

// Set a timeout to cancel after 5 minutes
setTimeout(() => cancelJob(jobId), 5 * 60 * 1000);
```

---

## Technical Details

### Database Tables

- **BulkReportJob**: Stores bulk job metadata and status
- **GeneratedReport**: Stores individual generated reports

### Queue Implementation

- Simple in-memory queue (development)
- For production: Consider Redis-based queue (Bull, BullMQ) or cloud solutions (AWS SQS)

### Performance Considerations

- Average report generation time: 30 seconds per report
- Jobs processed sequentially within each bulk job
- Multiple bulk jobs can process concurrently

---

## Error Codes

| HTTP Code | Error Message | Description |
|-----------|--------------|-------------|
| 400 | Invalid request: reports array is required | Missing reports array in request body |
| 400 | At least one report is required | Empty reports array |
| 400 | Maximum 50 reports allowed per bulk request | Too many reports in single job |
| 400 | Missing required field: reportType | Report configuration missing reportType |
| 400 | Invalid format: {format} | Unsupported output format |
| 400 | Invalid reportType: {type} | Unsupported report type |
| 400 | Cannot cancel a completed job | Attempting to cancel finished job |
| 401 | Authentication required | Missing or invalid JWT token |
| 403 | Unauthorized access to job | User doesn't own the job |
| 404 | Job not found | Job ID doesn't exist |
| 500 | Database error | Internal server error |

---

## Support

For issues or questions about the Bulk Reports API:
- GitHub Issues: https://github.com/Open-Cap-Stack/opencapstack/issues
- Documentation: `/docs/api/`
- Related Issue: #238

---

**Last Updated**: 2026-02-05
**API Version**: v1
**Status**: Production Ready
