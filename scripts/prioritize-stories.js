/**
 * OCAE-210: Script to prioritize stories in Shortcut
 * Following Semantic Seed Venture Studio Coding Standards
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;

// First, let's define the priorities
const PRIORITY_ORDER = [
  // OCAE Series - API Enhancement (in order of importance)
  'OCAE-302', // Role-based access control (security first)
  'OCAE-304', // Secure header configuration
  'OCAE-305', // API rate limiting  
  'OCAE-605', // Webhooks for key entity events
  'OCAE-603', // Integration Module API
  'OCAE-602', // Notification API
  'OCAE-600', // Communication API
  'OCAE-601', // Invite Management API
  'OCAE-604', // Unified search API
  'OCAE-401', // Financial report generation endpoints
  'OCAE-402', // Financial metrics calculation
  'OCAE-501', // Jest testing framework
  'OCAE-502', // ESLint configuration
  'OCAE-306', // Security audit logging
  'OCAE-503', // CI/CD pipeline
  'OCAE-504', // End-to-end test suite
  
  // OCDI Series - Data Infrastructure (in order of importance)
  'OCDI-300', // Data models for Neo4j
  'OCDI-301', // Node.js connector for Neo4j
  'OCDI-302', // Neo4j schema design
  'OCDI-303', // Airflow pipeline with MinIO
  'OCDI-201', // Financial data import/export
  'OCDI-202', // Financial reporting models
];

// Function to get all stories
async function getAllStories() {
  try {
    console.log('Fetching all stories from Shortcut...');
    
    // First get the workflow states
    const workflowResponse = await axios.get(
      'https://api.app.shortcut.com/api/v3/workflows',
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    const workflows = workflowResponse.data;
    if (!workflows || workflows.length === 0) {
      console.error('No workflows found');
      return [];
    }
    
    // Find the "Backlog" state ID
    let backlogStateId = null;
    for (const workflow of workflows) {
      for (const state of workflow.states) {
        if (state.name === 'Backlog') {
          backlogStateId = state.id;
          break;
        }
      }
      if (backlogStateId) break;
    }
    
    if (!backlogStateId) {
      console.error('Could not find "Backlog" state');
      return [];
    }
    
    // Get stories in the "Backlog" state
    const searchResponse = await axios.get(
      `https://api.app.shortcut.com/api/v3/stories?workflow_state_id=${backlogStateId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    return searchResponse.data;
  } catch (error) {
    console.error('Error fetching stories:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return [];
  }
}

// Function to find duplicates
function findDuplicates(stories) {
  const storyIds = {};
  const duplicates = [];
  
  stories.forEach(story => {
    const match = story.name.match(/\[Feature\] (OCAE|OCDI)-(\d+)/);
    if (match) {
      const fullId = match[1] + '-' + match[2];
      if (storyIds[fullId]) {
        duplicates.push({
          fullId,
          storyIds: [...storyIds[fullId], story.id]
        });
      } else {
        storyIds[fullId] = [story.id];
      }
    }
  });
  
  return duplicates.filter(dup => dup.storyIds.length > 1);
}

// Function to delete a story
async function deleteStory(storyId) {
  try {
    console.log(`Deleting duplicate story ${storyId}...`);
    
    await axios.delete(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    console.log(`✅ Successfully deleted story ${storyId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting story ${storyId}:`, error.message);
    return false;
  }
}

// Function to update story position
async function updateStoryPosition(storyId, position) {
  try {
    console.log(`Setting priority for story ${storyId} to position ${position}...`);
    
    await axios.put(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        position
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    console.log(`✅ Successfully updated position for story ${storyId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating story position:`, error.message);
    return false;
  }
}

// Main function to prioritize stories
async function prioritizeStories() {
  try {
    // Get all stories
    const stories = await getAllStories();
    if (!stories || stories.length === 0) {
      console.error('No stories found');
      return;
    }
    
    console.log(`Found ${stories.length} stories in Backlog`);
    
    // Find and handle duplicates
    const duplicates = findDuplicates(stories);
    if (duplicates.length > 0) {
      console.log(`\nFound ${duplicates.length} duplicate story IDs`);
      
      for (const dup of duplicates) {
        console.log(`Handling duplicates for ${dup.fullId}...`);
        // Keep the first story, delete the others
        for (let i = 1; i < dup.storyIds.length; i++) {
          await deleteStory(dup.storyIds[i]);
        }
      }
    } else {
      console.log('No duplicates found');
    }
    
    // Prioritize stories based on the defined order
    console.log('\nPrioritizing stories...');
    
    // Build a map of story IDs to priorities
    const storyPriorities = {};
    let position = 1;
    
    // Assign priority positions to each story based on the PRIORITY_ORDER
    PRIORITY_ORDER.forEach(id => {
      storyPriorities[id] = position++;
    });
    
    // For any stories not in the predefined order, assign a lower priority
    stories.forEach(story => {
      const match = story.name.match(/\[Feature\] (OCAE|OCDI)-(\d+)/);
      if (match) {
        const fullId = match[1] + '-' + match[2];
        if (!storyPriorities[fullId]) {
          storyPriorities[fullId] = position++;
        }
      }
    });
    
    // Update each story's position
    for (const story of stories) {
      const match = story.name.match(/\[Feature\] (OCAE|OCDI)-(\d+)/);
      if (match) {
        const fullId = match[1] + '-' + match[2];
        // Check if this story is a duplicate that should be skipped (after the first one)
        const isDuplicateToSkip = duplicates.some(dup => 
          dup.fullId === fullId && dup.storyIds.indexOf(story.id) > 0
        );
        
        if (!isDuplicateToSkip && storyPriorities[fullId]) {
          await updateStoryPosition(story.id, storyPriorities[fullId]);
        }
      }
    }
    
    console.log('\n✅ Story prioritization completed!');
  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  }
}

// Execute the main function
prioritizeStories().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
