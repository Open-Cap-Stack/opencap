/**
 * OCAE-210: Temporary script to move unformatted stories from To Do to Backlog
 * This follows Semantic Seed standards requiring proper story ID formatting
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const BACKLOG_STATE_ID = 500000006; // ID for "Backlog" state

// IDs of stories to move from To Do to Backlog
const storyIdsToMove = [
  21, 23, 24, 26, 27, 29, 31, 32, 34, 36, 
  38, 39, 41, 42, 44, 46, 48, 50, 52, 54, 56, 57
];

async function moveStoryToBacklog(storyId) {
  try {
    console.log(`Moving story ${storyId} to Backlog...`);
    await axios.put(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        workflow_state_id: BACKLOG_STATE_ID
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    console.log(`✅ Successfully moved story ${storyId} to Backlog`);
    return true;
  } catch (error) {
    console.error(`❌ Error moving story ${storyId}:`, error.message);
    return false;
  }
}

async function moveAllStories() {
  console.log(`Moving ${storyIdsToMove.length} stories to Backlog...`);
  let successCount = 0;
  
  // Process stories sequentially to avoid rate limiting
  for (const storyId of storyIdsToMove) {
    const success = await moveStoryToBacklog(storyId);
    if (success) successCount++;
    // Small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\nCompleted: ${successCount}/${storyIdsToMove.length} stories successfully moved to Backlog`);
}

moveAllStories().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
