# SPV Management API Documentation

## Version: 1.0
## Date: March 23, 2025

## Overview

The SPV (Special Purpose Vehicle) Management API provides endpoints for creating, retrieving, updating, and deleting SPV entities, as well as managing SPV status tracking and related operations.

## Base URL

```
/api/spvs
```

## Authentication

All API endpoints require authentication. Include the authentication token in the Authorization header of your requests:

```
Authorization: Bearer <your_token>
```

## API Endpoints

### 1. Create a new SPV

**Endpoint:** `POST /api/spvs`

**Description:** Creates a new SPV entity.

**Request Body:**

```json
{
  "SPVID": "SPV-001",
  "Name": "Example SPV",
  "Purpose": "Investment in real estate",
  "CreationDate": "2025-03-20T00:00:00.000Z",
  "Status": "Active",
  "ParentCompanyID": "PARENT-001",
  "ComplianceStatus": "Compliant"
}
```

**Response (201 Created):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "SPVID": "SPV-001",
  "Name": "Example SPV",
  "Purpose": "Investment in real estate",
  "CreationDate": "2025-03-20T00:00:00.000Z",
  "Status": "Active",
  "ParentCompanyID": "PARENT-001",
  "ComplianceStatus": "Compliant",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid SPV data
- `500 Server Error`: Server error

### 2. Get all SPVs

**Endpoint:** `GET /api/spvs`

**Description:** Retrieves all SPV entities.

**Response (200 OK):**

```json
[
  {
    "_id": "607f1f77bcf86cd799439011",
    "SPVID": "SPV-001",
    "Name": "Example SPV",
    "Purpose": "Investment in real estate",
    "CreationDate": "2025-03-20T00:00:00.000Z",
    "Status": "Active",
    "ParentCompanyID": "PARENT-001",
    "ComplianceStatus": "Compliant",
    "createdAt": "2025-03-23T00:00:00.000Z",
    "updatedAt": "2025-03-23T00:00:00.000Z"
  },
  {
    "_id": "607f1f77bcf86cd799439012",
    "SPVID": "SPV-002",
    "Name": "Another SPV",
    "Purpose": "Investment in technology",
    "CreationDate": "2025-03-21T00:00:00.000Z",
    "Status": "Inactive",
    "ParentCompanyID": "PARENT-002",
    "ComplianceStatus": "Non-Compliant",
    "createdAt": "2025-03-23T00:00:00.000Z",
    "updatedAt": "2025-03-23T00:00:00.000Z"
  }
]
```

**Error Responses:**

- `404 Not Found`: No SPVs found
- `500 Server Error`: Server error

### 3. Get SPV by ID

**Endpoint:** `GET /api/spvs/:id`

**Description:** Retrieves a specific SPV by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the SPV

**Response (200 OK):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "SPVID": "SPV-001",
  "Name": "Example SPV",
  "Purpose": "Investment in real estate",
  "CreationDate": "2025-03-20T00:00:00.000Z",
  "Status": "Active",
  "ParentCompanyID": "PARENT-001",
  "ComplianceStatus": "Compliant",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: SPV not found
- `500 Server Error`: Server error

### 4. Update SPV by ID

**Endpoint:** `PUT /api/spvs/:id`

**Description:** Updates a specific SPV by its MongoDB ID. Note that the SPVID field cannot be modified.

**Parameters:**

- `id` (string, required): MongoDB ID of the SPV

**Request Body:**

```json
{
  "Name": "Updated SPV Name",
  "Status": "Inactive",
  "ComplianceStatus": "Non-Compliant"
}
```

**Response (200 OK):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "SPVID": "SPV-001",
  "Name": "Updated SPV Name",
  "Purpose": "Investment in real estate",
  "CreationDate": "2025-03-20T00:00:00.000Z",
  "Status": "Inactive",
  "ParentCompanyID": "PARENT-001",
  "ComplianceStatus": "Non-Compliant",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T01:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ID format or attempt to modify SPVID
- `404 Not Found`: SPV not found
- `500 Server Error`: Server error

### 5. Delete SPV by ID

**Endpoint:** `DELETE /api/spvs/:id`

**Description:** Deletes a specific SPV by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the SPV

**Response (200 OK):**

```json
{
  "message": "SPV deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: SPV not found
- `500 Server Error`: Server error

### 6. Get SPVs by Status

**Endpoint:** `GET /api/spvs/status/:status`

**Description:** Retrieves all SPVs with a specific status.

**Parameters:**

- `status` (string, required): Status of the SPV (e.g., "Active", "Inactive")

**Response (200 OK):**

```json
{
  "status": "Active",
  "spvs": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "SPVID": "SPV-001",
      "Name": "Example SPV",
      "Purpose": "Investment in real estate",
      "CreationDate": "2025-03-20T00:00:00.000Z",
      "Status": "Active",
      "ParentCompanyID": "PARENT-001",
      "ComplianceStatus": "Compliant",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `404 Not Found`: No SPVs found with the given status
- `500 Server Error`: Server error

### 7. Get SPVs by Compliance Status

**Endpoint:** `GET /api/spvs/compliance/:status`

**Description:** Retrieves all SPVs with a specific compliance status.

**Parameters:**

- `status` (string, required): Compliance status of the SPV (e.g., "Compliant", "Non-Compliant")

**Response (200 OK):**

```json
{
  "complianceStatus": "Compliant",
  "spvs": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "SPVID": "SPV-001",
      "Name": "Example SPV",
      "Purpose": "Investment in real estate",
      "CreationDate": "2025-03-20T00:00:00.000Z",
      "Status": "Active",
      "ParentCompanyID": "PARENT-001",
      "ComplianceStatus": "Compliant",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `404 Not Found`: No SPVs found with the given compliance status
- `500 Server Error`: Server error

### 8. Get SPVs by Parent Company ID

**Endpoint:** `GET /api/spvs/parent/:id`

**Description:** Retrieves all SPVs associated with a specific parent company.

**Parameters:**

- `id` (string, required): ID of the parent company

**Response (200 OK):**

```json
{
  "parentCompanyID": "PARENT-001",
  "spvs": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "SPVID": "SPV-001",
      "Name": "Example SPV",
      "Purpose": "Investment in real estate",
      "CreationDate": "2025-03-20T00:00:00.000Z",
      "Status": "Active",
      "ParentCompanyID": "PARENT-001",
      "ComplianceStatus": "Compliant",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `404 Not Found`: No SPVs found with the given parent company ID
- `500 Server Error`: Server error
