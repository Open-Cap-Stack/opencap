/**
 * List Shortcut Workflow States
 * 
 * [Chore] OCAE-302: Integrate Shortcut API for Backlog Management
 * 
 * This script lists all available workflow states in Shortcut.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function listWorkflowStates() {
  try {
    console.log('Fetching Shortcut workflows and states...');
    
    // Get all workflows
    const workflows = await shortcut.getWorkflows();
    
    if (!workflows || workflows.length === 0) {
      console.log('No workflows found in your Shortcut workspace.');
      return;
    }
    
    console.log(`\nFound ${workflows.length} workflow(s):`);
    
    // Display all workflows and their states
    workflows.forEach(workflow => {
      console.log(`\n🔷 Workflow: ${workflow.name} (ID: ${workflow.id})`);
      
      if (!workflow.states || workflow.states.length === 0) {
        console.log('  No states found in this workflow.');
        return;
      }
      
      console.log('  Available states:');
      workflow.states.forEach(state => {
        console.log(`  - "${state.name}" (ID: ${state.id}, Type: ${state.type})`);
      });
    });
    
    console.log('\n✅ To update a story status, use a state name from the list above.');
    console.log('Example: node scripts/update-story-status.js 65 "Done"');
    
  } catch (error) {
    console.error('❌ Error fetching workflow states:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the function
listWorkflowStates();
