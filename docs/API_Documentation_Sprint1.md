# OpenCap API Documentation - Sprint 1

This document provides detailed information about the APIs enhanced during Sprint 1 of the OpenCap API Enhancement Plan. It follows the Semantic Seed Venture Studio Coding Standards V2.0 with a focus on proper documentation and testing.

**Database**: ZeroDB (via AINative Studio)

## Table of Contents

1. [Database Configuration](#database-configuration)
2. [Compliance Check API](#compliance-check-api)
3. [Tax Calculator API](#tax-calculator-api)
4. [Testing](#testing)
5. [Next Steps](#next-steps)

---

## Database Configuration

OpenCap Stack uses ZeroDB as its primary database. All API endpoints interact with ZeroDB tables through the ZeroDB service layer.

### Environment Setup

```bash
# Required environment variables
ZERODB_API_KEY=your_zerodb_api_key
ZERODB_BASE_URL=https://api.ainative.studio/api/v1
ZERODB_PROJECT_ID=your_project_id
```

### ZeroDB Tables Used

| API | ZeroDB Table |
|-----|--------------|
| Compliance Check | `compliance_checks` |
| Tax Calculator | `tax_calculations` |

For complete database setup, see [ZeroDB Migration Guide](./zerodb/MIGRATION_GUIDE.md).

---

## Compliance Check API

The Compliance Check API allows for management of regulatory compliance checks for Special Purpose Vehicles (SPVs). This API handles GDPR, HIPAA, SOX, and CCPA regulation types.

### Base URL

```
/api/compliance-checks
```

### ZeroDB Table: `compliance_checks`

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
    "row_id": "uuid-generated-by-zerodb",
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Compliant",
    "LastCheckedBy": "AdminUser",
    "Timestamp": "2026-02-02T12:00:00.000Z",
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
        "row_id": "uuid-generated-by-zerodb",
        "CheckID": "CHECK-001",
        "SPVID": "SPV-123",
        "RegulationType": "GDPR",
        "Status": "Compliant",
        "LastCheckedBy": "AdminUser",
        "Timestamp": "2026-02-02T12:00:00.000Z",
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
        "row_id": "uuid-generated-by-zerodb",
        "CheckID": "CHECK-002",
        "SPVID": "SPV-456",
        "RegulationType": "SOX",
        "Status": "Non-Compliant",
        "LastCheckedBy": "AdminUser",
        "Timestamp": "2026-02-02T12:00:00.000Z",
        "Details": "Failed SOX compliance"
      }
    ]
  }
  ```

#### Get Compliance Check by ID
- **Method**: GET
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: ZeroDB row_id of the compliance check
- **Response**: 200 OK
  ```json
  {
    "row_id": "uuid-generated-by-zerodb",
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Compliant",
    "LastCheckedBy": "AdminUser",
    "Timestamp": "2026-02-02T12:00:00.000Z",
    "Details": "Initial compliance check"
  }
  ```

#### Update Compliance Check
- **Method**: PUT
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: ZeroDB row_id of the compliance check
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
    "row_id": "uuid-generated-by-zerodb",
    "CheckID": "CHECK-001",
    "SPVID": "SPV-123",
    "RegulationType": "GDPR",
    "Status": "Non-Compliant",
    "LastCheckedBy": "UpdatedUser",
    "Timestamp": "2026-02-02T12:00:00.000Z",
    "Details": "Updated compliance status"
  }
  ```

#### Delete Compliance Check
- **Method**: DELETE
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: ZeroDB row_id of the compliance check
- **Response**: 200 OK
  ```json
  {
    "message": "Compliance check deleted",
    "deletedCheck": {
      "row_id": "uuid-generated-by-zerodb",
      "CheckID": "CHECK-001",
      "SPVID": "SPV-123",
      "RegulationType": "GDPR",
      "Status": "Compliant",
      "LastCheckedBy": "AdminUser",
      "Timestamp": "2026-02-02T12:00:00.000Z",
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

### ZeroDB Table: `tax_calculations`

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
    "TaxDueDate": "2026-04-15T00:00:00.000Z"
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "row_id": "uuid-generated-by-zerodb",
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 10000,
    "TaxRate": 0.20,
    "TaxImplication": { "implication": "Capital Gains" },
    "CalculatedTax": 2000,
    "TaxDueDate": "2026-04-15T00:00:00.000Z"
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
        "row_id": "uuid-generated-by-zerodb",
        "calculationId": "CALC-001",
        "SaleScenario": { "scenario": "Stock Sale" },
        "ShareClassInvolved": "Common Stock",
        "SaleAmount": 10000,
        "TaxRate": 0.20,
        "TaxImplication": { "implication": "Capital Gains" },
        "CalculatedTax": 2000,
        "TaxDueDate": "2026-04-15T00:00:00.000Z"
      }
    ]
  }
  ```

#### Get Tax Calculation by ID
- **Method**: GET
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: ZeroDB row_id of the tax calculation
- **Response**: 200 OK
  ```json
  {
    "row_id": "uuid-generated-by-zerodb",
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 10000,
    "TaxRate": 0.20,
    "TaxImplication": { "implication": "Capital Gains" },
    "CalculatedTax": 2000,
    "TaxDueDate": "2026-04-15T00:00:00.000Z"
  }
  ```

#### Update Tax Calculation
- **Method**: PUT
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: ZeroDB row_id of the tax calculation
- **Request Body**:
  ```json
  {
    "SaleAmount": 15000,
    "TaxRate": 0.22,
    "TaxImplication": { "implication": "Updated Capital Gains" },
    "TaxDueDate": "2026-05-15T00:00:00.000Z"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "row_id": "uuid-generated-by-zerodb",
    "calculationId": "CALC-001",
    "SaleScenario": { "scenario": "Stock Sale" },
    "ShareClassInvolved": "Common Stock",
    "SaleAmount": 15000,
    "TaxRate": 0.22,
    "TaxImplication": { "implication": "Updated Capital Gains" },
    "CalculatedTax": 3300,
    "TaxDueDate": "2026-05-15T00:00:00.000Z"
  }
  ```

#### Delete Tax Calculation
- **Method**: DELETE
- **Endpoint**: `/:id`
- **Parameters**:
  - `id`: ZeroDB row_id of the tax calculation
- **Response**: 200 OK
  ```json
  {
    "message": "Tax calculation deleted",
    "taxCalculation": {
      "row_id": "uuid-generated-by-zerodb",
      "calculationId": "CALC-001",
      "SaleScenario": { "scenario": "Stock Sale" },
      "ShareClassInvolved": "Common Stock",
      "SaleAmount": 10000,
      "TaxRate": 0.20,
      "TaxImplication": { "implication": "Capital Gains" },
      "CalculatedTax": 2000,
      "TaxDueDate": "2026-04-15T00:00:00.000Z"
    }
  }
  ```

### Error Responses

- **400 Bad Request**: Invalid input data or validation error
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side error

---

## Testing

All enhanced APIs have been thoroughly tested using Jest with ZeroDB integration.

### 1. ComplianceCheck API Tests

- **Unit Tests**:
  - Model validation
  - Controller functions
  - Route handlers
  - ZeroDB service integration

- **BDD-Style Integration Tests**:
  - Successful operations
  - Error handling
  - Edge cases

### 2. TaxCalculator API Tests

- **Unit Tests**:
  - Model validation
  - Controller functions
  - Tax calculation logic
  - ZeroDB service integration

- **BDD-Style Integration Tests**:
  - Successful operations
  - Automatic tax recalculation
  - Error handling
  - Edge cases

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/api/complianceCheck.test.js
```

---

## Next Steps

1. **Sprint 2**: Focus on SPV and Communications APIs
2. **Documentation Updates**: Add Swagger/OpenAPI specifications
3. **Test Enhancements**: Continue expanding test coverage
4. **ZeroDB Optimization**: Implement caching and query optimization

---

## Related Documentation

- [ZeroDB API Reference](./zerodb/API_REFERENCE.md)
- [ZeroDB Migration Guide](./zerodb/MIGRATION_GUIDE.md)
- [Data Models](./DataModels.md)
- [Troubleshooting Guide](./troubleshooting.md)

---

**Document Version**: 2.0
**Last Updated**: 2026-02-02
**Database**: ZeroDB (via AINative Studio)
