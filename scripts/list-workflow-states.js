/**
 * List Workflow States Script
 * 
 * This script lists all the workflow states available in Shortcut.
 */

const axios = require('axios');
require('dotenv').config();

const shortcutApiToken = process.env.SHORTCUT_API_TOKEN;
if (!shortcutApiToken) {
  console.error('❌ SHORTCUT_API_TOKEN environment variable is not set');
  process.exit(1);
}

const shortcutApiUrl = 'https://api.app.shortcut.com/api/v3';

/**
 * Get all workflows from Shortcut
 * @returns {Promise<Array>} Array of workflow objects
 */
async function getWorkflows() {
  try {
    const response = await axios.get(`${shortcutApiUrl}/workflows`, {
      headers: { 'Shortcut-Token': shortcutApiToken }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching workflows:', error.message);
    throw error;
  }
}

async function listWorkflowStates() {
  try {
    console.log('Fetching workflow states from Shortcut...');
    
    // Get workflows
    const workflows = await getWorkflows();
    
    // Display all workflows and their states
    workflows.forEach((workflow, index) => {
      console.log(`\nWorkflow ${index + 1}: ${workflow.name}`);
      console.log('-------------------------------------------');
      
      workflow.states.forEach(state => {
        console.log(`- ID: ${state.id}, Name: "${state.name}"`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error fetching workflow states:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

listWorkflowStates();
