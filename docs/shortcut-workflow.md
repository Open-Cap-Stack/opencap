# OpenCap Shortcut API Workflow
*Semantic Seed Venture Studio - Backlog Management Documentation*

## Overview
This document outlines the complete workflow for managing the OpenCap backlog using Shortcut API scripts. It provides a step-by-step guide to ensure consistent workflow management following Semantic Seed standards.

## Key Scripts Reference

| Script | Purpose | Example |
|--------|---------|---------|
| `list-all-stories.js` | List all stories with their states | `node scripts/list-all-stories.js` |
| `get-next-story.js` | Find the next story to work on | `node scripts/get-next-story.js` |
| `search-stories.js` | Search for specific stories | `node scripts/search-stories.js "OCAE-208"` |
| `move-story-to-todo.js` | Move a story to "To Do" state | `node scripts/move-story-to-todo.js 79` |
| `update-story-status.js` | Update a story's workflow state | `node scripts/update-story-status.js 79 "In Progress"` |

## Complete Workflow Sequence

### 1. Initial Setup
Ensure your `.env` file contains the proper Shortcut API token:
```
SHORTCUT_API_TOKEN=your-token-here
```

### 2. Backlog Exploration & Management

#### View All Stories
To view all stories in the backlog:
```bash
node scripts/list-all-stories.js
```
This displays stories sorted by workflow state, including their numeric IDs and formatted IDs (e.g., OCAE-208).

#### Search for Specific Stories
To find stories by name, ID, or type:
```bash
node scripts/search-stories.js "OCAE"     # Find all OCAE-prefixed stories
node scripts/search-stories.js "auth"     # Find stories related to authentication
node scripts/search-stories.js "79"       # Find story with ID 79
```

#### Prepare Stories for Development
Move a story from "Backlog" to "To Do" state to make it ready for development:
```bash
node scripts/move-story-to-todo.js 79     # Move story ID 79 to "To Do" state
```

### 3. Starting Work on a Story

#### Find the Next Story to Work On
```bash
node scripts/get-next-story.js
```

This script:
1. Prioritizes properly formatted stories (OCAE-XXX or OCDI-XXX) in "To Do" state
2. Displays the story details and formatted ID
3. Provides step-by-step instructions for the workflow

#### Begin Development
Follow the steps provided by `get-next-story.js`:

1. Create a branch using the formatted ID:
   ```bash
   git checkout -b feature/OCAE-208
   ```

2. Update the story status to "In Progress":
   ```bash
   node scripts/update-story-status.js 79 "In Progress"
   ```

3. Follow TDD workflow with proper commit messages:
   ```bash
   # First commit (failing tests)
   git commit -m "WIP: OCAE-208: Red tests for [feature]"
   
   # Second commit (passing tests)
   git commit -m "WIP: OCAE-208: Green tests for [feature]"
   
   # Final commit
   git commit -m "OCAE-208: Implement [feature]"
   ```

4. When work is complete, mark the story as "Done":
   ```bash
   node scripts/update-story-status.js 79 "Done"
   ```

## ID System Reference

OpenCap uses two parallel ID systems for stories:

1. **Numeric Shortcut IDs**: 
   - Example: `79`, `80`, `81`
   - Used for API calls: `node scripts/update-story-status.js 79 "Done"`

2. **Formatted Story IDs**:
   - Example: `OCAE-208`, `OCDI-103`
   - Used in branch names: `feature/OCAE-208`
   - Used in commit messages: `OCAE-208: Implement feature`

## Script Details

### shortcut-api.js
Core API integration module providing these functions:

```javascript
// Main functions
getStories(filterOptions) // Get filtered stories
getWorkflows()            // Get workflow states
getStory(id)              // Get a single story by ID
updateStoryWorkflowState(id, stateId) // Update story state
getNextStory()            // Get top unstarted story
getUnstartedStories()     // Get all unstarted stories
```

### get-next-story.js
Identifies the next story following these rules:
1. Finds all stories in "To Do" state
2. Prioritizes properly formatted stories (OCAE-XXX, OCDI-XXX)
3. Sorts by position for priority
4. Provides complete workflow guidance

### move-story-to-todo.js
Updates a story's workflow state to "To Do":
1. Fetches workflows to identify the "To Do" state ID
2. Updates the story's state via API
3. Confirms the update with formatted ID

### search-stories.js
Searches through stories with flexible matching:
1. Case-insensitive name matching
2. Exact numeric ID matching
3. Formatted ID matching (OCAE-XXX)
4. Displays results with workflow states and story types

### update-story-status.js
Changes a story's workflow state:
1. Takes numeric ID and state name as parameters
2. Finds the corresponding state ID for the given name
3. Updates the story via the API

## Best Practices

1. **Always use properly formatted stories**:
   - Stories should include formatted IDs (OCAE-XXX or OCDI-XXX)
   - If no formatted stories are in "To Do", move one there with `move-story-to-todo.js`

2. **Follow the exact TDD workflow**:
   - Red tests → Green tests → Refactor
   - Use the prescribed commit message format

3. **Use the correct ID format**:
   - API operations: Use numeric IDs
   - Git operations: Use formatted IDs

4. **Keep the backlog organized**:
   - Regularly review and update story statuses
   - Move the next priority stories to "To Do" state

## Troubleshooting

If you encounter API errors:
1. Verify your `SHORTCUT_API_TOKEN` is correct
2. Check the API endpoint status
3. Examine error messages for specific issues
4. Look for invalid state transitions

## API Reference

- Shortcut API Documentation: https://developer.shortcut.com/api/rest/v3
- Key endpoints used:
  - `/stories/search` (POST): Find stories by criteria
  - `/stories/{story_id}` (GET/PUT): Get or update a story
  - `/workflows` (GET): Get workflow states
