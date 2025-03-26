# OpenCap API Documentation - Sprint 1

This document provides detailed information about the APIs enhanced during Sprint 1 of the OpenCap API Enhancement Plan. It follows the Semantic Seed Venture Studio Coding Standards V2.0 with a focus on proper documentation and testing.

## Table of Contents

1. [Compliance Check API](#compliance-check-api)
2. [Tax Calculator API](#tax-calculator-api)
3. [Testing](#testing)
4. [Next Steps](#next-steps)

---

## Compliance Check API

The Compliance Check API allows for management of regulatory compliance checks for Special Purpose Vehicles (SPVs). This API handles GDPR, HIPAA, SOX, and CCPA regulation types.

### Base URL

```
/api/compliance-checks
```

### Endpoints

#### Create a Compliance Check
- **Method**: POST
- **Endpoint**: `/`
- **Request Body**:
  ```json
  {
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Compliant",
    "LastCheckedBy": "AdminUser",
    "Details": "Initial compliance check"
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "_id": "60a1e2c8c8e6b12d98765432",
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Compliant",
    "LastCheckedBy": "AdminUser",
    "Timestamp": "2025-05-16T12:00:00.000Z",
    "Details": "Initial compliance check"
  }
  ```

#### Get All Compliance Checks
- **Method**: GET
- **Endpoint**: `/`
- **Response**: 200 OK
  ```json
  {
    "success": true,
    "complianceChecks": [
      {
        "_id": "60a1e2c8c8e6b12d98765432",
        "CheckID": "CHECK-001",
        "SPVID": "SPV-123",
        "RegulationType": "GDPR",
        "Status": "Compliant",
        "LastCheckedBy": "AdminUser",
        "Timestamp": "2025-05-16T12:00:00.000Z",
        "Details": "Initial compliance check"
      }
    ]
  }
  ```

#### Get Non-Compliant Checks
- **Method**: GET
- **Endpoint**: `/non-compliant`
- **Response**: 200 OK
  ```json
  {
    "complianceChecks": [
      {
        "_id": "60a1e2c8c8e6b12d98765433",
        "CheckID": "CHECK-002",
        "SPVID": "SPV-456",
        "RegulationType": "SOX",
        "Status": "Non-Compliant",
        "LastCheckedBy": "AdminUser",
        "Timestamp": "2025-05-16T12:00:00.000Z",
        "Details": "Failed SOX compliance"
      }
    ]
  }
  ```

#### Get Compliance Check by ID (New in Sprint 1)
- **Method**: GET
- **Endpoint**: `/:id`
- **Parameters**: 
  - `id`: MongoDB ObjectId of the compliance check
- **Response**: 200 OK
  ```json
  {
    "_id": "60a1e2c8c8e6b12d98765432",
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Compliant",
    "LastCheckedBy": "AdminUser",
    "Timestamp": "2025-05-16T12:00:00.000Z",
    "Details": "Initial compliance check"
  }
  ```

#### Update Compliance Check (New in Sprint 1)
- **Method**: PUT
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: MongoDB ObjectId of the compliance check
- **Request Body**:
  ```json
  {
    "Status": "Non-Compliant",
    "LastCheckedBy": "UpdatedUser",
    "Details": "Updated compliance status"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "_id": "60a1e2c8c8e6b12d98765432",
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Non-Compliant",
    "LastCheckedBy": "UpdatedUser",
    "Timestamp": "2025-05-16T12:00:00.000Z",
    "Details": "Updated compliance status"
  }
  ```

#### Delete Compliance Check
- **Method**: DELETE
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: MongoDB ObjectId of the compliance check
- **Response**: 200 OK
  ```json
  {
    "message": "Compliance check deleted",
    "deletedCheck": {
      "_id": "60a1e2c8c8e6b12d98765432",
      "CheckID": "CHECK-001",
      "SPVID": "SPV-123",
      "RegulationType": "GDPR",
      "Status": "Compliant",
      "LastCheckedBy": "AdminUser",
      "Timestamp": "2025-05-16T12:00:00.000Z",
      "Details": "Initial compliance check"
    }
  }
  ```

### Error Responses

- **400 Bad Request**: Invalid input data or validation error
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## Tax Calculator API

The Tax Calculator API manages tax calculations for different sale scenarios and share classes.

### Base URL

```
/api/tax-calculator
```

### Endpoints

#### Calculate Tax
- **Method**: POST
- **Endpoint**: `/calculate`
- **Request Body**:
  ```json
  {
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 10000,
    "TaxRate": 0.20,
    "TaxImplication": { "implication": "Capital Gains" },
    "TaxDueDate": "2025-04-15T00:00:00.000Z"
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "_id": "60b2f3d9c9f7b23e87654321",
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 10000,
    "TaxRate": 0.20,
    "TaxImplication": { "implication": "Capital Gains" },
    "CalculatedTax": 2000,
    "TaxDueDate": "2025-04-15T00:00:00.000Z"
  }
  ```

#### Get All Tax Calculations
- **Method**: GET
- **Endpoint**: `/`
- **Response**: 200 OK
  ```json
  {
    "taxCalculations": [
      {
        "_id": "60b2f3d9c9f7b23e87654321",
        "calculationId": "CALC-001",
        "SaleScenario": { "scenario": "Stock Sale" },
        "ShareClassInvolved": "Common Stock",
        "SaleAmount": 10000,
        "TaxRate": 0.20,
        "TaxImplication": { "implication": "Capital Gains" },
        "CalculatedTax": 2000,
        "TaxDueDate": "2025-04-15T00:00:00.000Z"
      }
    ]
  }
  ```

#### Get Tax Calculation by ID
- **Method**: GET
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: MongoDB ObjectId of the tax calculation
- **Response**: 200 OK
  ```json
  {
    "_id": "60b2f3d9c9f7b23e87654321",
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 10000,
    "TaxRate": 0.20,
    "TaxImplication": { "implication": "Capital Gains" },
    "CalculatedTax": 2000,
    "TaxDueDate": "2025-04-15T00:00:00.000Z"
  }
  ```

#### Update Tax Calculation (New in Sprint 1)
- **Method**: PUT
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: MongoDB ObjectId of the tax calculation
- **Request Body**:
  ```json
  {
    "SaleAmount": 15000,
    "TaxRate": 0.22,
    "TaxImplication": { "implication": "Updated Capital Gains" },
    "TaxDueDate": "2025-05-15T00:00:00.000Z"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "_id": "60b2f3d9c9f7b23e87654321",
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 15000,
    "TaxRate": 0.22,
    "TaxImplication": { "implication": "Updated Capital Gains" },
    "CalculatedTax": 3300,
    "TaxDueDate": "2025-05-15T00:00:00.000Z"
  }
  ```

#### Delete Tax Calculation
- **Method**: DELETE
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: MongoDB ObjectId of the tax calculation
- **Response**: 200 OK
  ```json
  {
    "message": "Tax calculation deleted",
    "taxCalculation": {
      "_id": "60b2f3d9c9f7b23e87654321",
      "calculationId": "CALC-001",
      "SaleScenario": { "scenario": "Stock Sale" },
      "ShareClassInvolved": "Common Stock",
      "SaleAmount": 10000,
      "TaxRate": 0.20,
      "TaxImplication": { "implication": "Capital Gains" },
      "CalculatedTax": 2000,
      "TaxDueDate": "2025-04-15T00:00:00.000Z"
    }
  }
  ```

### Error Responses

- **400 Bad Request**: Invalid input data or validation error
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## Testing

All enhanced APIs have been thoroughly tested using Jest with the following test coverage:

### 1. ComplianceCheck API Tests

- **Unit Tests**:
  - Model validation
  - Controller functions
  - Route handlers
  
- **BDD-Style Integration Tests**:
  - Successful operations
  - Error handling
  - Edge cases

### 2. TaxCalculator API Tests

- **Unit Tests**:
  - Model validation
  - Controller functions
  - Tax calculation logic
  
- **BDD-Style Integration Tests**:
  - Successful operations
  - Automatic tax recalculation
  - Error handling
  - Edge cases

## Next Steps

1. **Sprint 2**: Focus on SPV and Communications APIs
2. **Documentation Updates**: Add Swagger/OpenAPI specifications
3. **Test Enhancements**: Continue expanding test coverage
