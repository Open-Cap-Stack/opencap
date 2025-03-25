/**
 * Move Story to To Do State Script
 * 
 * This script moves a story from Backlog to To Do state in Shortcut,
 * making it ready to be started according to Semantic Seed workflow.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function moveStoryToToDo(storyId) {
  try {
    console.log(`Moving story ${storyId} to To Do state...`);
    
    // 1. Get workflows to find the correct state ID
    const workflows = await shortcut.getWorkflows();
    const primaryWorkflow = workflows[0]; // Using the first workflow
    
    // 2. Find the "To Do" state
    const todoState = primaryWorkflow.states.find(state => 
      state.name === 'To Do'
    );
    
    if (!todoState) {
      throw new Error('Could not find "To Do" state in workflow');
    }
    
    console.log(`Found "To Do" state (ID: ${todoState.id})`);
    
    // 3. Update the story status
    const updatedStory = await shortcut.updateStoryWorkflowState(storyId, todoState.id);
    
    // 4. Extract the formatted ID for display purposes
    const formattedIdMatch = updatedStory.name.match(/OC[A-Z]+-\d+/);
    const formattedId = formattedIdMatch ? formattedIdMatch[0] : 'N/A';
    
    console.log(`✅ Successfully moved story ${storyId} (${formattedId}) to "To Do" state.`);
    console.log(`Run 'node scripts/get-next-story.js' to see it as the next story to work on.`);
    
    return updatedStory;
    
  } catch (error) {
    console.error('❌ Error moving story to To Do state:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Get story ID from command line arguments
const storyId = process.argv[2];

if (!storyId) {
  console.error('Usage: node move-story-to-todo.js [STORY_ID]');
  console.error('Example: node move-story-to-todo.js 79');
  console.error('\nTo find a story ID:');
  console.error('1. Run: node scripts/list-all-stories.js');
  console.error('2. Look for the Numeric ID of a story in the Backlog state');
  process.exit(1);
}

// Run the function
moveStoryToToDo(storyId);
