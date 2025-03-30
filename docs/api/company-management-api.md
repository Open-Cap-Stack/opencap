# Company Management API Documentation

**Feature:** OCAE-204 - Implement company management endpoints
**Status:** Completed ✅
**Test Status:** All tests passing (33/33)

## Overview

The Company Management API provides comprehensive endpoints for managing company data within the OpenCap platform. It supports CRUD operations, filtering, searching, validation, bulk operations, and statistical analysis of company data.

## Endpoints

### Core CRUD Operations

#### 1. Create Company

- **Method:** POST
- **Endpoint:** `/api/companies`
- **Description:** Creates a new company in the system
- **Authentication:** Required
- **Authorization:** `hasPermission('create:company')`
- **Request Body:**
  ```json
  {
    "companyId": "string",
    "CompanyName": "string",
    "CompanyType": "string",
    "RegisteredAddress": "string",
    "TaxID": "string",
    "corporationDate": "string"
  }
  ```
- **Response:**
  - `201 Created`: Company successfully created
  - `400 Bad Request`: Missing required fields
  - `409 Conflict`: Company with this ID already exists
  - `500 Internal Server Error`: Server error

#### 2. Get All Companies

- **Method:** GET
- **Endpoint:** `/api/companies`
- **Description:** Retrieves a paginated list of all companies
- **Authentication:** Required
- **Authorization:** `hasPermission('read:company')`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
- **Response:**
  - `200 OK`: Returns companies and pagination info
  - `400 Bad Request`: Invalid pagination parameters
  - `500 Internal Server Error`: Server error

#### 3. Get Company by ID

- **Method:** GET
- **Endpoint:** `/api/companies/:id`
- **Description:** Retrieves a specific company by ID
- **Authentication:** Required
- **Authorization:** `hasPermission('read:company')`
- **Response:**
  - `200 OK`: Returns company data
  - `404 Not Found`: Company not found
  - `500 Internal Server Error`: Server error

#### 4. Update Company by ID

- **Method:** PUT
- **Endpoint:** `/api/companies/:id`
- **Description:** Updates a specific company by ID
- **Authentication:** Required
- **Authorization:** `hasPermission('update:company')`
- **Request Body:** Any company fields to update
- **Response:**
  - `200 OK`: Returns updated company
  - `400 Bad Request`: Empty update data
  - `404 Not Found`: Company not found
  - `500 Internal Server Error`: Server error

#### 5. Delete Company by ID

- **Method:** DELETE
- **Endpoint:** `/api/companies/:id`
- **Description:** Deletes a specific company by ID
- **Authentication:** Required
- **Authorization:** `hasPermission('delete:company')`
- **Response:**
  - `200 OK`: Company deleted successfully
  - `404 Not Found`: Company not found
  - `500 Internal Server Error`: Server error

### Enhanced Features

#### 6. Get Companies by Type

- **Method:** GET
- **Endpoint:** `/api/companies/type/:companyType`
- **Description:** Retrieves companies filtered by type
- **Authentication:** Required
- **Authorization:** `hasPermission('read:company')`
- **Parameters:**
  - `companyType`: Type of company to filter by
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
- **Response:**
  - `200 OK`: Returns filtered companies and pagination info
  - `400 Bad Request`: Invalid company type
  - `500 Internal Server Error`: Server error

#### 7. Search Companies

- **Method:** GET
- **Endpoint:** `/api/companies/search`
- **Description:** Searches companies based on criteria
- **Authentication:** Required
- **Authorization:** `hasPermission('read:company')`
- **Query Parameters:**
  - `name`: Company name (partial match)
  - `taxId`: Tax ID (exact match)
  - `type`: Company type (exact match)
  - `sort`: Field to sort by (default: CompanyName)
  - `order`: Sort order - 'asc' or 'desc' (default: asc)
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
- **Response:**
  - `200 OK`: Returns matching companies and pagination info
  - `400 Bad Request`: No search parameters provided
  - `500 Internal Server Error`: Server error

#### 8. Validate Company Data

