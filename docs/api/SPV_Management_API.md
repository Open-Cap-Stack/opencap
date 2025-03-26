# SPV Management API Documentation
**Feature: OCAE-211**

## Overview

The SPV (Special Purpose Vehicle) Management API provides endpoints for creating, retrieving, updating, and deleting SPVs, as well as querying SPVs by various criteria such as status, compliance status, and parent company.

## Data Model

The SPV model includes the following fields:

| Field             | Type     | Description                                      | Valid Values                                |
|-------------------|----------|--------------------------------------------------|---------------------------------------------|
| SPVID             | String   | Unique identifier for the SPV                    | Any unique string                            |
| Name              | String   | Name of the SPV                                  | Any string                                   |
| Purpose           | String   | Purpose of the SPV                               | Any string                                   |
| CreationDate      | Date     | Date when the SPV was created                    | Valid date                                   |
| Status            | String   | Current status of the SPV                        | 'Active', 'Pending', 'Closed'                |
| ParentCompanyID   | String   | ID of the parent company                         | Any valid company ID                         |
| ComplianceStatus  | String   | Compliance status of the SPV                     | 'Compliant', 'NonCompliant', 'PendingReview' |

## API Endpoints

### Create SPV
- **Endpoint:** `POST /api/spvs`
- **Access:** Authenticated users
- **Description:** Creates a new SPV
- **Request Body:**
  ```json
  {
    "SPVID": "SPV-123",
    "Name": "Investment Vehicle A",
    "Purpose": "Real Estate Investment",
    "CreationDate": "2023-01-15T00:00:00.000Z",
    "Status": "Active",
    "ParentCompanyID": "COMP-456",
    "ComplianceStatus": "Compliant"
  }
  ```
- **Responses:**
  - `201 Created`: SPV created successfully
  - `400 Bad Request`: Missing required fields or invalid data
  - `409 Conflict`: An SPV with the provided ID already exists
  - `500 Internal Server Error`: Server error

### Get All SPVs
- **Endpoint:** `GET /api/spvs`
- **Access:** Authenticated users
- **Description:** Retrieves all SPVs
- **Responses:**
  - `200 OK`: Returns array of SPVs
  - `500 Internal Server Error`: Server error

### Get SPV by ID
- **Endpoint:** `GET /api/spvs/:id`
- **Access:** Authenticated users
- **Description:** Retrieves an SPV by ID (MongoDB ID or SPVID)
- **Path Parameters:**
  - `id`: SPV ID or MongoDB ObjectID
- **Responses:**
  - `200 OK`: Returns the SPV
  - `404 Not Found`: SPV not found
  - `500 Internal Server Error`: Server error

### Update SPV
- **Endpoint:** `PUT /api/spvs/:id`
- **Access:** Authenticated users
- **Description:** Updates an SPV by ID
- **Path Parameters:**
  - `id`: SPV ID or MongoDB ObjectID
- **Request Body:**
  ```json
  {
    "Name": "Updated Investment Vehicle",
    "Status": "Pending",
    "ComplianceStatus": "PendingReview"
  }
  ```
- **Responses:**
  - `200 OK`: Returns updated SPV
  - `400 Bad Request`: No valid fields provided or invalid data
  - `404 Not Found`: SPV not found
  - `500 Internal Server Error`: Server error

### Delete SPV
- **Endpoint:** `DELETE /api/spvs/:id`
- **Access:** Authenticated users
- **Description:** Deletes an SPV by ID
- **Path Parameters:**
  - `id`: SPV ID or MongoDB ObjectID
- **Responses:**
  - `200 OK`: SPV deleted successfully
  - `404 Not Found`: SPV not found
  - `500 Internal Server Error`: Server error

### Get SPVs by Parent Company
- **Endpoint:** `GET /api/spvs/parent/:id`
- **Access:** Authenticated users
- **Description:** Retrieves SPVs by parent company ID
- **Path Parameters:**
  - `id`: Parent company ID
- **Responses:**
  - `200 OK`: Returns array of SPVs
  - `404 Not Found`: No SPVs found for the parent company
  - `500 Internal Server Error`: Server error

### Get SPVs by Status
- **Endpoint:** `GET /api/spvs/status/:status`
- **Access:** Authenticated users
- **Description:** Retrieves SPVs by status
- **Path Parameters:**
  - `status`: SPV status ('Active', 'Pending', 'Closed')
- **Responses:**
  - `200 OK`: Returns array of SPVs
  - `400 Bad Request`: Invalid status parameter
  - `404 Not Found`: No SPVs found with the specified status
  - `500 Internal Server Error`: Server error

### Get SPVs by Compliance Status
- **Endpoint:** `GET /api/spvs/compliance/:status`
- **Access:** Authenticated users
- **Description:** Retrieves SPVs by compliance status
- **Path Parameters:**
  - `status`: Compliance status ('Compliant', 'NonCompliant', 'PendingReview')
- **Responses:**
  - `200 OK`: Returns array of SPVs
  - `400 Bad Request`: Invalid compliance status parameter
  - `404 Not Found`: No SPVs found with the specified compliance status
  - `500 Internal Server Error`: Server error

## Testing

The SPV Management API has comprehensive test coverage:
- Unit tests for all controller methods
- Validation of required fields and enum values
- Error handling for various scenarios
- Edge case handling

Current test coverage metrics:
- Statement Coverage: 88.18%
- Branch Coverage: 79.74%
- Function Coverage: 100%

## Error Handling

The API implements consistent error handling across all endpoints:
- All errors return an appropriate HTTP status code
- Error responses include a message explaining the error
- Detailed error information is provided for debugging

## Future Enhancements

Planned enhancements for the SPV Management API:
- Pagination for endpoints returning multiple SPVs
- Advanced filtering and sorting options
- Rate limiting for API protection
- More detailed compliance tracking
