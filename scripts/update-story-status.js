/**
 * Update Story Status Script
 * 
 * [Chore] OCAE-302: Integrate Shortcut API for Backlog Management
 * 
 * This script updates the status of a story in Shortcut.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function updateStoryStatus(storyId, newStatusName) {
  try {
    console.log(`Updating story ${storyId} status to "${newStatusName}"...`);
    
    // 1. Get workflows to find the correct state ID
    const workflows = await shortcut.getWorkflows();
    const primaryWorkflow = workflows[0]; // Using the first workflow
    
    // 2. Find the state with the matching name
    const targetState = primaryWorkflow.states.find(state => 
      state.name.toLowerCase() === newStatusName.toLowerCase()
    );
    
    if (!targetState) {
      throw new Error(`Could not find state "${newStatusName}" in workflow`);
    }
    
    console.log(`Found state "${targetState.name}" (ID: ${targetState.id})`);
    
    // 3. Update the story status
    const updatedStory = await shortcut.updateStoryWorkflowState(storyId, targetState.id);
    
    console.log(`✅ Successfully updated story ${storyId} to status "${targetState.name}"`);
    return updatedStory;
    
  } catch (error) {
    console.error('❌ Error updating story status:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Get story ID and status from command line arguments
const storyId = process.argv[2];
const newStatus = process.argv[3];

if (!storyId || !newStatus) {
  console.error('Usage: node update-story-status.js [STORY_ID] [NEW_STATUS]');
  console.error('Example: node update-story-status.js 123 "Finished"');
  process.exit(1);
}

updateStoryStatus(storyId, newStatus);
