/**
 * Get Next Story Script
 * 
 * This script follows Semantic Seed workflow to find the top unstarted story
 * in the "To Do" state and display its details for starting work.
 */

const shortcut = require('./shortcut-api');
require('dotenv').config();

async function getNextStory() {
  try {
    console.log('🔍 Finding next story to work on...');
    
    // First, get workflows to map state IDs to names and find "To Do" state
    const workflows = await shortcut.getWorkflows();
    const primaryWorkflow = workflows[0];
    const todoState = primaryWorkflow.states.find(state => state.name === 'To Do');
    
    if (!todoState) {
      console.error('❌ Could not find "To Do" state in workflows');
      return;
    }
    
    // Get all stories in "To Do" state
    const stories = await shortcut.getStories({ 
      workflow_state_id: todoState.id
    });
    
    if (!stories || stories.length === 0) {
      console.log('No unstarted stories found in "To Do" state. All stories are either in progress or completed!');
      return;
    }
    
    // First filter for stories following OpenCap format (OCAE-XXX, OCDI-XXX)
    const formattedStories = stories.filter(story => {
      const match = story.name.match(/OC[A-Z]+-\d+/);
      return match !== null;
    });
    
    let nextStory;
    
    // If there are formatted stories, use those first (following OpenCap standards)
    if (formattedStories.length > 0) {
      // Sort by position to get the top priority story
      const sortedFormattedStories = [...formattedStories].sort((a, b) => a.position - b.position);
      nextStory = sortedFormattedStories[0];
      console.log('📝 Found properly formatted OpenCap story to work on.');
    } else {
      // Otherwise, fall back to any "To Do" story
      const sortedStories = [...stories].sort((a, b) => a.position - b.position);
      nextStory = sortedStories[0];
      console.log('⚠️ Warning: No properly formatted OpenCap stories (OCAE-XXX, OCDI-XXX) found in "To Do" state.');
      console.log('⚠️ Defaulting to first available story. Consider moving a properly formatted story to "To Do" state.');
      console.log('⚠️ Example: node scripts/move-story-to-todo.js [STORY_ID]');
    }
    
    // Extract the formatted ID (OCAE-XXX) from the name using regex
    const formattedIdMatch = nextStory.name.match(/OC[A-Z]+-\d+/);
    const formattedId = formattedIdMatch ? formattedIdMatch[0] : 'N/A';
    
    // Get story type (feature, bug, chore) to use in branch name
    const storyType = nextStory.story_type || 'feature';
    
    // Display story details in a clean format
    console.log('\n🔷 NEXT STORY TO WORK ON:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Name: ${nextStory.name}`);
    console.log(`🔢 Shortcut ID: ${nextStory.id} (API ID for status updates)`);
    console.log(`🏷️ Formatted ID: ${formattedId} (For branches and commits)`);
    console.log(`📊 Type: ${storyType}`);
    console.log(`📑 Description:`);
    console.log('┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈');
    console.log(nextStory.description || 'No description provided');
    console.log('┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈');
    
    // Find in-progress state for updating status
    const inProgressState = primaryWorkflow.states.find(state => state.name === 'In Progress');
    const inProgressStateId = inProgressState ? inProgressState.id : null;
    
    // Provide next steps guidance based on OpenCap workflow
    console.log('\n📝 NEXT STEPS:');
    
    if (formattedId === 'N/A') {
      console.log('⚠️ WARNING: This story does not follow the OpenCap ID format (OCAE-XXX or OCDI-XXX).');
      console.log('⚠️ Following OpenCap workflow is strongly recommended to use properly formatted stories.');
      console.log('⚠️ Consider moving a formatted story to "To Do" using: node scripts/move-story-to-todo.js [STORY_ID]');
      console.log();
    }
    
    console.log(`1. Create branch: git checkout -b ${storyType}/${formattedId}`);
    
    if (inProgressStateId) {
      console.log(`2. Update status: node scripts/update-story-status.js ${nextStory.id} "In Progress"`);
    } else {
      console.log(`2. Update status: node scripts/update-story-status.js ${nextStory.id} [STATE_NAME]`);
    }
    
    console.log(`3. Initial commit: "WIP: ${formattedId}: Red tests for [feature]"`);
    console.log(`4. When tests pass: "WIP: ${formattedId}: Green tests for [feature]"`); 
    console.log(`5. Final commit: "${formattedId}: Implement [feature]"`);
    console.log(`6. When done: node scripts/update-story-status.js ${nextStory.id} "Done"`);
    
  } catch (error) {
    console.error('❌ Error getting next story:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the function
getNextStory();
