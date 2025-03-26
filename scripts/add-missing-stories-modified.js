/**
 * OCAE-210: Script to add missing stories to Shortcut
 * Following Semantic Seed Venture Studio Coding Standards
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const BACKLOG_STATE_ID = 500000006; // ID for "Backlog" state

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
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

// Main function to add all missing stories
async function addMissingStories() {
  try {
    // Starting IDs for new stories (based on last observed IDs in Shortcut)
    let nextOCAEID = 600; // Start new stories from OCAE-600 series
    let nextOCDIID = 300; // Start new stories from OCDI-300 series
    
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
      }
    ];
    
    // Add OCAE stories first
    console.log(`\nAdding ${ocaeStories.length} missing OCAE stories...`);
    for (let i = 0; i < ocaeStories.length; i++) {
      await createStory(ocaeStories[i]);
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Add OCDI stories
    console.log(`\nAdding ${ocdiStories.length} missing OCDI stories...`);
    for (let i = 0; i < ocdiStories.length; i++) {
      await createStory(ocdiStories[i]);
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
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
