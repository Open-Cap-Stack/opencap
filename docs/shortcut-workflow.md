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
| `archive-unformatted-stories.js` | Archive unformatted stories | `node scripts/archive-unformatted-stories.js` |
| `add-missing-stories-modified.js` | Add missing stories to Shortcut | `node scripts/add-missing-stories-modified.js` |
| `organize-stories.js` | Organize stories by priority and remove duplicates | `node scripts/organize-stories.js` |

## Complete Script Library Reference

Below is a comprehensive reference of all Shortcut API scripts we've created for the OpenCap project. These scripts follow the Semantic Seed Venture Studio Coding Standards and can be repurposed for other projects.

### Core API Module

#### shortcut-api.js

The foundation library that provides all core Shortcut API interactions following the Semantic Seed standards.

```javascript
/**
 * Shortcut API Integration Script for OpenCap
 * 
 * This script provides helper functions for interacting with the Shortcut API
 * according to Semantic Seed Venture Studio Coding Standards.
 */

const axios = require('axios');
require('dotenv').config();

// API Configuration
const API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const API_BASE_URL = 'https://api.app.shortcut.com/api/v3';

// Request headers
const headers = {
  'Content-Type': 'application/json',
  'Shortcut-Token': API_TOKEN
};

// Create a new story in Shortcut
async function createStory(storyData) {
  // Validate story name format
  if (!storyData.name.match(/^\[(Feature|Bug|Chore)\] OC(DI|AE)-\d+:/)) {
    console.warn('Warning: Story name does not follow format "[Type] ID: Name"');
  }
  
  const payload = {
    name: storyData.name,
    description: storyData.description,
    story_type: storyData.type,
    workflow_state_id: storyData.workflowStateId
  };
  
  if (storyData.epicId) {
    payload.epic_id = storyData.epicId;
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/stories`, payload, { headers });
    console.log(`Story created: ${response.data.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    console.error('Error creating story:', error.response?.data || error.message);
    throw error;
  }
}

// Get stories using search
async function getStories(params = {}) {
  try {
    const searchParams = {
      ...params
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/stories/search`,
      searchParams,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting stories:', error.response?.data || error.message);
    throw error;
  }
}