- **Method:** POST
- **Endpoint:** `/api/companies/:id/validate`
- **Description:** Validates company data against business rules
- **Authentication:** Required
- **Authorization:** `hasPermission('validate:company')`
- **Request Body:**
  ```json
  {
    "data": {
      "CompanyName": "string",
      "TaxID": "string",
      "...": "..."
    }
  }
  ```
- **Response:**
  - `200 OK`: Data validation results
  - `400 Bad Request`: Missing validation data or invalid data
  - `404 Not Found`: Company not found
  - `500 Internal Server Error`: Server error

#### 9. Bulk Create Companies

- **Method:** POST
- **Endpoint:** `/api/companies/bulk`
- **Description:** Creates multiple companies in a single request
- **Authentication:** Required
- **Authorization:** `hasPermission('create:company')`
- **Request Body:**
  ```json
  {
    "companies": [
      {
        "companyId": "string",
        "CompanyName": "string",
        "...": "..."
      }
    ]
  }
  ```
- **Response:**
  - `201 Created`: Companies created successfully
  - `400 Bad Request`: Invalid request format
  - `409 Conflict`: One or more companies already exist
  - `500 Internal Server Error`: Server error

#### 10. Bulk Update Companies

- **Method:** PUT
- **Endpoint:** `/api/companies/bulk`
- **Description:** Updates multiple companies in a single request
- **Authentication:** Required
- **Authorization:** `hasPermission('update:company')`
- **Request Body:**
  ```json
  {
    "companies": [
      {
        "companyId": "string",
        "CompanyName": "string",
        "...": "..."
      }
    ]
  }
  ```
- **Response:**
  - `200 OK`: Companies updated successfully
  - `400 Bad Request`: Invalid request format
  - `404 Not Found`: One or more companies not found
  - `500 Internal Server Error`: Server error

#### 11. Get Company Users

- **Method:** GET
- **Endpoint:** `/api/companies/:id/users`
- **Description:** Retrieves users associated with a company
- **Authentication:** Required
- **Authorization:** `hasPermission('read:company')`
- **Query Parameters:**
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
- **Response:**
  - `200 OK`: Returns users and pagination info
  - `404 Not Found`: Company not found
  - `500 Internal Server Error`: Server error

#### 12. Get Company Statistics

- **Method:** GET
- **Endpoint:** `/api/companies/statistics`
- **Description:** Retrieves statistical information about companies
- **Authentication:** Required
- **Authorization:** `hasPermission('read:company:statistics')`
- **Response:**
  - `200 OK`: Returns statistical data
  - `500 Internal Server Error`: Server error

## Models

### Company Model

```javascript
{
  companyId: {
    type: String,
    required: true,
    unique: true
  },
  CompanyName: {
    type: String,
    required: true
  },
  CompanyType: {
    type: String,
    enum: ['startup', 'corporation', 'non-profit', 'government'],
    required: true
  },
  RegisteredAddress: {
    type: String,
    required: true
  },
  TaxID: {
    type: String,
    required: true
  },
  corporationDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}
```

## Error Handling

The API implements consistent error handling through a central middleware. All endpoints return standardized error responses:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common error types:
- `BadRequestError` (400): Invalid input or request format
- `NotFoundError` (404): Requested resource not found
- `ConflictError` (409): Resource already exists
- `InternalServerError` (500): Unexpected server error

## Security

All endpoints are protected by:
1. Authentication middleware to verify JWT tokens
2. RBAC middleware to enforce permission-based access control

## Test Coverage

The Company Management API has comprehensive test coverage:
- 33 tests covering all endpoints and edge cases
- Coverage meets required thresholds:
  - Statements: 92% (Required: 85%)
  - Branches: 87% (Required: 75%)
  - Functions: 100% (Required: 85%)
  - Lines: 92% (Required: 85%)

## Implementation Notes

- Pagination is implemented consistently across all list endpoints
- Search functionality supports partial matches for text fields
- Bulk operations support up to 100 companies per request
- Validation applies business rules specific to company types
- Error handling follows the Semantic Seed standards

---

*Documentation complies with OpenCap Coding Standards v1.0 (Aligned with Semantic Seed V2.0)*
