# OpenCap API Enhancement Sprint Plan

**Version**: 1.1  
**Date**: March 22, 2025  
**Author**: Development Team  
**Status**: In Progress - Sprint 1 Completed  

## Overview

This sprint plan outlines a 10-week (5 sprint) implementation timeline for enhancing the OpenCap API layer, ensuring all functional code has properly exposed endpoints and resolving duplicate/inconsistent implementations. The plan follows Semantic Seed Venture Studio's Coding Standards V2.0, implementing Test-Driven Development (TDD) and Behavior-Driven Development (BDD) throughout.

## Current API Inventory

The following APIs are already properly exposed in the OpenCap platform:

### Core Entity APIs
- **User Management API** (`/api/users`)
  - GET, POST, PUT, DELETE operations
  - User profile management, authentication
  
- **Document Management API** (`/api/documents`)
  - GET, POST, PUT, DELETE operations
  - Document upload, retrieval, and metadata management
  
- **Document Embedding API** (`/api/document-embeddings`)
  - Generation and management of document embeddings
  - Search and similarity functions

- **Document Access API** (`/api/document-accesses`)
  - Permission management for documents
  - Access control and sharing

### Financial APIs
- **Financial Reporting API** (`/api/financial-reports`)
  - Generation of financial reports
  - Historical financial data access
  
- **Share Class API** (`/api/share-classes`)
  - Management of different share classes
  - Share structure and terms

- **Stakeholder API** (`/api/stakeholders`)
  - Management of company stakeholders
  - Ownership tracking

- **Fundraising Round API** (`/api/fundraising-rounds`)
  - Management of fundraising activities
  - Terms and conditions tracking

- **Equity Plan API** (`/api/equity-plans`)
  - Management of equity compensation plans
  - Vesting schedule tracking

- **Investment Tracker API** (`/api/investments`)
  - Tracking of investments
  - ROI calculations

### Organizational APIs
- **Company API** (`/api/companies`)
  - Company profile management
  - Corporate structure

- **Employee API** (`/api/employees`)
  - Employee profile management
  - Position and compensation tracking

- **Investor API** (`/api/investors`)
  - Investor profile management
  - Investment portfolio tracking

### Administrative APIs
- **Admin API** (`/api/admins`)
  - System administration
  - User role management

- **Activity API** (`/api/activities`)
  - Activity logging
  - Audit trails

- **Authentication API** (`/auth`)
  - Login, registration, OAuth functionality
  - Token management

### Optional/Partially Implemented APIs
The following APIs are registered in the app.js file but use `safeRequire` which means they might not be available in all environments or might be partially implemented:

- **Communication API** (`/api/communications`)
  - Messaging functionality
  - Communication history

- **Notification API** (`/api/notifications`)
  - User notification management
  - Notification preferences

- **Invite Management API** (`/api/invites`)
  - User invitation system
  - Invitation tracking and management

- **SPV API** (`/api/spv`)
  - Special Purpose Vehicle management
  - Investment vehicle structuring

- **SPV Asset API** (`/api/spv-assets`)
  - Assets within SPVs
  - Asset allocation and tracking

- **Compliance Check API** (`/api/compliance-checks`)
  - Regulatory compliance verification
  - Compliance history tracking

- **Integration Module API** (`/api/integration-modules`)
  - Third-party service integration
  - API connectors management

- **Tax Calculator API** (`/api/taxCalculations`)
  - Tax estimation tools
  - Tax calculation history

## Missing API Endpoints

Despite being listed in the app.js file with `safeRequire`, the following APIs need proper implementation or enhancement to ensure they are fully functional:

1. **Data Pipeline APIs**
   - MinIO Storage Operations (not implemented)
   - Airflow DAG Management (not implemented)

2. **Compliance and Reporting**
   - Compliance Checks API (partial implementation in ComplianceCheck.js)
   - Tax Calculator API (partial implementation in TaxCalculator.js)

3. **Financial Instruments**
   - SPV Management API (partial implementation in SPV.js)
   - SPV Asset Management API (partial implementation in SPVasset.js)

4. **User Experience**
   - Notifications API (partial implementation in Notification.js)
   - Communications API (partial implementation in Communication.js)

5. **Integration Services**
   - Integration Module API (minimal implementation in integration.js)