// Get workflow states
async function getWorkflows() {
  try {
    const response = await axios.get(`${API_BASE_URL}/workflows`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error getting workflows:', error.response?.data || error.message);
    throw error;
  }
}

// Export all functions
module.exports = {
  createStory,
  updateStoryWorkflowState,
  getStories,
  getStory,
  getWorkflows,
  getUnstartedStories,
  getNextStory
  // Additional functions...
};
```

### Story Management Scripts

#### list-all-stories.js

Lists all stories in the Shortcut backlog with their current states. Essential for backlog auditing.

```javascript
/**
 * List all stories in the Shortcut backlog
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');

async function listAllStories() {
  try {
    console.log('Fetching all stories from Shortcut...\n');
    
    // Get all stories without filtering
    const stories = await shortcutApi.getStories();
    
    if (!stories || stories.length === 0) {
      console.log('No stories found');
      return;
    }
    
    console.log(`Found ${stories.length} stories:\n`);
    console.log('| Numeric ID | Formatted ID | Name | State |');
    console.log('|------------|--------------|------|-------|');
    
    // Sort stories by workflow state
    const sortedStories = stories.sort((a, b) => {
      return a.workflow_state_name.localeCompare(b.workflow_state_name);
    });
    
    // Extract formatted ID from story name (OCAE-XXX or OCDI-XXX)
    sortedStories.forEach(story => {
      const match = story.name.match(/\[(Feature|Bug|Chore)\] (OCAE|OCDI)-(\d+)/);
      const formattedId = match ? match[2] + '-' + match[3] : 'N/A';
      
      // Truncate long names
      const name = story.name.length > 40 ? story.name.substring(0, 40) + '...' : story.name;
      
      console.log(`| ${story.id} | ${formattedId} | ${name} | ${story.workflow_state_name} |`);
    });
    
  } catch (error) {
    console.error('Error listing stories:', error);
  }
}

listAllStories();
```

#### get-next-story.js

Provides intelligent next story selection following the test-driven development workflow required by Semantic Seed standards.

```javascript
/**
 * Get the next story to work on
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');

async function getNextStory() {
  try {
    console.log('Finding the next story to work on...\n');
    
    // Get unstarted stories
    const stories = await shortcutApi.getUnstartedStories();
    
    if (!stories || stories.length === 0) {
      console.log('No unstarted stories found in "To Do" state.');
      console.log('Use move-story-to-todo.js to move a story to the "To Do" state.');
      return;
    }
    
    // Prioritize properly formatted stories (OCAE-XXX or OCDI-XXX)
    const formattedStories = stories.filter(story => 
      story.name.match(/\[(Feature|Bug|Chore)\] (OCAE|OCDI)-\d+/)
    );
    
    if (formattedStories.length === 0) {
      console.log('No properly formatted stories found in "To Do" state.');
      console.log('All stories should follow the format "[Type] OCAE-XXX: Name"');
      return;
    }
    
    // Sort by position (priority)
    const sortedStories = formattedStories.sort((a, b) => a.position - b.position);
    const nextStory = sortedStories[0];
    
    // Extract formatted ID for branch naming
    const match = nextStory.name.match(/\[(Feature|Bug|Chore)\] (OCAE|OCDI)-(\d+)/);
    const type = match[1].toLowerCase();
    const formattedId = match[2] + '-' + match[3];
    
    console.log('Next story to work on:');
    console.log(`ID: ${nextStory.id}`);
    console.log(`Name: ${nextStory.name}`);
    console.log(`Description: ${nextStory.description || 'No description'}`);
    console.log(`Type: ${type}`);
    console.log(`Formatted ID: ${formattedId}`);
    
    console.log('\nWorkflow steps:');
    console.log(`1. Create a branch: git checkout -b ${type}/${formattedId}`);
    console.log(`2. Update the story status: node scripts/update-story-status.js ${nextStory.id} "In Progress"`);
    console.log('3. Follow TDD workflow:');
    console.log(`   - First commit: git commit -m "WIP: ${formattedId}: Red tests for [feature]"`);
    console.log(`   - Second commit: git commit -m "WIP: ${formattedId}: Green tests for [feature]"`);
    console.log(`   - Final commit: git commit -m "${formattedId}: Implement [feature]"`);
    console.log(`4. When complete: node scripts/update-story-status.js ${nextStory.id} "Done"`);
    
    return nextStory;
  } catch (error) {
    console.error('Error getting next story:', error);
  }
}

getNextStory();
```

#### update-story-status.js

Updates a story's workflow state, essential for tracking progress according to Semantic Seed standards.

```javascript
/**
 * Update a story's workflow state
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');

async function updateStoryStatus() {
  try {
    // Get command line arguments
    const storyId = parseInt(process.argv[2], 10);
    const stateName = process.argv[3];
    
    if (!storyId || !stateName) {
      console.log('Usage: node update-story-status.js STORY_ID STATE_NAME');
      console.log('Example: node update-story-status.js 123 "In Progress"');
      console.log('\nAvailable states:');
      console.log('- "Backlog"');
      console.log('- "To Do"');
      console.log('- "In Progress"');
      console.log('- "Done"');
      return;
    }
    
    // Get the story to verify it exists
    const story = await shortcutApi.getStory(storyId);
    console.log(`Found story: ${story.name}`);
    
    // Get workflows to find the state ID
    const workflows = await shortcutApi.getWorkflows();
    const primaryWorkflow = workflows[0];
    
    // Find the workflow state by name
    const state = primaryWorkflow.states.find(s => 
      s.name.toLowerCase() === stateName.toLowerCase()
    );
    
    if (!state) {
      console.log(`Error: State "${stateName}" not found in workflows.`);
      console.log('Available states:');
      primaryWorkflow.states.forEach(s => console.log(`- "${s.name}"`));
      return;
    }
    
    // Update the story state
    await shortcutApi.updateStoryWorkflowState(storyId, state.id);
    
    // Extract formatted ID
    const match = story.name.match(/\[(Feature|Bug|Chore)\] (OCAE|OCDI)-(\d+)/);
    const formattedId = match ? match[2] + '-' + match[3] : 'N/A';
    
    console.log(`✅ Story ${storyId} (${formattedId}) updated to "${state.name}" state.`);
    
  } catch (error) {
    console.error('Error updating story status:', error);
  }
}

updateStoryStatus();
```

### Backlog Maintenance Scripts

#### archive-unformatted-stories.js

Archives stories that don't follow the Semantic Seed naming convention, keeping the backlog clean.

```javascript
/**
 * Archive unformatted stories to maintain backlog cleanliness
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');

async function findUnformattedStories() {
  try {
    console.log('Finding unformatted stories...\n');
    
    // Get all stories
    const allStories = await shortcutApi.getStories();
    
    // Filter out stories that don't follow the proper format
    const unformattedStories = allStories.filter(story => {
      return !story.name.match(/^\[(Feature|Bug|Chore)\] (OCAE|OCDI)-\d+/);
    });
    
    console.log(`Found ${unformattedStories.length} unformatted stories.`);
    
    return unformattedStories;
  } catch (error) {
    console.error('Error finding unformatted stories:', error);
    return [];
  }
}

async function archiveStories(stories) {
  let successCount = 0;
  
  for (const story of stories) {
    try {
      console.log(`Archiving story ${story.id}: ${story.name}...`);
      
      // Update the story to be archived
      await axios.put(
        `${API_BASE_URL}/stories/${story.id}`,
        { archived: true },
        { headers }
      );
      
      console.log(`✅ Successfully archived story ${story.id}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error archiving story ${story.id}:`, error.message);
    }
  }
  
  console.log(`\nArchiving complete: ${successCount}/${stories.length} stories archived successfully`);
}

async function main() {
  const unformattedStories = await findUnformattedStories();
  
  if (unformattedStories.length === 0) {
    console.log('No unformatted stories to archive. Backlog is clean!');
    return;
  }
  
  console.log('\nThe following stories will be archived:');
  unformattedStories.forEach(story => {
    console.log(`- ${story.id}: ${story.name} (${story.workflow_state_name})`);
  });
  
  // Ask for confirmation
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\nDo you want to archive these stories? (y/n) ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await archiveStories(unformattedStories);
    } else {
      console.log('Archiving cancelled');
    }
    
    readline.close();
  });
}

main();
```

#### add-missing-stories-modified.js

Creates properly formatted stories in Shortcut when they're missing from the backlog but present in sprint planning documents.

```javascript
/**
 * Add missing stories to Shortcut
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
    if (!story.name.match(/^\[(Feature|Bug|Chore)\] (OCAE|OCDI)-\d+/)) {
      console.warn('Warning: Story name does not follow format "[Type] ID: Name"');
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

// Define a batch of missing stories
const missingStories = [
  {
    type: 'Feature',
    name: '[Feature] OCAE-602: Implement Notification API with subscription management',
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
  }
];

// Add all missing stories
async function addMissingStories() {
  try {
    console.log(`Adding ${missingStories.length} missing stories...`);
    
    let successCount = 0;
    for (const story of missingStories) {
      const result = await createStory(story);
      if (result) successCount++;
      
      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n✅ Added ${successCount}/${missingStories.length} stories successfully.`);
  } catch (error) {
    console.error('Script execution failed:', error);
  }
}

addMissingStories();
```

#### organize-stories.js

Essential for maintaining proper story prioritization according to Semantic Seed standards.

```javascript
/**
 * Organize stories by priority and identify duplicates
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');

// Semantic Seed prioritization (security first, infrastructure next, etc.)
const PRIORITY_ORDER = [
  // Security stories first (always highest priority)
  'OCAE-302', // Role-based access control
  'OCAE-304', // Secure header configuration
  'OCAE-305', // API rate limiting
  
  // Core infrastructure next
  'OCDI-201', // Financial data import/export
  'OCDI-202', // Financial reporting models
  'OCDI-300', // Data models for Neo4j integration
  
  // Critical features
  'OCAE-204', // Company management API
  'OCAE-605', // Webhooks for key entity events
  
  // Supporting features
  'OCAE-600', // Communication API
  'OCAE-601', // Invite Management API
  
  // DevOps and testing last
  'OCAE-501', // Jest testing framework
  'OCAE-504', // End-to-end test suite
];

// Extract formatted ID (e.g., OCAE-302) from story name
function getFormattedId(name) {
  const match = name.match(/\[(Feature|Bug|Chore)\] (OCAE|OCDI)-(\d+)/);
  return match ? match[2] + '-' + match[3] : null;
}

// Find duplicate stories to clean up the backlog
function findDuplicates(stories) {
  const storyMap = {};
  const duplicates = [];
  
  stories.forEach(story => {
    const formattedId = getFormattedId(story.name);
    if (formattedId) {
      if (!storyMap[formattedId]) {
        storyMap[formattedId] = [];
      }
      storyMap[formattedId].push(story);
    }
  });
  
  // Find duplicate stories
  Object.entries(storyMap)
    .filter(([_, storyList]) => storyList.length > 1)
    .forEach(([id, storyList]) => {
      duplicates.push({ id, stories: storyList });
    });
  
  return duplicates;
}

// Sort stories according to Semantic Seed priority order
function sortStoriesByPriority(stories) {
  return stories.sort((a, b) => {
    const idA = getFormattedId(a.name);
    const idB = getFormattedId(b.name);
    
    // Sort by priority if both stories have IDs in the priority list
    if (idA && idB) {
      const priorityA = PRIORITY_ORDER.indexOf(idA);
      const priorityB = PRIORITY_ORDER.indexOf(idB);
      
      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB;
      }
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;
    }
    
    // Default to original order
    return a.position - b.position;
  });
}

// Main function to analyze and organize the backlog
async function organizeStories() {
  try {
    console.log('Analyzing Shortcut backlog...');
    
    // Get all backlog stories
    const workflows = await shortcutApi.getWorkflows();
    const backlogState = workflows[0].states.find(s => s.name === 'Backlog');
    
    if (!backlogState) {
      console.error('Could not find "Backlog" state');
      return;
    }
    
    const stories = await shortcutApi.getStories({
      workflow_state_id: backlogState.id
    });
    
    console.log(`Found ${stories.length} stories in Backlog`);
    
    // Find and report duplicates
    const duplicates = findDuplicates(stories);
    if (duplicates.length > 0) {
      console.log(`\nFound ${duplicates.length} duplicate story sets:`);
      
      duplicates.forEach(dup => {
        console.log(`\n${dup.id} appears ${dup.stories.length} times:`);
        dup.stories.forEach(story => {
          console.log(`  - ID: ${story.id}, Created: ${new Date(story.created_at).toLocaleString()}`);
        });
        
        // Recommend keeping the newest story
        const newest = dup.stories.reduce((prev, current) => 
          new Date(prev.created_at) > new Date(current.created_at) ? prev : current
        );
        
        console.log(`\n  Recommended: Keep ID ${newest.id} and delete others.`);
      });
    }
    
    // Sort and display priority order
    const sortedStories = sortStoriesByPriority(stories);
    
    console.log('\n=== RECOMMENDED PRIORITY ORDER ===\n');
    sortedStories.forEach((story, index) => {
      const formattedId = getFormattedId(story.name) || 'UNKNOWN';
      console.log(`${index + 1}. ${formattedId}: ${story.name}`);
    });
    
    console.log('\nTo implement this priority order in Shortcut:');
    console.log('1. Open Shortcut and navigate to the Backlog view');
    console.log('2. Drag and drop stories to match this order');
    console.log('3. Delete duplicate stories as recommended');
  } catch (error) {
    console.error('Error organizing stories:', error);
  }
}

organizeStories();
```

### Standardized Workflow for Story Prioritization

According to the Semantic Seed Venture Studio Coding Standards, stories should be prioritized in this order:

1. **Security Stories** (Highest Priority)
   - Authentication and authorization
   - Data security 
   - Secure headers and API protection

2. **Core Infrastructure** (Foundation Layer)
   - Database models and connections
   - System architecture components
   - Data pipelines and storage

3. **Critical Feature APIs** (Business Value)
   - Core business functionality
   - Integration points with external systems
   - Key reporting capabilities

4. **Supporting Features** (User Experience)
   - Notification systems
   - Communication features
   - Search and discovery functionality

5. **DevOps & Testing** (Infrastructure Support)
   - Testing frameworks
   - CI/CD pipelines
   - Monitoring and logging systems

Run the organize-stories.js script periodically to ensure your backlog maintains this priority order:

```bash
node scripts/organize-stories.js
```

This will generate a recommended priority order and identify any duplicate stories that need to be removed to keep the backlog clean.

## Integrating with Other Projects

These scripts can be easily adapted for other projects by:

1. Forking the repository
2. Setting the SHORTCUT_API_TOKEN in your environment
3. Adjusting the ID patterns (e.g., OCAE-XXX) to match your project naming convention
4. Updating the PRIORITY_ORDER array in organize-stories.js to match your project priorities
5. Modifying the workflow state names if your Shortcut workspace uses different states

Following this approach ensures all projects maintain the same high standards for backlog management and follow the Semantic Seed Venture Studio Coding Standards.
