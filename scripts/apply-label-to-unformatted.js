/**
 * OCAE-210: Apply "legacy-unformatted" label to unformatted stories
 * This follows Semantic Seed standards by clearly identifying non-compliant items
 */
const axios = require('axios');
require('dotenv').config();

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const LEGACY_LABEL_ID = 108; // ID of the "legacy-unformatted" label

// IDs of unformatted stories to label
const storyIdsToLabel = [
  20, 21, 23, 24, 26, 27, 29, 31, 32, 34, 36, 
  38, 39, 41, 42, 44, 46, 48, 50, 52, 54, 56, 57
];

async function applyLabelToStory(storyId) {
  try {
    console.log(`Getting current labels for story ${storyId}...`);
    
    // First get the current story to see its existing labels
    const storyResponse = await axios.get(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    const currentLabels = storyResponse.data.labels || [];
    const currentLabelIds = currentLabels.map(label => label.id);
    
    // Add our new label ID if it's not already there
    if (!currentLabelIds.includes(LEGACY_LABEL_ID)) {
      currentLabelIds.push(LEGACY_LABEL_ID);
    }
    
    console.log(`Applying "legacy-unformatted" label to story ${storyId}...`);
    
    // Update the story with the new label
    await axios.put(
      `https://api.app.shortcut.com/api/v3/stories/${storyId}`,
      {
        label_ids: currentLabelIds
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Shortcut-Token': SHORTCUT_API_TOKEN
        }
      }
    );
    
    console.log(`✅ Successfully applied label to story ${storyId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error labeling story ${storyId}:`, error.message);
    return false;
  }
}

async function applyLabelToAllStories() {
  console.log(`Applying "legacy-unformatted" label to ${storyIdsToLabel.length} stories...`);
  let successCount = 0;
  
  // Process stories sequentially to avoid rate limiting
  for (const storyId of storyIdsToLabel) {
    const success = await applyLabelToStory(storyId);
    if (success) successCount++;
    // Small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log(`\nCompleted: ${successCount}/${storyIdsToLabel.length} stories successfully labeled`);
}

applyLabelToAllStories().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
