/**
 * OpenCap Backlog Creator Script
 * 
 * [Chore] OCAE-303: Create Structured OpenCap Backlog
 * 
 * This script builds a complete backlog for the OpenCap project following
 * Semantic Seed Venture Studio Coding Standards.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

// Initialize with IDs starting points
const OCDI_START_ID = 101; // Data Infrastructure
const OCAE_START_ID = 201; // API Enhancement

/**
 * Main function to create the OpenCap backlog
 */
async function createOpenCapBacklog() {
  try {
    console.log('🚀 Creating OpenCap Backlog');
    console.log('---------------------------');
    
    // 1. Verify API connection
    console.log('Verifying Shortcut API connection...');
    const workflows = await shortcut.getWorkflows();
    if (!workflows || !workflows.length) {
      throw new Error('No workflows found. Check your API token.');
    }
    
    // Get the primary workflow and backlog state
    const primaryWorkflow = workflows[0];
    const backlogState = primaryWorkflow.states.find(s => 
      s.name.toLowerCase().includes('backlog') || s.type === 'unstarted'
    );
    
    if (!backlogState) {
      throw new Error('Could not find a backlog state in the workflow.');
    }
    
    console.log(`Using workflow: ${primaryWorkflow.name}`);
    console.log(`Using backlog state: ${backlogState.name} (ID: ${backlogState.id})`);
    
    // 2. Create the main epics
    console.log('\nCreating epics...');
    const epics = await createEpics();
    console.log(`Created ${epics.length} epics.`);
    
    // 3. Create stories for each epic
    let totalStories = 0;
    for (const epic of epics) {
      console.log(`\nCreating stories for epic: ${epic.name}`);
      
      // Determine which story set to use based on epic name
      let stories;
      if (epic.name.includes('Data Infrastructure')) {
        stories = await createDataInfrastructureStories(OCDI_START_ID);
      } else if (epic.name.includes('API Enhancement')) {
        stories = await createApiEnhancementStories(OCAE_START_ID);
      } else if (epic.name.includes('Authentication')) {
        stories = await createAuthStories();
      } else if (epic.name.includes('Financial Reporting')) {
        stories = await createFinancialReportingStories();
      } else if (epic.name.includes('Testing & Quality')) {
        stories = await createTestingStories();
      } else {
        stories = [];
      }
      
      // Create the stories in Shortcut
      const createdStories = await Promise.all(stories.map(async story => {
        try {
          const result = await shortcut.createStory({
            name: story.name,
            description: story.description,
            type: story.type,
            workflowStateId: backlogState.id,
            epicId: epic.id
          });
          console.log(`✓ Created: ${story.name}`);
          return result;
        } catch (error) {
          console.error(`✗ Failed to create: ${story.name}`);
          console.error(error.message);
          return null;
        }
      }));
      
      const successfulStories = createdStories.filter(s => s !== null);
      console.log(`Added ${successfulStories.length} stories to epic: ${epic.name}`);
      totalStories += successfulStories.length;
    }
    
    console.log('\n🎉 Backlog creation completed!');
    console.log(`Created ${epics.length} epics and ${totalStories} stories total.`);
    console.log('Check your Shortcut workspace to see the complete backlog.');
    
  } catch (error) {
    console.error('\n❌ Backlog creation failed:');
    console.error(error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

/**
 * Create the main epics for OpenCap
 */
async function createEpics() {
  const epicDefinitions = [
    {
      name: 'Data Infrastructure',
      description: 'Core database models, connections, and data architecture for OpenCap.'
    },
    {
      name: 'API Enhancement',
      description: 'RESTful API endpoints, controllers, and services for OpenCap.'
    },
    {
      name: 'Authentication & Security',
      description: 'User authentication, authorization, and security features.'
    },
    {
      name: 'Financial Reporting',
      description: 'Financial reporting, analysis, and export capabilities.'
    },
    {
      name: 'Testing & Quality',
      description: 'Testing framework, code quality, and CI/CD setup.'
    }
  ];
  
  const createdEpics = [];
  
  for (const epicDef of epicDefinitions) {
    try {
      const epic = await shortcut.createEpic(epicDef);
      console.log(`✓ Created epic: ${epic.name} (ID: ${epic.id})`);
      createdEpics.push(epic);
    } catch (error) {
      console.error(`✗ Failed to create epic: ${epicDef.name}`);
      console.error(error.message);
    }
  }
  
  return createdEpics;
}

/**
 * Create Data Infrastructure stories (OCDI-XXX)
 */
async function createDataInfrastructureStories(startId) {
  let id = startId;
  
  return [
    {
      name: `[Feature] OCDI-${id++}: Set up MongoDB connection`,
      description: `
# Description
Implement MongoDB connection with proper configuration, error handling, and reconnection logic.

# Acceptance Criteria
- MongoDB connection is established on application startup
- Connection details are configurable via environment variables
- Proper error handling and reconnection logic is implemented
- Connection status is logged appropriately
- Unit tests verify connection behavior

# Technical Notes
- Use Mongoose for MongoDB ORM
- Implement connection pooling
- Handle connection failures gracefully
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCDI-${id++}: Create User data model`,
      description: `
# Description
Implement the User data model with proper fields, validation, and methods.

# Acceptance Criteria
- User model implements all required fields (email, name, role, etc.)
- Password hashing is implemented correctly
- Model includes methods for authentication
- Field validation is comprehensive
- Unit tests cover all model functionality

# Technical Notes
- Use Mongoose schema
- Use bcrypt for password hashing
- Implement proper indexing for email and other searchable fields
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCDI-${id++}: Create Company data model`,
      description: `
# Description
Implement the Company data model to store company information.

# Acceptance Criteria
- Company model has all required fields (name, EIN, address, etc.)
- Proper relationships to User model are established
- Validation rules are implemented for all fields
- Unit tests verify model functionality

# Technical Notes
- Use Mongoose schema
- Implement proper indexing
- Add timestamps for auditing
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCDI-${id++}: Create Financial Report data model`,
      description: `
# Description
Implement the Financial Report data model for storing financial reporting data.

# Acceptance Criteria
- Model includes all necessary fields for financial reporting
- Relationships to Company model are established
- Model supports versioning of reports
- Validation ensures data integrity
- Unit tests verify all functionality

# Technical Notes
- Use nested schemas for complex financial data
- Consider performance implications for large documents
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCDI-${id++}: Create Share Class data model`,
      description: `
# Description
Implement the Share Class data model for tracking different classes of company shares.

# Acceptance Criteria
- Model includes fields for share class name, rights, preferences
- Relationships to Company model are established
- Validation rules enforce data integrity
- Unit tests verify model functionality

# Technical Notes
- Consider how to model complex share class structures
- Add methods for calculating ownership percentages
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCDI-${id++}: Database seed script`,
      description: `
# Description
Create a script to seed the database with initial data for development and testing.

# Acceptance Criteria
- Script populates the database with test data
- All models (User, Company, Financial Report, etc.) are covered
- Different scenarios are represented in the seed data
- Script is idempotent (can be run multiple times safely)

# Technical Notes
- Use Mongoose's create method
- Add command-line options for different seed scenarios
      `,
      type: 'feature'
    },
    {
      name: `[Chore] OCDI-${id++}: Implement database migration system`,
      description: `
# Description
Set up a database migration system for managing schema changes.

# Acceptance Criteria
- Migration system allows for schema evolution
- Migrations can be run automatically during deployment
- Migration status is tracked in the database
- System handles up/down migrations

# Technical Notes
- Consider using mongoose-migrate or similar library
- Document migration process for developers
      `,
      type: 'chore'
    },
    {
      name: `[Feature] OCDI-${id++}: Create Document data model`,
      description: `
# Description
Implement the Document data model for storing document metadata and references.

# Acceptance Criteria
- Model includes fields for document type, name, path, etc.
- Relationships to User and Company models are established
- Support for versioning documents
- Validation rules for all fields
- Unit tests verify model functionality

# Technical Notes
- Consider how to handle physical document storage (S3, filesystem, etc.)
- Add methods for tracking document access
      `,
      type: 'feature'
    }
  ];
}

/**
 * Create API Enhancement stories (OCAE-XXX)
 */
async function createApiEnhancementStories(startId) {
  let id = startId;
  
  return [
    {
      name: `[Feature] OCAE-${id++}: Set up Express server with middleware`,
      description: `
# Description
Configure Express server with all necessary middleware for the OpenCap API.

# Acceptance Criteria
- Express server is properly configured
- Essential middleware is set up (cors, bodyParser, etc.)
- Error handling middleware is implemented
- Request logging is configured
- Server configuration is environment-based
- Unit tests verify server setup

# Technical Notes
- Use environment variables for configuration
- Implement proper error handling middleware
- Consider rate limiting for public endpoints
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement user registration endpoint`,
      description: `
# Description
Create API endpoint for user registration.

# Acceptance Criteria
- POST /api/users endpoint creates new user accounts
- Input validation ensures data integrity
- Email uniqueness is enforced
- Password requirements are validated
- Email verification flow is triggered
- Responses include appropriate status codes
- Unit and integration tests verify functionality

# Technical Notes
- Use validation middleware
- Hash passwords before storage
- Consider email verification requirements
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement user authentication endpoints`,
      description: `
# Description
Create API endpoints for user login, logout, and token refresh.

# Acceptance Criteria
- POST /api/auth/login authenticates users
- POST /api/auth/logout invalidates tokens
- POST /api/auth/refresh refreshes access tokens
- Failed login attempts are handled securely
- Rate limiting prevents brute force attacks
- JWT tokens are properly generated and validated
- Unit and integration tests verify functionality

# Technical Notes
- Use JWT for authentication
- Consider token expiration and refresh strategy
- Implement proper security measures
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement company management endpoints`,
      description: `
# Description
Create API endpoints for creating and managing company information.

# Acceptance Criteria
- CRUD endpoints for company resources
- Proper authorization checks (only admins can create companies)
- Input validation for all operations
- Appropriate error handling
- Unit and integration tests for all endpoints

# Technical Notes
- Implement proper route organization
- Use controller/service pattern
- Consider pagination for listing endpoints
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement financial reporting endpoints`,
      description: `
# Description
Create API endpoints for managing financial reports.

# Acceptance Criteria
- CRUD endpoints for financial reports
- Support for filtering and searching reports
- Version tracking for report changes
- Authorization ensures only permitted users can access reports
- Input validation for all operations
- Unit and integration tests for all endpoints

# Technical Notes
- Consider complexity of financial data structures
- Implement efficient queries for report filtering
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement document upload endpoints`,
      description: `
# Description
Create API endpoints for document upload and management.

# Acceptance Criteria
- Endpoints for uploading, retrieving, and managing documents
- Support for various document types (PDF, Excel, etc.)
- Secure document storage
- Metadata tracking for uploaded documents
- Authorization checks for document access
- Unit and integration tests for all endpoints

# Technical Notes
- Consider using AWS S3 or similar for storage
- Implement file type validation and scanning
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement admin management endpoints`,
      description: `
# Description
Create API endpoints for admin users to manage the system.

# Acceptance Criteria
- Endpoints for user management by admins
- Endpoints for system configuration
- Strong authorization checks
- Audit logging for admin actions
- Unit and integration tests for all endpoints

# Technical Notes
- Implement strict access controls
- Log all administrative actions
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-${id++}: Implement share class management endpoints`,
      description: `
# Description
Create API endpoints for managing company share classes.

# Acceptance Criteria
- CRUD endpoints for share class resources
- Support for complex share structures
- Input validation for all operations
- Authorization ensures only permitted users can access
- Unit and integration tests for all endpoints

# Technical Notes
- Consider relationships with company and stakeholder data
- Implement validation for share calculations
      `,
      type: 'feature'
    },
    {
      name: `[Chore] OCAE-${id++}: Implement API versioning`,
      description: `
# Description
Set up API versioning to allow for future API evolution.

# Acceptance Criteria
- API routes include version in path (/api/v1/...)
- Version strategy is documented
- Framework supports multiple versions simultaneously
- Tests verify correct versioning behavior

# Technical Notes
- Consider how to handle deprecated endpoints
- Document versioning policy for developers
      `,
      type: 'chore'
    },
    {
      name: `[Feature] OCAE-${id++}: Create comprehensive Swagger documentation`,
      description: `
# Description
Implement complete Swagger/OpenAPI documentation for all API endpoints.

# Acceptance Criteria
- All API endpoints are documented
- Documentation includes request/response schemas
- Authentication requirements are documented
- Examples are provided for complex endpoints
- Swagger UI is accessible for interactive testing
- Documentation is kept in sync with implementation

# Technical Notes
- Use swagger-jsdoc for inline documentation
- Set up swagger-ui-express for interactive interface
      `,
      type: 'feature'
    }
  ];
}

/**
 * Create Authentication & Security stories
 */
async function createAuthStories() {
  return [
    {
      name: `[Feature] OCAE-301: Implement JWT authentication`,
      description: `
# Description
Set up JSON Web Token (JWT) based authentication for the OpenCap API.

# Acceptance Criteria
- JWT tokens are properly generated on successful login
- Token validation middleware is implemented
- Tokens include appropriate claims (user ID, role, etc.)
- Token expiration and refresh mechanism is implemented
- Secret keys are properly managed via environment variables
- Unit tests verify authentication functionality

# Technical Notes
- Use jsonwebtoken package
- Consider token storage strategy (HttpOnly cookies vs localStorage)
- Implement CSRF protection if using cookies
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-302: Implement role-based access control`,
      description: `
# Description
Create role-based access control (RBAC) system for the OpenCap API.

# Acceptance Criteria
- User roles are defined (admin, user, etc.)
- Authorization middleware checks role permissions
- Different endpoints have appropriate role requirements
- Unit tests verify authorization functionality
- Role assignment and management is implemented

# Technical Notes
- Define granular permissions within roles
- Consider using a dedicated RBAC library
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-303: Implement password reset functionality`,
      description: `
# Description
Create password reset capability for users.

# Acceptance Criteria
- Users can request password reset via email
- Secure tokens are generated for reset requests
- Tokens have appropriate expiration
- Password reset process validates tokens
- New passwords are properly validated and stored
- Unit and integration tests verify functionality

# Technical Notes
- Use crypto for generating secure tokens
- Implement email sending functionality
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-304: Set up secure header configuration`,
      description: `
# Description
Configure secure HTTP headers for the OpenCap API.

# Acceptance Criteria
- Security headers are properly configured (HSTS, CSP, etc.)
- Content Security Policy prevents XSS attacks
- X-Content-Type-Options prevents MIME type sniffing
- Referrer-Policy controls referrer information
- X-XSS-Protection is configured for browsers
- Unit tests verify header configuration

# Technical Notes
- Use helmet.js for header configuration
- Customize CSP based on application needs
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-305: Implement API rate limiting`,
      description: `
# Description
Set up rate limiting for API endpoints to prevent abuse.

# Acceptance Criteria
- Rate limiting is applied to authentication endpoints
- Rate limits are configured based on endpoint sensitivity
- Responses include rate limit headers
- Excessive requests receive appropriate error responses
- Unit tests verify rate limiting behavior

# Technical Notes
- Use express-rate-limit or similar library
- Consider different rate limits for different user roles
      `,
      type: 'feature'
    },
    {
      name: `[Chore] OCAE-306: Implement security audit logging`,
      description: `
# Description
Create comprehensive security audit logging for sensitive operations.

# Acceptance Criteria
- Authentication attempts are logged (success/failure)
- Administrative actions are logged
- Sensitive data operations are logged
- Logs include relevant context (user, IP, timestamp)
- Logs are stored securely
- Unit tests verify logging functionality

# Technical Notes
- Consider log storage and rotation strategy
- Ensure PII is handled appropriately in logs
      `,
      type: 'chore'
    }
  ];
}

/**
 * Create Financial Reporting stories
 */
async function createFinancialReportingStories() {
  return [
    {
      name: `[Feature] OCDI-201: Implement financial data import`,
      description: `
# Description
Create functionality for importing financial data from various formats.

# Acceptance Criteria
- Support for CSV, Excel, and JSON import formats
- Data validation during import
- Error handling for malformed data
- Mapping configuration for different import formats
- Unit tests verify import functionality

# Technical Notes
- Use appropriate libraries for file parsing
- Consider validation strategies for financial data
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCDI-202: Create financial reporting templates`,
      description: `
# Description
Develop templates for standard financial reports in the system.

# Acceptance Criteria
- Templates for common financial reports (balance sheet, income statement, etc.)
- Template customization options
- Template versioning
- Unit tests verify template functionality

# Technical Notes
- Design flexible template system
- Consider how to handle regulatory changes
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-401: Implement financial report generation`,
      description: `
# Description
Create API endpoints for generating financial reports.

# Acceptance Criteria
- Endpoints generate reports based on templates
- Support for different output formats (PDF, Excel, CSV)
- Data filtering options for report parameters
- Unit and integration tests verify functionality

# Technical Notes
- Consider using libraries for report generation
- Implement caching for report data where appropriate
      `,
      type: 'feature'
    },
    {
      name: `[Feature] OCAE-402: Create financial metrics calculation`,
      description: `
# Description
Implement calculation of key financial metrics from report data.

# Acceptance Criteria
- Calculation of common financial ratios and metrics
- Accurate results verified against test data
- API endpoints for retrieving metrics
- Unit tests verify calculation accuracy

# Technical Notes
- Document formulas used for calculations
- Consider performance for complex calculations
      `,
      type: 'feature'
    }
  ];
}

/**
 * Create Testing & Quality stories
 */
async function createTestingStories() {
  return [
    {
      name: `[Chore] OCAE-501: Set up Jest testing framework`,
      description: `
# Description
Configure Jest for testing the OpenCap application.

# Acceptance Criteria
- Jest is configured for unit and integration tests
- Test command is added to package.json
- Test directory structure is established
- Example tests are provided for each type
- Code coverage reporting is configured

# Technical Notes
- Set up separate configurations for unit and integration tests
- Configure mocking for external dependencies
      `,
      type: 'chore'
    },
    {
      name: `[Chore] OCAE-502: Implement ESLint configuration`,
      description: `
# Description
Set up ESLint for code quality and style enforcement.

# Acceptance Criteria
- ESLint configuration enforces coding standards
- Configuration extends appropriate presets
- Custom rules are documented
- Linting command is added to package.json
- Pre-commit hook runs linting

# Technical Notes
- Consider using Airbnb or similar style guide
- Configure rules specifically for the project needs
      `,
      type: 'chore'
    },
    {
      name: `[Chore] OCAE-503: Create CI/CD pipeline configuration`,
      description: `
# Description
Set up continuous integration and deployment pipeline.

# Acceptance Criteria
- CI configuration runs tests on pull requests
- Linting is performed in the pipeline
- Security scanning is included
- Build process is automated
- Deployment to staging is configured

# Technical Notes
- Use GitHub Actions or similar CI system
- Document deployment process
      `,
      type: 'chore'
    },
    {
      name: `[Chore] OCAE-504: Create end-to-end test suite`,
      description: `
# Description
Implement end-to-end tests for critical user flows.

# Acceptance Criteria
- E2E tests cover main user journeys
- Tests can run in CI environment
- Tests use realistic test data
- Test results are reported clearly

# Technical Notes
- Consider using Cypress or similar E2E framework
- Design tests for stability in CI environment
      `,
      type: 'chore'
    }
  ];
}

// Run the script
createOpenCapBacklog();