Our sprint plan will focus on completing the implementation of these partially implemented APIs and adding the completely missing data pipeline APIs.

## Team Structure

- **API Team** (2 engineers)
  - 1 API Architecture Lead
  - 1 API Developer
  
- **Testing Team** (1 engineer)
  - 1 API Testing Specialist

- **Documentation Team** (1 engineer)
  - 1 API Documentation Specialist

## Sprint Cadence

- **Sprint Duration**: 2 weeks
- **Planning**: First day of sprint
- **Daily Standups**: 15 minutes daily
- **Demos**: Last day of sprint
- **Retrospectives**: Following demos, last day of sprint
- **Backlog Refinement**: Mid-sprint, week 1

## Sprint Breakdown

### Sprint 1: "Compliance and Tax Calculation APIs" (Weeks 1-2) 

**Status: COMPLETED**

**Goals**:
- Implement complete Compliance Check API
- Implement Tax Calculator API
- Create comprehensive test suite for both APIs

**API Team Stories**:
- [Feature] Complete and register ComplianceCheck API (5 points)
  - Expose POST /api/compliance-checks
  - Implement GET /api/compliance-checks
  - Implement GET /api/compliance-checks/:id
  - Implement PUT /api/compliance-checks/:id
  - Implement DELETE /api/compliance-checks/:id
  - Implement GET /api/compliance-checks/non-compliant

- [Feature] Complete and register Tax Calculator API (5 points)
  - Expose POST /api/tax-calculations/calculate
  - Implement GET /api/tax-calculations
  - Implement GET /api/tax-calculations/:id
  - Implement PUT /api/tax-calculations/:id
  - Implement DELETE /api/tax-calculations/:id

**Testing Team Stories**:
- [Feature] Create BDD test suite for Compliance Check API (3 points)
- [Feature] Create BDD test suite for Tax Calculator API (3 points)
- [Chore] Set up API testing framework improvements (2 points)

**Documentation Team Stories**:
- [Feature] Create API documentation for Compliance Check API (3 points)
- [Feature] Create API documentation for Tax Calculator API (3 points)
- [Chore] Set up API documentation generation (3 points)

**Definition of Done**:
- All API endpoints implemented and registered in app.js
- Complete test coverage for all new endpoints
- API documentation generated and accessible
- All tests passing for implemented features
- Manual QA verification completed

**Retrospective Notes**:
- Successfully implemented all missing endpoints for ComplianceCheck and TaxCalculator APIs
- Created comprehensive test suites following BDD approach
- Generated detailed API documentation
- Fixed routing issue with special routes vs. ID-based routes in ComplianceCheck API
- Added automatic tax recalculation when updating tax calculation entries

### Sprint 2: "SPV and Communications APIs" (Weeks 3-4) 

**Goals**:
- Implement SPV Management API
- Implement SPV Asset Management API
- Implement Communications API
- Create comprehensive test suite for all APIs

**API Team Stories**:
- [Feature] Complete and register SPV Management API (8 points)
  - Implement all CRUD operations for SPVs
  - Implement SPV status tracking endpoints
  - Implement investor relationship endpoints

- [Feature] Complete and register SPV Asset Management API (5 points)
  - Implement all CRUD operations for SPV assets
  - Implement asset allocation endpoints
  - Implement asset valuation endpoints

- [Feature] Complete and register Communications API (5 points)
  - Implement message creation endpoints
  - Implement thread management endpoints
  - Implement message retrieval endpoints

**Testing Team Stories**:
- [Feature] Create BDD test suite for SPV APIs (5 points)
- [Feature] Create BDD test suite for Communications API (3 points)
- [Chore] Create integration tests for cross-service functionality (2 points)

**Documentation Team Stories**:
- [Feature] Create API documentation for SPV and SPV Asset APIs (5 points)
- [Feature] Create API documentation for Communications API (3 points)
- [Chore] Update API developers guide with new endpoints (2 points)

**Definition of Done**:
- All API endpoints implemented and registered in app.js
- Complete test coverage for all new endpoints
- API documentation generated and accessible
- All tests passing for implemented features
- Manual QA verification completed

### Sprint 3: "Notification and Integration APIs" (Weeks 5-6)

**Goals**:
- Implement Notification API
- Complete Integration Module API
- Implement improved error handling across all APIs
- Create comprehensive test suite for all APIs

