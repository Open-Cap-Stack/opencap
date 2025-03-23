# OpenCap Shortcut Integration Guide

This guide outlines how to use the Shortcut API for managing the OpenCap project backlog according to Semantic Seed Venture Studio Coding Standards.

## 1. Authentication Setup

The Shortcut API uses token-based authentication. Your API token should be stored securely in your environment variables.

```bash
# Add to your .env file (DO NOT COMMIT THIS FILE)
SHORTCUT_API_TOKEN="9fea6357-189e-4e20-b0ba-5080b29a2446"

# For terminal use, you can export the variable in your session
export SHORTCUT_API_TOKEN="9fea6357-189e-4e20-b0ba-5080b29a2446"
```

## 2. Backlog Management Standards

### ID Formatting

All backlog items must follow these ID patterns:
- `OCDI-XXX` - OpenCap Data Infrastructure
- `OCAE-XXX` - OpenCap API Enhancement

### Story Types

Stories must be classified as one of:
- `[Feature]` - New functionality
- `[Bug]` - Bug fixes
- `[Chore]` - Maintenance tasks

### Example API Calls

#### List all stories
```bash
curl -X GET \
  -H "Content-Type: application/json" \
  -H "Shortcut-Token: $SHORTCUT_API_TOKEN" \
  "https://api.app.shortcut.com/api/v3/stories"
```

#### Create a new epic
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Shortcut-Token: $SHORTCUT_API_TOKEN" \
  -d '{
    "name": "Data Infrastructure",
    "description": "Core database and infrastructure components"
  }' \
  "https://api.app.shortcut.com/api/v3/epics"
```

#### Create a new story
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Shortcut-Token: $SHORTCUT_API_TOKEN" \
  -d '{
    "name": "[Feature] OCDI-001: Implement Neo4j connector",
    "description": "Create a connector to interact with Neo4j graph database",
    "story_type": "feature",
    "workflow_state_id": YOUR_WORKFLOW_STATE_ID
  }' \
  "https://api.app.shortcut.com/api/v3/stories"
```

## 3. Branch Naming Convention

When creating branches for development:
- `feature/{id}` for new features (e.g., `feature/OCDI-001`)
- `bug/{id}` for bug fixes (e.g., `bug/OCDI-002`)
- `chore/{id}` for maintenance tasks (e.g., `chore/OCDI-003`)

## 4. Commit Message Format

```
# Regular commit
OCDI-001: Implement Neo4j connector

# Work in progress
WIP: OCDI-001: Initial Neo4j connection

# TDD workflow
WIP: OCDI-001: Red tests for Neo4j connector
WIP: OCDI-001: Green tests for Neo4j connector
OCDI-001: Implement Neo4j connector with tests
```

## 5. Pull Request Process

1. Mark story as "Finished" in Shortcut
2. Create PR with the story ID in the title
3. Include story details in the description

```bash
# Update a story status using the API
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "Shortcut-Token: $SHORTCUT_API_TOKEN" \
  -d '{
    "workflow_state_id": YOUR_FINISHED_STATE_ID
  }' \
  "https://api.app.shortcut.com/api/v3/stories/STORY_ID"
```

## 6. Common Epic Structure

OpenCap is organized into the following main epics:

- **Data Infrastructure (OCDI)**
  - Database design and implementation
  - Data models
  - Migration scripts
  - Storage systems

- **API Enhancements (OCAE)**
  - RESTful API endpoints
  - Authentication mechanisms
  - Documentation
  - API testing

- **User Interface**
  - Frontend components
  - UX improvements
  - Responsive design

- **Security & Compliance**
  - Access control
  - Audit logging
  - Compliance features

## 7. Story Templates

### Feature Template
```
[Feature] OCDI-XXX: Feature Name

## Description
Detailed description of the feature

## Acceptance Criteria
- Criterion 1
- Criterion 2

## Technical Notes
Implementation details

## Test Cases
- Test case 1
- Test case 2
```

### Bug Template
```
[Bug] OCDI-XXX: Bug Name

## Description
Description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2

## Expected Behavior
What should happen

## Actual Behavior
What happens instead

## Root Cause Analysis
Analysis of the issue
```

### Chore Template
```
[Chore] OCDI-XXX: Chore Name

## Description
Description of the maintenance task

## Justification
Why this work is needed

## Implementation Details
Technical details
```

## 8. API Reference

Full API documentation can be found at:
https://developer.shortcut.com/api/rest/v3

## 9. Automation Script

A Node.js script is available at `/scripts/shortcut-api.js` that provides helper functions for common operations:

```javascript
// Examples of how to use the script
const shortcut = require('./scripts/shortcut-api');

// Create a new story
shortcut.createStory({
  name: "[Feature] OCDI-004: Implement data migration",
  description: "Create a data migration system for schema updates",
  type: "feature",
  epicId: 123
});

// Update story status
shortcut.updateStoryState(1234, "In Progress");
```

Remember to follow the daily commit requirements, even for incomplete work, by using the "WIP:" prefix in commit messages.
