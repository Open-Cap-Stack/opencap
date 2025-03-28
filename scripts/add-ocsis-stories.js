/**
 * Add OCSIS stories to Shortcut
 * Following Semantic Seed Venture Studio Coding Standards
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const BACKLOG_STATE_ID = 500000006; // ID for "Backlog" state

// Create a new story with proper formatting
async function createStory(story) {
  try {
    console.log(`Creating story: ${story.name}...`);
    
    // Validate story name format
    if (!story.name.match(/^\[(Feature|Bug|Chore)\] OCSIS-\d+/)) {
      console.warn('Warning: Story name does not follow format "[Type] OCSIS-XXX: Name"');
    }
    
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

// Define all OCSIS stories from the sprint plan
const ocsisStories = [
  // Sprint 1: Foundation Setup (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-001: Setup project infrastructure',
    description: `# Description
Create monorepo structure with TypeScript configuration for the OpenCap Shortcut Integration Suite.

# Acceptance Criteria
- Lerna monorepo initialized
- TypeScript configured with strict mode
- ESLint with SSCS rules
- Jest testing framework configured
- GitHub Actions CI pipeline setup

# Technical Notes
- Follow Semantic Seed standards for project structure
- Ensure all CI workflows enforce TDD practices
- Configure TypeScript with strict type checking`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-002: Implement authentication module',
    description: `# Description
Create secure authentication for Shortcut API with token management.

# Acceptance Criteria
- Token-based authentication
- Environment variable integration
- Token validation
- Secure token storage handling
- 90% test coverage

# Technical Notes
- Use environment variables for token storage
- Implement token rotation capabilities
- Add token validation to prevent API errors`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-003: Create base API client',
    description: `# Description
Implement HTTP client for Shortcut API with error handling, retry logic, and rate limiting.

# Acceptance Criteria
- Axios-based client with interceptors
- Error handling with retries
- Rate limiting support
- Request/response logging
- 90% test coverage

# Technical Notes
- Use Axios for HTTP requests
- Implement exponential backoff for retries
- Add request/response interceptors for logging and error handling`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-004: Implement SSCS validation utilities',
    description: `# Description
Create validation utilities for Semantic Seed standards enforcement.

# Acceptance Criteria
- Story name format validation
- Branch name validation
- Commit message validation
- ID format checkers
- 90% test coverage

# Technical Notes
- Use regex for validation patterns
- Create utility functions for each validation type
- Return detailed error messages for validation failures`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-005: Set up documentation framework',
    description: `# Description
Establish documentation infrastructure for the project.

# Acceptance Criteria
- TypeDoc configuration
- README templates
- API documentation structure
- Example documentation

# Technical Notes
- Configure TypeDoc to generate from JSDoc comments
- Create consistent README templates across packages
- Set up documentation website structure`,
    estimate: 2
  },
  
  // Sprint 2: Core Resources (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-006: Implement Story resource',
    description: `# Description
Complete Story resource with CRUD operations and validation.

# Acceptance Criteria
- Create, read, update, delete operations
- Search and filter capabilities
- Pagination handling
- Story format validation
- 90% test coverage

# Technical Notes
- Implement resource as a class with methods for each operation
- Add validation for story format according to SSCS
- Handle pagination with cursor-based approach`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-007: Implement Workflow resource',
    description: `# Description
Complete Workflow resource with state transitions and validation.

# Acceptance Criteria
- Get workflows and states
- Transition story between states
- State validation
- Workflow visualization helpers
- 90% test coverage

# Technical Notes
- Implement state transition validation
- Add workflow visualization utilities
- Create helper methods for common workflow operations`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-008: Implement Member resource',
    description: `# Description
Complete Member resource for user management.

# Acceptance Criteria
- Get members and teams
- Assignment operations
- Member filtering
- 90% test coverage

# Technical Notes
- Implement methods for member operations
- Add team management capabilities
- Create utilities for member assignment`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-009: Create caching layer',
    description: `# Description
Implement caching for API responses to improve performance.

# Acceptance Criteria
- In-memory caching
- Cache invalidation rules
- Configurable TTL
- Cache bypass options
- 90% test coverage

# Technical Notes
- Use in-memory LRU cache
- Implement cache invalidation on mutations
- Add configuration options for TTL and size limits`,
    estimate: 5
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-010: Core library integration tests',
    description: `# Description
Establish integration test suite for core library components.

# Acceptance Criteria
- Story lifecycle tests
- Workflow transition tests
- Error handling tests
- Rate limit handling tests

# Technical Notes
- Use nock for API mocking
- Create end-to-end tests with real API
- Implement test environments with configuration`,
    estimate: 3
  },
  
  // Sprint 3: Secondary Resources (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-011: Implement Epic resource',
    description: `# Description
Complete Epic resource with CRUD operations.

# Acceptance Criteria
- Create, read, update, delete operations
- Story association
- Filtering and search
- 90% test coverage

# Technical Notes
- Implement methods for epic management
- Add story association capabilities
- Create utilities for epic filtering and search`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-012: Implement Label resource',
    description: `# Description
Complete Label resource with CRUD operations.

# Acceptance Criteria
- Create, read, update, delete operations
- Story association
- Label search
- 90% test coverage

# Technical Notes
- Implement methods for label management
- Add label association with stories
- Create utilities for label searching`,
    estimate: 2
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-013: Implement Comment resource',
    description: `# Description
Complete Comment resource for story discussions.

# Acceptance Criteria
- Create, read, update, delete operations
- Threaded comments
- Mention handling
- 90% test coverage

# Technical Notes
- Implement methods for comment management
- Add threaded comment support
- Create utilities for mention detection and handling`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-014: Implement File resource',
    description: `# Description
Complete File attachment handling for stories.

# Acceptance Criteria
- File upload/download
- Attachment to stories
- Mime type handling
- 90% test coverage

# Technical Notes
- Implement file upload/download methods
- Add file attachment to stories
- Create utilities for mime type detection`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-015: Documentation for all resources',
    description: `# Description
Document all implemented resources with examples and TypeScript interfaces.

# Acceptance Criteria
- JSDoc for all methods
- Usage examples
- TypeScript interfaces
- Error handling documentation

# Technical Notes
- Create consistent documentation style
- Add examples for all operations
- Document error handling and recovery strategies`,
    estimate: 3
  },
  
  // Sprint 4: Advanced Features (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-016: Implement search & filtering',
    description: `# Description
Advanced search capabilities for stories and other resources.

# Acceptance Criteria
- Complex query building
- Multi-resource search
- Filter chaining
- Result formatting
- 90% test coverage

# Technical Notes
- Implement query builder pattern
- Add filter chaining capabilities
- Create result formatters for different output types`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-017: Webhook integration',
    description: `# Description
Support for Shortcut webhooks to enable real-time updates.

# Acceptance Criteria
- Webhook creation/management
- Event handlers
- Signature validation
- 90% test coverage

# Technical Notes
- Implement webhook registration methods
- Add event handlers for different webhook types
- Create signature validation for security`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-018: Batch operations',
    description: `# Description
Support for bulk API operations to improve performance.

# Acceptance Criteria
- Story batch updates
- Workflow batch transitions
- Error handling for partial success
- 90% test coverage

# Technical Notes
- Implement batch methods for story updates
- Add batch transition support
- Create error handling for partial successes`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-019: Workflow utilities',
    description: `# Description
Helpers for TDD workflow following Semantic Seed standards.

# Acceptance Criteria
- Next story selection
- Progress tracking
- Daily WIP detection
- 90% test coverage

# Technical Notes
- Implement next story algorithm
- Add progress tracking utilities
- Create daily WIP commit detection`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-020: Package for release',
    description: `# Description
Prepare core library for release to npm.

# Acceptance Criteria
- Package.json configuration
- NPM publishing setup
- Versioning setup
- Release documentation

# Technical Notes
- Configure package.json for publishing
- Set up semantic versioning
- Create release scripts and documentation`,
    estimate: 2
  },
  
  // Sprint 5: CLI Foundation (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-021: CLI framework setup',
    description: `# Description
Establish CLI application structure with command pattern.

# Acceptance Criteria
- Command pattern implementation
- Global options handling
- Help system
- Error handling
- 90% test coverage

# Technical Notes
- Use commander or yargs for CLI framework
- Implement command pattern for extensibility
- Create comprehensive help system`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-022: Configuration management',
    description: `# Description
Implement settings and configuration management for CLI.

# Acceptance Criteria
- Local/global config files
- Environment variable integration
- Config validation
- Default settings
- 90% test coverage

# Technical Notes
- Use cosmiconfig for configuration loading
- Implement environment variable overrides
- Create configuration validation`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-023: Story commands - basics',
    description: `# Description
Implement core story operations in CLI.

# Acceptance Criteria
- List, get, create, update stories
- Tabular output
- Filtering options
- 90% test coverage

# Technical Notes
- Implement story commands with options
- Add tabular output formatting
- Create filtering capabilities`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-024: Workflow commands',
    description: `# Description
Implement workflow operations in CLI.

# Acceptance Criteria
- List workflows and states
- Transition stories
- State validation
- 90% test coverage

# Technical Notes
- Implement workflow commands with options
- Add state transition validation
- Create workflow visualization in terminal`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-025: CLI documentation',
    description: `# Description
Document CLI commands with examples and help text.

# Acceptance Criteria
- Help text
- Man pages
- Examples for all commands
- Error resolution guidance

# Technical Notes
- Create help text for all commands
- Generate man pages for installation
- Add comprehensive examples`,
    estimate: 2
  },
  
  // Sprint 6: CLI Advanced (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-026: Output formatters',
    description: `# Description
Implement multiple output formats for CLI commands.

# Acceptance Criteria
- Table, JSON, CSV formats
- Custom format templates
- Color highlighting
- 90% test coverage

# Technical Notes
- Implement format selection options
- Add color support for terminal
- Create custom format templates`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-027: Interactive mode',
    description: `# Description
Create interactive shell for CLI operations.

# Acceptance Criteria
- Command completion
- Interactive prompts
- History management
- 90% test coverage

# Technical Notes
- Use inquirer for interactive prompts
- Implement command completion
- Add history management`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-028: Git integration',
    description: `# Description
Add git workflow integration to CLI.

# Acceptance Criteria
- Branch creation from stories
- Commit message formatting
- Branch naming validation
- 90% test coverage

# Technical Notes
- Use nodegit or simple-git for git operations
- Implement branch creation from stories
- Add commit message formatting`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-029: Story templates',
    description: `# Description
Implement story creation templates for CLI.

# Acceptance Criteria
- Template management
- Placeholder substitution
- Custom templates
- 90% test coverage

# Technical Notes
- Create template system with placeholders
- Implement template management commands
- Add custom template support`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-030: Environment testing',
    description: `# Description
Test CLI in different environments to ensure compatibility.

# Acceptance Criteria
- macOS, Linux, Windows compatibility
- CI tests for all platforms
- Environment-specific documentation

# Technical Notes
- Set up CI testing for multiple platforms
- Create platform-specific documentation
- Fix any platform-specific issues`,
    estimate: 2
  },
  
  // Sprint 7: Reporting & Advanced Features (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-031: Sprint reporting',
    description: `# Description
Create sprint status reports with CLI.

# Acceptance Criteria
- Current sprint progress
- Velocity metrics
- Story completion rate
- Blocker identification
- 90% test coverage

# Technical Notes
- Implement sprint reporting commands
- Add velocity calculation
- Create blocker identification`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-032: Backlog analysis',
    description: `# Description
Implement backlog health metrics and analysis.

# Acceptance Criteria
- Duplicate detection
- Format compliance checking
- Priority analysis
- Recommendations
- 90% test coverage

# Technical Notes
- Implement backlog analysis commands
- Add duplicate detection algorithms
- Create priority analysis utilities`,
    estimate: 5
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-033: Story prioritization',
    description: `# Description
Add prioritization tools to CLI.

# Acceptance Criteria
- Priority scoring
- Reordering utilities
- Bulk priority updates
- 90% test coverage

# Technical Notes
- Implement story prioritization commands
- Add bulk priority update capabilities
- Create priority visualization`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-034: TDD workflow helpers',
    description: `# Description
Support TDD process in CLI following Semantic Seed standards.

# Acceptance Criteria
- Red/Green/Refactor tracking
- Test coverage verification
- WIP commit helpers
- 90% test coverage

# Technical Notes
- Implement TDD workflow commands
- Add coverage verification integration
- Create WIP commit helpers`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-035: Package CLI for distribution',
    description: `# Description
Prepare CLI for package release.

# Acceptance Criteria
- Binary bundling
- Installation scripts
- Update mechanisms
- Release documentation

# Technical Notes
- Configure package.json for CLI distribution
- Create binary builds with pkg or nexe
- Add installation and update scripts`,
    estimate: 2
  },
  
  // Sprint 8: Finalization and Release (2 weeks)
  {
    type: 'Feature',
    name: '[Feature] OCSIS-036: Integration examples',
    description: `# Description
Create comprehensive examples of OCSIS usage.

# Acceptance Criteria
- Real-world workflows
- Complete project examples
- CI/CD integration examples
- 90% test coverage

# Technical Notes
- Create example projects and workflows
- Add CI/CD integration examples
- Document real-world usage scenarios`,
    estimate: 3
  },
  {
    type: 'Feature',
    name: '[Feature] OCSIS-037: Improved error handling',
    description: `# Description
Enhance error messages and recovery mechanisms.

# Acceptance Criteria
- User-friendly error messages
- Recovery suggestions
- Error codes and documentation
- 90% test coverage

# Technical Notes
- Improve error message formatting
- Add recovery suggestions for common errors
- Create error code documentation`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-038: Comprehensive documentation',
    description: `# Description
Complete user and API documentation for release.

# Acceptance Criteria
- Getting started guide
- API reference
- Best practices
- Troubleshooting guide

# Technical Notes
- Create comprehensive documentation website
- Add getting started tutorials
- Document API reference and best practices`,
    estimate: 5
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-039: User acceptance testing',
    description: `# Description
Conduct UAT with development team.

# Acceptance Criteria
- Test plan
- Feedback collection
- Issue prioritization
- Fix verification

# Technical Notes
- Create test plan for UAT
- Set up feedback collection system
- Implement issue tracking and prioritization`,
    estimate: 3
  },
  {
    type: 'Chore',
    name: '[Chore] OCSIS-040: Release v1.0',
    description: `# Description
Prepare and execute full release of OCSIS v1.0.

# Acceptance Criteria
- Version finalization
- Release notes
- Distribution packaging
- Announcement preparation

# Technical Notes
- Create final release builds
- Write detailed release notes
- Prepare announcement materials`,
    estimate: 2
  }
];

// Add all stories to Shortcut
async function addOcsisStories() {
  try {
    console.log(`Adding ${ocsisStories.length} OCSIS stories to Shortcut...`);
    
    let successCount = 0;
    for (const story of ocsisStories) {
      const result = await createStory(story);
      if (result) successCount++;
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log(`\n✅ Added ${successCount}/${ocsisStories.length} stories successfully to Shortcut.`);
  } catch (error) {
    console.error('Script execution failed:', error);
  }
}

// Execute the main function
addOcsisStories();
