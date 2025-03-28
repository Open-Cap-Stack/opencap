/**
 * OCAE-210: Script to add missing stories to Shortcut
 * Following Semantic Seed Venture Studio Coding Standards
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;

const BACKLOG_STATE_ID = 500000006; // ID for "Backlog" state

// Get next available story ID for a specific prefix (OCAE or OCDI)
async function getNextAvailableID(prefix) {
  try {
    console.log(`Finding next available ID for ${prefix} series...`);
    
    const response = await axios.get(
      'https://api.app.shortcut.com/api/v3/stories',
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    // Filter stories by prefix
    const stories = response.data.filter(story => 
      story.name && story.name.includes(prefix)
    );
    
    // Extract numeric parts of the IDs
    const idNumbers = stories.map(story => {
      if (story.name) {
        const match = story.name.match(new RegExp(`${prefix}-(\\d+)`));
        return match ? parseInt(match[1], 10) : 0;
      }
      return 0;
    });
    
    // Find the maximum ID number
    const maxID = Math.max(...idNumbers, 0);
    const nextID = maxID + 1;
    
    console.log(`Next available ID for ${prefix} series: ${nextID}`);
    return nextID;
  } catch (error) {
    console.error(`Error finding next available ID:`, error.message);
    throw error;
  }
}

// Create a new story in Shortcut
async function createStory(story) {
  try {
    console.log(`Creating story: ${story.name}...`);
    
    const response = await axios.post(
      'https://api.app.shortcut.com/api/v3/stories',
      {
        name: story.name,
        description: story.description,
        story_type: story.type.toLowerCase(),
        workflow_state_id: BACKLOG_STATE_ID,
        estimate: story.estimate
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    console.log(`✅ Successfully created story: ${story.name}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error creating story:`, error.message);
    return null;
  }
}

// Main function to add all missing stories
async function addMissingStories() {
  try {
    // Get next available IDs
    let nextOCAEID = await getNextAvailableID('OCAE');
    let nextOCDIID = await getNextAvailableID('OCDI');
    
    // Define missing OCAE stories
    const ocaeStories = [
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Implement Communication API with thread management`,
        description: `# Description
This feature implements a Communication API that supports thread-based messaging between users.

# Acceptance Criteria
- Expose POST /api/communications endpoint for creating new messages
- Implement GET /api/communications for retrieving messages
- Add thread management functionality
- Implement proper authentication and authorization
- Add comprehensive test suite
- Document API with Swagger

# Technical Notes
- Implement with MongoDB for storage
- Use WebSockets for real-time updates
- Follow TDD workflow`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Create Invite Management API with tracking capabilities`,
        description: `# Description
Implement an Invite Management API to handle user invitations within the platform.

# Acceptance Criteria
- Create POST /api/invites endpoint for sending invitations
- Implement GET /api/invites for retrieving pending invitations
- Add tracking capabilities for invitation status
- Implement invitation acceptance endpoints
- Create proper validation for all operations
- Add comprehensive test suite

# Technical Notes
- Integrate with existing authentication system
- Store invitation tokens securely
- Add expiration mechanism for invitations`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Implement Notification API with subscription management`,
        description: `# Description
Create a Notification API to handle user notifications with subscription management.

# Acceptance Criteria
- Implement POST /api/notifications for creating notifications
- Add GET /api/notifications for retrieving user notifications
- Create subscription management endpoints
- Support multiple notification channels (email, in-app)
- Add proper validation for all operations
- Create comprehensive test suite

# Technical Notes
- Use publish/subscribe pattern for notification delivery
- Support different notification types and priorities
- Implement message templating system`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Implement Integration Module API for third-party services`,
        description: `# Description
Create a flexible Integration Module API to facilitate connections with third-party services.

# Acceptance Criteria
- Implement POST /api/integrations for creating new integrations
- Add GET /api/integrations for retrieving configured integrations
- Create integration status monitoring endpoints
- Implement authentication for third-party services
- Add proper error handling and reliability
- Create comprehensive test suite

# Technical Notes
- Use adapter pattern for different service types
- Implement robust error handling
- Add retry mechanisms for failed operations`,
        estimate: 8
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Create unified search API across all entity types`,
        description: `# Description
Implement a unified search API that can search across all entity types in the system.

# Acceptance Criteria
- Create GET /api/search endpoint with flexible query parameters
- Support searching across users, companies, documents, and financial reports
- Implement filters for refining search results
- Add pagination and sorting options
- Create proper validation for search parameters
- Add comprehensive test suite

# Technical Notes
- Consider using Elasticsearch for high-performance search
- Implement proper indexing strategy
- Consider performance impacts on large datasets`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Implement webhooks for key entity events`,
        description: `# Description
Create a webhook system to allow external applications to receive notifications about events in the platform.

# Acceptance Criteria
- Implement POST /api/webhooks for registering webhook endpoints
- Add configuration options for event types and delivery settings
- Create webhook delivery tracking and retry mechanisms
- Implement secret key validation for security
- Add comprehensive test suite
- Create proper documentation

# Technical Notes
- Use asynchronous processing for webhook delivery
- Implement proper error handling and retries
- Add monitoring for webhook delivery success rates`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Implement caching layer for frequently accessed endpoints`,
        description: `# Description
Add a caching layer to improve performance of frequently accessed API endpoints.

# Acceptance Criteria
- Implement caching for GET /api/companies and GET /api/users endpoints
- Add cache invalidation mechanisms for data updates
- Ensure data consistency across cache updates
- Implement configurable TTL for cached items
- Add monitoring for cache hit rates
- Create comprehensive test suite

# Technical Notes
- Consider using Redis for distributed caching
- Implement appropriate cache eviction policies
- Balance performance improvements with data freshness requirements`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Add batch operations to SPVAsset API`,
        description: `# Description
Enhance the SPVAsset API with batch operation capabilities for improved performance.

# Acceptance Criteria
- Implement POST /api/spv-assets/batch for creating multiple assets
- Add PATCH /api/spv-assets/batch for updating multiple assets
- Create DELETE /api/spv-assets/batch for removing multiple assets
- Ensure proper transaction handling
- Add comprehensive test suite
- Update API documentation

# Technical Notes
- Implement proper error handling for partial batch failures
- Consider performance implications for large batches
- Maintain audit trail for batch operations`,
        estimate: 3
      },
      {
        type: 'Chore',
        name: `[Chore] OCAE-${nextOCAEID++}: Optimize database queries for high-traffic endpoints`,
        description: `# Description
Optimize database queries for high-traffic API endpoints to improve performance.

# Acceptance Criteria
- Analyze current query performance using profiling tools
- Optimize queries for GET /api/users and GET /api/companies endpoints
- Add appropriate indexes to support common query patterns
- Measure and document performance improvements
- Ensure optimization doesn't break existing functionality
- Update relevant test cases

# Technical Notes
- Use query profiling tools to identify bottlenecks
- Consider database-specific optimization techniques
- Balance query optimization with write performance`,
        estimate: 3
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Create BDD test suite for Integration Module API`,
        description: `# Description
Create a comprehensive Behavior-Driven Development (BDD) test suite for the Integration Module API.

# Acceptance Criteria
- Implement BDD tests for all Integration Module API endpoints
- Cover positive and negative test scenarios
- Add integration tests with mock third-party services
- Achieve minimum 85% test coverage for controllers
- Create test documentation

# Technical Notes
- Use Jest and Supertest for API testing
- Implement proper test fixtures and factories
- Follow OpenCap testing standards`,
        estimate: 3
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Create BDD test suite for Notification API`,
        description: `# Description
Create a comprehensive Behavior-Driven Development (BDD) test suite for the Notification API.

# Acceptance Criteria
- Implement BDD tests for all Notification API endpoints
- Cover notification creation, retrieval, and subscription management
- Test different notification channels
- Achieve minimum 85% test coverage for controllers
- Create test documentation

# Technical Notes
- Use Jest and Supertest for API testing
- Implement test fixtures and factories for notification data
- Mock notification delivery services for testing`,
        estimate: 3
      },
      {
        type: 'Feature',
        name: `[Feature] OCAE-${nextOCAEID++}: Implement performance tests for API endpoints`,
        description: `# Description
Create and implement performance tests for critical API endpoints.

# Acceptance Criteria
- Implement load tests for high-traffic endpoints
- Define performance baselines and thresholds
- Create stress tests to identify breaking points
- Measure and document response times under various loads
- Integrate performance tests with CI pipeline

# Technical Notes
- Use k6 or similar tools for performance testing
- Focus on critical user journeys
- Test both read and write operations
- Consider caching impacts on performance`,
        estimate: 5
      }
    ];
    
    // Define missing OCDI stories
    const ocdiStories = [
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Define data models for Neo4j integration`,
        description: `# Description
Define and implement data models for Neo4j graph database integration.

# Acceptance Criteria
- Define graph schema for user relationships
- Create data models for company ownership structure
- Implement document relationship models
- Ensure compatibility with existing MongoDB models
- Create comprehensive test suite
- Document data model specifications

# Technical Notes
- Focus on relationship-rich entities for graph representation
- Consider performance implications of graph queries
- Maintain data consistency with MongoDB models`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Create Node.js connector service for Neo4j`,
        description: `# Description
Implement a Node.js service to connect and interact with Neo4j graph database.

# Acceptance Criteria
- Create connection management utilities
- Implement CRUD operations for graph entities
- Add transaction support for atomic operations
- Create query builder utilities
- Implement proper error handling
- Create comprehensive test suite

# Technical Notes
- Use official Neo4j JavaScript driver
- Implement connection pooling for performance
- Add retry logic for transient failures`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Design initial Neo4j schema`,
        description: `# Description
Design and implement the initial Neo4j graph database schema.

# Acceptance Criteria
- Define node types and relationship structures
- Create schema constraints and indexes
- Implement schema validation rules
- Document schema design decisions
- Create migration strategy from existing data
- Create test suite for schema validation

# Technical Notes
- Focus on relationship modeling efficiency
- Consider query performance in schema design
- Balance schema flexibility with validation requirements`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Test Airflow-based data pipeline with MinIO`,
        description: `# Description
Test and validate Airflow-based data pipeline integration with MinIO object storage.

# Acceptance Criteria
- Implement test DAGs for Airflow
- Create data processing workflows with MinIO integration
- Test data extraction, transformation, and loading
- Validate error handling and retry mechanisms
- Document pipeline configurations
- Create monitoring dashboards

# Technical Notes
- Containerize Airflow components for testing
- Implement proper S3-compatible API usage
- Consider security best practices for data access`,
        estimate: 3
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Implement bucket creation and object storage in MinIO`,
        description: `# Description
Implement functionality for bucket creation and object storage management in MinIO.

# Acceptance Criteria
- Create API endpoints for bucket management
- Implement object storage and retrieval functionality
- Add metadata management capabilities
- Implement proper access controls
- Create comprehensive test suite
- Document API usage

# Technical Notes
- Use S3-compatible API for MinIO interaction
- Implement proper error handling
- Consider performant file upload/download strategies`,
        estimate: 2
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Configure tiered storage buckets in MinIO`,
        description: `# Description
Configure and implement tiered storage buckets in MinIO for optimized storage costs.

# Acceptance Criteria
- Define hot/warm/cold storage tiers
- Implement lifecycle policies for automatic tiering
- Create monitoring for storage usage by tier
- Document tiering configuration
- Implement cost reporting features
- Create test suite for lifecycle policies

# Technical Notes
- Leverage MinIO lifecycle management features
- Consider storage class transitions
- Implement proper monitoring for transitions`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Implement REST API bridge for Spark integration`,
        description: `# Description
Create a REST API bridge for integrating with Spark data processing.

# Acceptance Criteria
- Implement API endpoints for job submission
- Create job status monitoring endpoints
- Add result retrieval functionality
- Implement proper error handling
- Create comprehensive test suite
- Document API usage

# Technical Notes
- Use Spark REST API for interaction
- Implement proper authentication
- Consider asynchronous job processing patterns`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Create Node.js service for Spark job management`,
        description: `# Description
Implement a Node.js service for managing Spark data processing jobs.

# Acceptance Criteria
- Create job submission utilities
- Implement job lifecycle management
- Add monitoring and alerting capabilities
- Create job template management
- Implement proper error handling
- Create comprehensive test suite

# Technical Notes
- Integrate with existing authentication system
- Consider job scheduling strategies
- Implement proper logging for debugging`,
        estimate: 5
      },
      {
        type: 'Feature',
        name: `[Feature] OCDI-${nextOCDIID++}: Develop pipeline execution service`,
        description: `# Description
Create a service for executing and managing data processing pipelines.

# Acceptance Criteria
- Implement pipeline definition API
- Create pipeline execution engine
- Add monitoring and alerting capabilities
- Implement error handling and recovery
- Create pipeline logging functionality
- Add comprehensive test suite

# Technical Notes
- Consider using Airflow for orchestration
- Implement idempotent pipeline steps
- Add proper retry mechanisms for resilience`,
        estimate: 8
      },
      {
        type: 'Chore',
        name: `[Chore] OCDI-${nextOCDIID++}: Set up testing framework for Spark integration`,
        description: `# Description
Set up a comprehensive testing framework for Spark integration.

# Acceptance Criteria
- Configure unit testing for Spark transformations
- Set up integration testing environment
- Implement test data generation utilities
- Create test result validation tools
- Document testing approach
- Integrate with CI pipeline

# Technical Notes
- Use Spark testing utilities
- Consider containerized testing approach
- Implement proper mocking strategies`,
        estimate: 3
      }
    ];
    
    // Add all OCAE stories
    console.log(`\nAdding ${ocaeStories.length} missing OCAE stories...`);
    for (const story of ocaeStories) {
      await createStory(story);
    }
    
    // Add all OCDI stories
    console.log(`\nAdding ${ocdiStories.length} missing OCDI stories...`);
    for (const story of ocdiStories) {
      await createStory(story);
    }
    
    console.log('\n✅ Completed adding all missing stories to Shortcut.');
    
  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  }
}

// Execute the main function
addMissingStories().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
