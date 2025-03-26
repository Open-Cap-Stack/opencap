/**
 * Shortcut API Integration Script for OpenCap
 * 
 * This script provides helper functions for interacting with the Shortcut API
 * according to Semantic Seed Venture Studio Coding Standards.
 * 
 * Created for: [Chore] OCAE-302: Integrate Shortcut API for Backlog Management
 */

const axios = require('axios');
require('dotenv').config();

// API Configuration
const API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const API_BASE_URL = 'https://api.app.shortcut.com/api/v3';

// Request headers
const headers = {
  'Content-Type': 'application/json',
  'Shortcut-Token': API_TOKEN
};

/**
 * Create a new epic in Shortcut
 * 
 * @param {Object} epicData - The epic data
 * @param {string} epicData.name - Epic name
 * @param {string} epicData.description - Epic description
 * @returns {Promise} - The created epic
 */
async function createEpic(epicData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/epics`, epicData, { headers });
    console.log(`Epic created: ${response.data.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    console.error('Error creating epic:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a new story in Shortcut
 * 
 * @param {Object} storyData - The story data
 * @param {string} storyData.name - Story name (should follow format "[Type] ID: Name")
 * @param {string} storyData.description - Story description
 * @param {string} storyData.type - Story type (feature, bug, chore)
 * @param {number} storyData.workflowStateId - Workflow state ID
 * @param {number} [storyData.epicId] - Epic ID (optional)
 * @returns {Promise} - The created story
 */
async function createStory(storyData) {
  // Validate story name format
  if (!storyData.name.match(/^\[(Feature|Bug|Chore)\] OC(DI|AE)-\d+:/)) {
    console.warn('Warning: Story name does not follow format "[Type] ID: Name"');
  }
  
  const payload = {
    name: storyData.name,
    description: storyData.description,
    story_type: storyData.type,
    workflow_state_id: storyData.workflowStateId
  };
  
  if (storyData.epicId) {
    payload.epic_id = storyData.epicId;
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/stories`, payload, { headers });
    console.log(`Story created: ${response.data.name} (ID: ${response.data.id})`);
    return response.data;
  } catch (error) {
    console.error('Error creating story:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update a story's workflow state
 * 
 * @param {number} storyId - The story ID
 * @param {number} workflowStateId - The workflow state ID
 * @returns {Promise} - The updated story
 */
async function updateStoryWorkflowState(storyId, workflowStateId) {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/stories/${storyId}`,
      { workflow_state_id: workflowStateId },
      { headers }
    );
    console.log(`Story ${storyId} updated to workflow state ${workflowStateId}`);
    return response.data;
  } catch (error) {
    console.error('Error updating story:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all epics
 * 
 * @returns {Promise} - List of epics
 */
async function getEpics() {
  try {
    const response = await axios.get(`${API_BASE_URL}/epics`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error getting epics:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get stories using search
 * 
 * @param {Object} params - Query parameters
 * @returns {Promise} - List of stories
 */
async function getStories(params = {}) {
  try {
    // For stories/search endpoint, remove page_size as it's not supported
    // API documentation: https://developer.shortcut.com/api/rest/v3#Search-Stories
    const searchParams = {
      ...params
    };
    
    // Use the stories/search endpoint with POST instead of GET /stories
    const response = await axios.post(
      `${API_BASE_URL}/stories/search`,
      searchParams,
      { headers }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting stories:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get a single story by ID
 * 
 * @param {number} storyId - The story ID
 * @returns {Promise} - The story data
 */
async function getStory(storyId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/stories/${storyId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error getting story ${storyId}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get workflow states
 * 
 * @returns {Promise} - List of workflow states
 */
async function getWorkflows() {
  try {
    const response = await axios.get(`${API_BASE_URL}/workflows`, { headers });
    return response.data;
  } catch (error) {
    console.error('Error getting workflows:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get unstarted stories (stories in Ready state)
 * 
 * @returns {Promise} - List of unstarted stories
 */
async function getUnstartedStories() {
  try {
    // Get workflows first to find the "To Do" state ID
    const workflows = await getWorkflows();
    const primaryWorkflow = workflows[0];
    const todoState = primaryWorkflow.states.find(state => state.name === 'To Do');
    
    if (!todoState) {
      throw new Error('Could not find "To Do" state in workflows');
    }
    
    // Search for stories in the "To Do" state
    const searchParams = {
      workflow_state_id: todoState.id
    };
    
    const stories = await getStories(searchParams);
    return stories;
  } catch (error) {
    console.error('Error getting unstarted stories:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get the top unstarted story (following Semantic Seed workflow)
 * 
 * @returns {Promise} - The top unstarted story or null if none found
 */
async function getNextStory() {
  try {
    const unstarted = await getUnstartedStories();
    
    if (!unstarted || unstarted.length === 0) {
      console.log('No unstarted stories found in "To Do" state');
      return null;
    }
    
    // Sort by position (if available) or creation date
    const sortedStories = unstarted.sort((a, b) => {
      if (a.position && b.position) {
        return a.position - b.position;
      }
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    // Return the top story
    return sortedStories[0];
  } catch (error) {
    console.error('Error getting next story:', error.message);
    throw error;
  }
}

/**
 * Create a batch of stories under an epic
 * 
 * @param {number} epicId - The epic ID
 * @param {Array} stories - Array of story objects
 * @param {number} workflowStateId - The workflow state ID
 * @returns {Promise} - The created stories
 */
async function createStoriesBatch(epicId, stories, workflowStateId) {
  const createdStories = [];
  
  for (const story of stories) {
    // Ensure story name follows Semantic Seed standards
    if (!story.name.startsWith('[')) {
      story.name = `[${story.type.charAt(0).toUpperCase() + story.type.slice(1)}] ${story.name}`;
    }
    
    try {
      const storyData = {
        name: story.name,
        description: story.description,
        type: story.type,
        epicId,
        workflowStateId
      };
      
      const createdStory = await createStory(storyData);
      createdStories.push(createdStory);
    } catch (error) {
      console.error(`Failed to create story: ${story.name}`);
    }
  }
  
  return createdStories;
}

// Example usage
async function example() {
  try {
    // First get workflows to find the right state IDs
    const workflows = await getWorkflows();
    console.log('Available workflows:', workflows.map(w => ({ id: w.id, name: w.name })));
    
    // Create an epic
    const epic = await createEpic({
      name: 'Data Infrastructure',
      description: 'Core data infrastructure components for OpenCap'
    });
    
    // Create stories under that epic
    const stories = [
      {
        name: '[Feature] OCDI-001: Create Neo4j data connector',
        description: 'Implement a connector for Neo4j graph database',
        type: 'feature'
      },
      {
        name: '[Chore] OCDI-002: Setup database schema validation',
        description: 'Set up schema validation for all database models',
        type: 'chore'
      }
    ];
    
    // Find the "Ready" workflow state
    const workflowStateId = workflows[0].states.find(s => s.name === 'Ready').id;
    
    // Create the stories
    await createStoriesBatch(epic.id, stories, workflowStateId);
    
    console.log('Created epic and stories successfully!');
  } catch (error) {
    console.error('Example failed:', error.message);
  }
}

module.exports = {
  createEpic,
  createStory,
  updateStoryWorkflowState,
  getEpics,
  getStories,
  getStory,
  getWorkflows,
  getUnstartedStories,
  getNextStory,
  createStoriesBatch,
  example
};
