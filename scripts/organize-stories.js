/**
 * OCAE-210: Script to organize stories by priority and remove duplicates
 * Following Semantic Seed Venture Studio Coding Standards
 */
const shortcutApi = require('./shortcut-api');
require('dotenv').config();

// Define priority order according to Semantic Seed standards
// Higher in the list = higher priority
const PRIORITY_ORDER = [
  // Security stories first (security is always highest priority)
  'OCAE-302', // Role-based access control
  'OCAE-304', // Secure header configuration
  'OCAE-305', // API rate limiting
  'OCAE-306', // Security audit logging
  
  // Core infrastructure next
  'OCDI-201', // Financial data import/export
  'OCDI-202', // Financial reporting models
  'OCDI-300', // Data models for Neo4j
  'OCDI-301', // Node.js connector for Neo4j
  'OCDI-302', // Neo4j schema design
  
  // Critical API features
  'OCAE-204', // Company management API
  'OCAE-605', // Webhooks for key entity events
  'OCAE-603', // Integration Module API
  'OCAE-602', // Notification API
  
  // Financial capabilities
  'OCAE-401', // Financial report generation endpoints
  'OCAE-402', // Financial metrics calculation
  
  // Other APIs in order of business impact
  'OCAE-600', // Communication API
  'OCAE-601', // Invite Management API
  'OCAE-604', // Unified search API
  'OCDI-303', // Airflow pipeline with MinIO
  
  // DevOps and testing infrastructure last
  'OCAE-501', // Jest testing framework
  'OCAE-502', // ESLint configuration
  'OCAE-503', // CI/CD pipeline
  'OCAE-504', // End-to-end test suite
];

/**
 * Get formatted ID from story name
 * @param {string} name - Story name
 * @returns {string|null} - Formatted ID (e.g., OCAE-302) or null if not found
 */
function getFormattedId(name) {
  const match = name.match(/\[(Feature|Bug|Chore)\] (OCAE|OCDI)-(\d+)/);
  return match ? match[2] + '-' + match[3] : null;
}

/**
 * Sort stories by priority
 * @param {Array} stories - Array of story objects
 * @returns {Array} - Sorted array of stories
 */
function sortStoriesByPriority(stories) {
  return stories.sort((a, b) => {
    const idA = getFormattedId(a.name);
    const idB = getFormattedId(b.name);
    
    // If both stories have formatted IDs in our priority list
    if (idA && idB) {
      const priorityA = PRIORITY_ORDER.indexOf(idA);
      const priorityB = PRIORITY_ORDER.indexOf(idB);
      
      // If both are in priority list, sort by priority
      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB;
      }
      
      // If only one is in priority list, it comes first
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;
    }
    
    // Default to story ID sorting
    return a.id - b.id;
  });
}

/**
 * Find duplicate stories
 * @param {Array} stories - Array of story objects
 * @returns {Array} - Array of duplicate story groups
 */
function findDuplicates(stories) {
  const storyMap = {};
  const duplicates = [];
  
  stories.forEach(story => {
    const formattedId = getFormattedId(story.name);
    if (formattedId) {
      if (!storyMap[formattedId]) {
        storyMap[formattedId] = [];
      }
      storyMap[formattedId].push(story);
    }
  });
  
  // Find entries with more than one story
  Object.entries(storyMap).forEach(([id, storyList]) => {
    if (storyList.length > 1) {
      duplicates.push({
        id,
        stories: storyList
      });
    }
  });
  
  return duplicates;
}

/**
 * Display story priority order for manual review
 * @param {Array} stories - Array of sorted story objects
 */
function displayPriorityOrder(stories) {
  console.log('\n=== STORY PRIORITY ORDER (HIGHEST TO LOWEST) ===\n');
  
  stories.forEach((story, index) => {
    const formattedId = getFormattedId(story.name) || 'UNKNOWN';
    console.log(`${index + 1}. ${formattedId}: ${story.name}`);
  });
  
  console.log('\nTo implement this priority order in Shortcut:');
  console.log('1. Open the Shortcut board at https://app.shortcut.com/');
  console.log('2. Go to the "Backlog" view');
  console.log('3. Drag and drop the stories to match this order');
}

/**
 * Main function to organize stories
 */
async function organizeStories() {
  try {
    console.log('Getting workflows...');
    const workflows = await shortcutApi.getWorkflows();
    
    if (!workflows || workflows.length === 0) {
      console.error('No workflows found');
      return;
    }
    
    // Find the "Backlog" state
    let backlogStateId = null;
    for (const workflow of workflows) {
      const backlogState = workflow.states.find(s => s.name === 'Backlog');
      if (backlogState) {
        backlogStateId = backlogState.id;
        break;
      }
    }
    
    if (!backlogStateId) {
      console.error('Could not find "Backlog" state');
      return;
    }
    
    console.log('Getting stories in Backlog...');
    const stories = await shortcutApi.getStories({
      workflow_state_id: backlogStateId
    });
    
    if (!stories || stories.length === 0) {
      console.error('No stories found in Backlog');
      return;
    }
    
    console.log(`Found ${stories.length} stories in Backlog`);
    
    // Find duplicates
    const duplicates = findDuplicates(stories);
    if (duplicates.length > 0) {
      console.log(`\nFound ${duplicates.length} duplicate story sets:`);
      
      duplicates.forEach(dup => {
        console.log(`\n${dup.id} appears ${dup.stories.length} times:`);
        dup.stories.forEach(story => {
          console.log(`  - ID: ${story.id}, Created: ${new Date(story.created_at).toLocaleString()}`);
        });
        
        // Get the newest story
        const newest = dup.stories.reduce((prev, current) => 
          new Date(prev.created_at) > new Date(current.created_at) ? prev : current
        );
        
        console.log(`\n  Recommended action: Keep the newest story (ID: ${newest.id}) and manually delete the others.`);
      });
    } else {
      console.log('No duplicates found.');
    }
    
    // Sort stories by priority
    const sortedStories = sortStoriesByPriority(stories);
    
    // Display priority order for manual implementation
    displayPriorityOrder(sortedStories);
    
    console.log('\n✅ Story organization recommendations generated successfully!');
    
  } catch (error) {
    console.error('Error organizing stories:', error);
    process.exit(1);
  }
}

// Execute the main function
organizeStories().catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});
