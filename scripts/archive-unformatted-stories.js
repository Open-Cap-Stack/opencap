/**
 * OCAE-210: Archive unformatted stories to keep the OpenCap backlog clean
 * This follows Semantic Seed standards requiring proper story ID formatting
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;

// IDs of unformatted stories to archive
const storyIdsToArchive = [
  20, 21, 23, 24, 26, 27, 29, 31, 32, 34, 36, 
  38, 39, 41, 42, 44, 46, 48, 50, 52, 54, 56, 57
];

async function archiveStory(storyId) {
  try {
    console.log(`Archiving story ${storyId}...`);
    
    await axios.put(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        archived: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    console.log(`✅ Successfully archived story ${storyId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error archiving story ${storyId}:`, error.message);
    return false;
  }
}

async function archiveAllStories() {
  console.log(`Archiving ${storyIdsToArchive.length} unformatted stories...`);
  let successCount = 0;
  
  // Process stories sequentially to avoid rate limiting
  for (const storyId of storyIdsToArchive) {
    const success = await archiveStory(storyId);
    if (success) successCount++;
    // Small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\nCompleted: ${successCount}/${storyIdsToArchive.length} stories successfully archived`);
}

archiveAllStories().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
