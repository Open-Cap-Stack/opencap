/**
 * Update Story Status Script
 * 
 * [Chore] OCDI-103: Integrate Shortcut API for Transaction data model
 * 
 * This script updates the status of a story in Shortcut.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

/**
 * Get all workflows from Shortcut
 * @returns {Promise<Array>} Array of workflow objects
 * @deprecated Use shortcut.getWorkflows() instead
 */
async function getWorkflowsLegacy() {
  try {
    const shortcutApiToken = process.env.SHORTCUT_API_TOKEN;
    if (!shortcutApiToken) {
      console.error('❌ SHORTCUT_API_TOKEN environment variable is not set');
      process.exit(1);
    }
    
    const axios = require('axios');
    const shortcutApiUrl = 'https://api.app.shortcut.com/api/v3';
    
    const response = await axios.get(`${shortcutApiUrl}/workflows`, {
      headers: { 'Shortcut-Token': shortcutApiToken }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching workflows:', error.message);
    throw error;
  }
}

/**
 * Update story workflow state
 * @param {number} storyId - Story ID
 * @param {number} workflowStateId - Workflow state ID
 * @returns {Promise<Object>} Updated story object
 * @deprecated Use shortcut.updateStoryWorkflowState() instead
 */
async function updateStoryWorkflowStateLegacy(storyId, workflowStateId) {
  try {
    const shortcutApiToken = process.env.SHORTCUT_API_TOKEN;
    if (!shortcutApiToken) {
      console.error('❌ SHORTCUT_API_TOKEN environment variable is not set');
      process.exit(1);
    }
    
    const axios = require('axios');
    const shortcutApiUrl = 'https://api.app.shortcut.com/api/v3';
    
    const response = await axios.put(
      `${shortcutApiUrl}/stories/${storyId}`,
      { workflow_state_id: workflowStateId },
      { headers: { 'Shortcut-Token': shortcutApiToken } }
    );
    console.log(`Story ${storyId} updated to workflow state ${workflowStateId}`);
    return response.data;
  } catch (error) {
    console.error(`Error updating story ${storyId}:`, error.message);
    throw error;
  }
}

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
