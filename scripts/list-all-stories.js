/**
 * List All Stories Script
 * 
 * [Bug] OCAE-304: Fix SPVasset tests with JWT authentication
 * 
 * This script lists all stories in Shortcut.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function listAllStories() {
  try {
    console.log('Fetching all stories from Shortcut...');
    
    // First, get workflows to map state IDs to names
    const workflows = await shortcut.getWorkflows();
    const workflowStates = {};
    
    // Create a map of state IDs to state names
    workflows.forEach(workflow => {
      workflow.states.forEach(state => {
        workflowStates[state.id] = {
          name: state.name,
          type: state.type
        };
      });
    });
    
    // Get stories - update to use search with empty criteria to get all stories
    const stories = await shortcut.getStories({ 
      archived: false
    });
    
    if (!stories || stories.length === 0) {
      console.log('No stories found in Shortcut.');
      return [];
    }
    
    console.log(`\nFound ${stories.length} stories:\n`);
    
    // Display stories in a formatted table
    console.log('| Numeric ID | Formatted ID | Name | State |');
    console.log('|------------|--------------|------|-------|');
    
    // Sort stories by workflow state type and then by position
    const sortedStories = [...stories].sort((a, b) => {
      // Get the state types (backlog, unstarted, started, done)
      const stateA = workflowStates[a.workflow_state_id] || { type: 'unknown' };
      const stateB = workflowStates[b.workflow_state_id] || { type: 'unknown' };
      
      // Sort by state type order: unstarted, started, done, backlog
      const stateOrder = { 'unstarted': 0, 'started': 1, 'done': 2, 'backlog': 3, 'unknown': 4 };
      
      // First sort by state type
      if (stateOrder[stateA.type] !== stateOrder[stateB.type]) {
        return stateOrder[stateA.type] - stateOrder[stateB.type];
      }
      
      // For stories with the same state type, sort by position
      return a.position - b.position;
    });
    
    sortedStories.forEach(story => {
      try {
        // Extract the formatted ID (OCAE-XXX) from the name using regex
        const storyName = story.name || 'Unnamed Story';
        const formattedIdMatch = storyName.match(/OC[A-Z]+-\d+/);
        const formattedId = formattedIdMatch ? formattedIdMatch[0] : 'N/A';
        
        // Truncate name if too long
        const name = storyName.length > 50 
          ? storyName.substring(0, 47) + '...' 
          : storyName;
        
        // Get state name from our map
        const state = workflowStates[story.workflow_state_id];
        const stateName = state ? state.name : 'Unknown State';
        
        console.log(`| ${story.id} | ${formattedId} | ${name} | ${stateName} |`);
      } catch (err) {
        console.log(`| ${story.id || 'Unknown ID'} | Error parsing story data | ${err.message} |`);
      }
    });
    
    return sortedStories;
    
  } catch (error) {
    console.error('❌ Error fetching stories:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the function
listAllStories();