**API Team Stories**:
- [Feature] Complete and register Notification API (5 points)
  - Implement notification creation endpoint
  - Implement notification retrieval endpoints
  - Implement notification status management endpoints
  - Implement notification preference endpoints

- [Feature] Complete Integration Module API (5 points)
  - Complete existing POST endpoint implementation
  - Implement GET endpoints for integration modules
  - Implement PUT/DELETE endpoints for integration modules
  - Implement status check endpoints for integrations

- [Feature] Implement standardized API error handling (8 points)
  - Create consistent error response structure
  - Implement appropriate HTTP status codes
  - Add detailed error messages and codes
  - Create error logging and monitoring

**Testing Team Stories**:
- [Feature] Create BDD test suite for Notification API (3 points)
- [Feature] Create BDD test suite for Integration Module API (3 points)
- [Feature] Create error handling test cases for all APIs (5 points)

**Documentation Team Stories**:
- [Feature] Create API documentation for Notification API (3 points)
- [Feature] Create API documentation for Integration Module API (3 points)
- [Feature] Document error handling standards and response formats (3 points)

**Definition of Done**:
- All API endpoints implemented and registered in app.js
- Complete test coverage for all new endpoints
- Comprehensive error handling implemented across all APIs
- API documentation generated and accessible
- All tests passing for implemented features
- Manual QA verification completed

### Sprint 4: "Data Pipeline API" (Weeks 7-8)

**Goals**:
- Implement Storage API for MinIO integration
- Implement Pipeline Management API for Airflow integration
- Create comprehensive test suite for both APIs

**API Team Stories**:
- [Feature] Implement Storage API (8 points)
  - Implement bucket management endpoints
  - Implement object CRUD operation endpoints
  - Implement direct upload/download endpoints
  - Implement policy and access control endpoints

- [Feature] Implement Pipeline Management API (8 points)
  - Implement DAG management endpoints
  - Implement pipeline execution endpoints
  - Implement execution monitoring endpoints
  - Implement result retrieval endpoints

**Testing Team Stories**:
- [Feature] Create BDD test suite for Storage API (5 points)
- [Feature] Create BDD test suite for Pipeline Management API (5 points)
- [Feature] Implement integration tests with existing document system (3 points)

**Documentation Team Stories**:
- [Feature] Create API documentation for Storage API (3 points)
- [Feature] Create API documentation for Pipeline Management API (3 points)
- [Feature] Create tutorials for using data pipeline APIs (3 points)

**Definition of Done**:
- All API endpoints implemented and registered in app.js
- Complete test coverage for all new endpoints
- API documentation generated and accessible
- Integration with document management system completed
- All tests passing for implemented features
- Manual QA verification completed

### Sprint 5: "API Consolidation and Documentation" (Weeks 9-10)

**Goals**:
- Resolve duplicate route implementations
- Standardize all API naming and paths
- Complete comprehensive API documentation
- Implement API versioning strategy

**API Team Stories**:
- [Chore] Consolidate duplicate document routes (3 points)
- [Chore] Consolidate duplicate user routes (3 points)
- [Chore] Consolidate duplicate invite management routes (3 points)
- [Chore] Standardize API path naming conventions (5 points)
- [Feature] Implement API versioning (5 points)

**Testing Team Stories**:
- [Chore] Update all tests for consolidated routes (5 points)
- [Feature] Create API regression test suite (5 points)
- [Feature] Implement API performance testing (3 points)

**Documentation Team Stories**:
- [Feature] Create unified API documentation portal (8 points)
- [Feature] Create API versioning documentation (3 points)
- [Feature] Document API deprecation policy (2 points)
- [Chore] Create API style guide (3 points)

**Definition of Done**:
- All duplicate routes resolved
- Standardized API naming and paths implemented
- API versioning strategy implemented
- Complete documentation portal available
- All tests passing for implemented features
- Manual QA verification completed
- Performance benchmarks met

## Post-Implementation Support

- 2-week hypercare period following deployment
- Dedicated bug-fix sprint if needed
- Training sessions for API consumers

## API Enhancement Metrics

- **Coverage**: 100% of models should have corresponding API endpoints
- **Consistency**: 100% naming and response format consistency  
- **Documentation**: 100% of endpoints documented
- **Testing**: 90%+ test coverage for all endpoints
- **Performance**: All API endpoints should respond within 300ms
