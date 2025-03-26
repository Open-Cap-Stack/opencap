/**
 * Search Stories Script
 * 
 * [Bug] OCAE-304: Fix SPVasset tests with JWT authentication
 * 
 * This script searches for stories in Shortcut by name or ID.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function searchStories(query) {
  try {
    console.log(`Searching for stories matching: "${query}"...`);
    
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
    
    // Get all stories (no filters)
    const stories = await shortcut.getStories({
      archived: false
    });
    
    if (!stories || stories.length === 0) {
      console.log('No stories found in Shortcut.');
      return [];
    }
    
    // Filter stories that match the query
    const matchingStories = stories.filter(story => {
      // Extract the formatted ID (OCAE-XXX) from the name using regex
      const formattedIdMatch = story.name.match(/OC[A-Z]+-\d+/);
      const formattedId = formattedIdMatch ? formattedIdMatch[0] : '';
      
      return story.name.toLowerCase().includes(query.toLowerCase()) || 
             story.id.toString() === query ||
             (formattedId && formattedId.toLowerCase() === query.toLowerCase());
    });
    
    if (matchingStories.length === 0) {
      console.log(`No stories found matching "${query}".`);
      return [];
    }
    
    console.log(`\nFound ${matchingStories.length} matching stories:\n`);
    
    // Display stories in a formatted table
    console.log('| Numeric ID | Formatted ID | Name | State | Type |');
    console.log('|------------|--------------|------|-------|------|');
    
    matchingStories.forEach(story => {
      // Extract the formatted ID (OCAE-XXX) from the name using regex
      const formattedIdMatch = story.name.match(/OC[A-Z]+-\d+/);
      const formattedId = formattedIdMatch ? formattedIdMatch[0] : 'N/A';
      
      // Truncate name if too long
      const name = story.name.length > 40 
        ? story.name.substring(0, 37) + '...' 
        : story.name;
      
      // Get state name from our map
      const state = workflowStates[story.workflow_state_id];
      const stateName = state ? state.name : 'Unknown State';
      
      // Get story type
      const storyType = story.story_type || 'unknown';
      
      console.log(`| ${story.id} | ${formattedId} | ${name} | ${stateName} | ${storyType} |`);
    });
    
    return matchingStories;
    
  } catch (error) {
    console.error('❌ Error searching for stories:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Get search query from command line
const searchQuery = process.argv[2];

if (!searchQuery) {
  console.error('Please provide a search query.');
  console.error('Usage: node search-stories.js [SEARCH_QUERY]');
  console.error('Examples:');
  console.error('  node search-stories.js OCAE-301');
  console.error('  node search-stories.js "User Authentication"');
  console.error('  node search-stories.js 73');
  process.exit(1);
}

// Run the search
searchStories(searchQuery);
