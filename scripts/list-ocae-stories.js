/**
 * List OCAE stories in the Shortcut backlog with their status
 * Following Semantic Seed Venture Studio Coding Standards
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;

async function listOcaeStories() {
  try {
    console.log('Fetching OCAE stories from Shortcut...\n');
    
    // First get all stories - the Shortcut API doesn't support direct text search in v3
    const response = await axios.get(
      'https://api.app.shortcut.com/api/v3/stories',
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    const allStories = response.data || [];
    
    // Filter for OCAE stories only
    const stories = allStories.filter(story => 
      story.name && story.name.includes('OCAE')
    );
    
    if (!stories || stories.length === 0) {
      console.log('No OCAE stories found');
      return;
    }
    
    // Group stories by workflow state
    const storiesByState = {};
    let totalCompleted = 0;
    let totalIncomplete = 0;
    
    stories.forEach(story => {
      if (!storiesByState[story.workflow_state_name]) {
        storiesByState[story.workflow_state_name] = [];
      }
      storiesByState[story.workflow_state_name].push(story);
      
      // Count completed vs incomplete stories
      if (story.workflow_state_name === 'Done' || story.workflow_state_name === 'Completed') {
        totalCompleted++;
      } else {
        totalIncomplete++;
      }
    });
    
    console.log(`Found ${stories.length} OCAE stories:\n`);
    console.log(`Completed: ${totalCompleted}`);
    console.log(`Remaining: ${totalIncomplete}\n`);
    
    console.log('=== Stories by State ===');
    Object.keys(storiesByState).sort().forEach(state => {
      console.log(`\n${state} (${storiesByState[state].length} stories):`);
      console.log('| ID | Formatted ID | Name | Type |');
      console.log('|----|-------------|------|------|');
      
      storiesByState[state].forEach(story => {
        const match = story.name.match(/\[(Feature|Bug|Chore)\] (OCAE)-(\d+)/);
        const storyType = match ? match[1] : 'Unknown';
        const formattedId = match ? match[2] + '-' + match[3] : 'N/A';
        
        // Truncate long names
        const name = story.name.length > 40 ? story.name.substring(0, 40) + '...' : story.name;
        
        console.log(`| ${story.id} | ${formattedId} | ${name} | ${storyType} |`);
      });
    });
    
    console.log('\n=== Summary ===');
    console.log(`Total OCAE Stories: ${stories.length}`);
    console.log(`Progress: ${Math.round((totalCompleted / stories.length) * 100)}% Complete`);
    
  } catch (error) {
    console.error('Error listing OCAE stories:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

listOcaeStories();
