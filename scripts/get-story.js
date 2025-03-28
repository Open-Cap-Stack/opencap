/**
 * Script to get details of a specific story from Shortcut
 * Following Semantic Seed Venture Studio Coding Standards
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;

async function getStory(storyId) {
  try {
    console.log(`Fetching details for story ${storyId}...`);
    
    const response = await axios.get(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    const story = response.data;
    
    console.log('\nSTORY DETAILS:');
    console.log('=============');
    console.log(`ID: ${story.id}`);
    console.log(`Name: ${story.name}`);
    console.log(`Type: ${story.story_type}`);
    console.log(`Status: ${story.workflow_state_name}`);
    console.log(`Description: ${story.description}`);
    console.log(`Created: ${new Date(story.created_at).toLocaleString()}`);
    console.log(`Updated: ${new Date(story.updated_at).toLocaleString()}`);
    
    if (story.tasks && story.tasks.length > 0) {
      console.log('\nTASKS:');
      story.tasks.forEach(task => {
        console.log(`- [${task.complete ? 'x' : ' '}] ${task.description}`);
      });
    }
    
    if (story.branches && story.branches.length > 0) {
      console.log('\nLINKED BRANCHES:');
      story.branches.forEach(branch => {
        console.log(`- ${branch.name}`);
      });
    }
    
    return story;
  } catch (error) {
    console.error(`❌ Error fetching story ${storyId}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Get story ID from command line arguments
const storyId = process.argv[2];

if (!storyId) {
  console.error('Please provide a story ID as a command line argument');
  process.exit(1);
}

getStory(storyId).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
