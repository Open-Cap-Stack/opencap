# SPV Asset Management API Documentation

## Version: 1.0
## Date: March 23, 2025

## Overview

The SPV Asset Management API provides endpoints for creating, retrieving, updating, and deleting SPV asset entities, as well as managing asset allocation and valuation operations.

## Base URL

```
/api/spvassets
```

## Authentication

All API endpoints require authentication. Include the authentication token in the Authorization header of your requests:

```
Authorization: Bearer <your_token>
```

## API Endpoints

### 1. Create a new SPV Asset

**Endpoint:** `POST /api/spvassets`

**Description:** Creates a new SPV asset entity.

**Request Body:**

```json
{
  "AssetID": "ASSET-001",
  "SPVID": "SPV-001",
  "Type": "Real Estate",
  "Value": 500000,
  "Description": "Commercial property in downtown",
  "AcquisitionDate": "2025-03-20T00:00:00.000Z"
}
```

**Response (201 Created):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "AssetID": "ASSET-001",
  "SPVID": "SPV-001",
  "Type": "Real Estate",
  "Value": 500000,
  "Description": "Commercial property in downtown",
  "AcquisitionDate": "2025-03-20T00:00:00.000Z",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid SPV asset data
- `500 Server Error`: Server error

### 2. Get all SPV Assets

**Endpoint:** `GET /api/spvassets`

**Description:** Retrieves all SPV asset entities.

**Response (200 OK):**

```json
[
  {
    "_id": "607f1f77bcf86cd799439011",
    "AssetID": "ASSET-001",
    "SPVID": "SPV-001",
    "Type": "Real Estate",
    "Value": 500000,
    "Description": "Commercial property in downtown",
    "AcquisitionDate": "2025-03-20T00:00:00.000Z",
    "createdAt": "2025-03-23T00:00:00.000Z",
    "updatedAt": "2025-03-23T00:00:00.000Z"
  },
  {
    "_id": "607f1f77bcf86cd799439012",
    "AssetID": "ASSET-002",
    "SPVID": "SPV-001",
    "Type": "Financial Instrument",
    "Value": 250000,
    "Description": "Government bonds",
    "AcquisitionDate": "2025-03-21T00:00:00.000Z",
    "createdAt": "2025-03-23T00:00:00.000Z",
    "updatedAt": "2025-03-23T00:00:00.000Z"
  }
]
```

**Error Responses:**

- `404 Not Found`: No SPV assets found
- `500 Server Error`: Server error

### 3. Get SPV Asset by ID

**Endpoint:** `GET /api/spvassets/:id`

**Description:** Retrieves a specific SPV asset by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the SPV asset

**Response (200 OK):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "AssetID": "ASSET-001",
  "SPVID": "SPV-001",
  "Type": "Real Estate",
  "Value": 500000,
  "Description": "Commercial property in downtown",
  "AcquisitionDate": "2025-03-20T00:00:00.000Z",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: SPV asset not found
- `500 Server Error`: Server error

### 4. Update SPV Asset by ID

**Endpoint:** `PUT /api/spvassets/:id`

**Description:** Updates a specific SPV asset by its MongoDB ID. Note that the AssetID and SPVID fields cannot be modified.

**Parameters:**

- `id` (string, required): MongoDB ID of the SPV asset

**Request Body:**

```json
{
  "Type": "Commercial Real Estate",
  "Value": 550000,
  "Description": "Updated description for the property"
}
```

**Response (200 OK):**

```json
{
  "_id": "607f1f77bcf86cd799439011",
  "AssetID": "ASSET-001",
  "SPVID": "SPV-001",
  "Type": "Commercial Real Estate",
  "Value": 550000,
  "Description": "Updated description for the property",
  "AcquisitionDate": "2025-03-20T00:00:00.000Z",
  "createdAt": "2025-03-23T00:00:00.000Z",
  "updatedAt": "2025-03-23T01:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ID format or attempt to modify AssetID or SPVID
- `404 Not Found`: SPV asset not found
- `500 Server Error`: Server error

### 5. Delete SPV Asset by ID

**Endpoint:** `DELETE /api/spvassets/:id`

**Description:** Deletes a specific SPV asset by its MongoDB ID.

**Parameters:**

- `id` (string, required): MongoDB ID of the SPV asset

**Response (200 OK):**

```json
{
  "message": "SPV asset deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid ID format
- `404 Not Found`: SPV asset not found
- `500 Server Error`: Server error

### 6. Get Assets by SPV ID

**Endpoint:** `GET /api/spvassets/spv/:spvId`

**Description:** Retrieves all assets associated with a specific SPV.

**Parameters:**

- `spvId` (string, required): ID of the SPV

**Response (200 OK):**

```json
{
  "spvId": "SPV-001",
  "assets": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "AssetID": "ASSET-001",
      "SPVID": "SPV-001",
      "Type": "Real Estate",
      "Value": 500000,
      "Description": "Commercial property in downtown",
      "AcquisitionDate": "2025-03-20T00:00:00.000Z",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    },
    {
      "_id": "607f1f77bcf86cd799439012",
      "AssetID": "ASSET-002",
      "SPVID": "SPV-001",
      "Type": "Financial Instrument",
      "Value": 250000,
      "Description": "Government bonds",
      "AcquisitionDate": "2025-03-21T00:00:00.000Z",
      "createdAt": "2025-03-23T00:00:00.000Z",
      "updatedAt": "2025-03-23T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `404 Not Found`: No assets found for the given SPV ID
- `500 Server Error`: Server error

### 7. Get Total Valuation by SPV ID

**Endpoint:** `GET /api/spvassets/valuation/spv/:spvId`

**Description:** Calculates and returns the total value of all assets associated with a specific SPV.

**Parameters:**

- `spvId` (string, required): ID of the SPV

**Response (200 OK):**

```json
{
  "spvId": "SPV-001",
  "totalValuation": 750000,
  "assetCount": 2,
  "valuationDate": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `404 Not Found`: No assets found for the given SPV ID
- `500 Server Error`: Server error

### 8. Get Total Valuation by Asset Type

**Endpoint:** `GET /api/spvassets/valuation/type/:type`

**Description:** Calculates and returns the total value of all assets of a specific type.

**Parameters:**

- `type` (string, required): Type of the assets (e.g., "Real Estate", "Financial Instrument")

**Response (200 OK):**

```json
{
  "assetType": "Real Estate",
  "totalValuation": 500000,
  "assetCount": 1,
  "valuationDate": "2025-03-23T00:00:00.000Z"
}
```

**Error Responses:**

- `404 Not Found`: No assets found for the given type
- `500 Server Error`: Server error
